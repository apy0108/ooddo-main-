const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const { computeAllPayslips } = require('./payslipComputation.service')
const { sendAllPayslips } = require('./payslipEmail.service')
const dayjs = require('dayjs')

/**
 * List all payruns with filters
 */
async function getAll(filters = {}) {
  const { status, year, search } = filters

  const where = {}
  if (status) where.status = status
  if (year) {
    where.periodStart = {
      gte: new Date(`${year}-01-01`),
      lte: new Date(`${year}-12-31T23:59:59`),
    }
  }
  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  const payruns = await prisma.payrun.findMany({
    where,
    include: {
      salaryStructure: { select: { id: true, name: true, code: true } },
      _count: { select: { payslips: true } },
      payslips: {
        select: {
          id: true,
          warnings: true,
          status: true,
        },
      },
    },
    orderBy: { periodStart: 'desc' },
  })

  // Format to include total warning count per payrun for cards
  return payruns.map((pr) => {
    const totalWarnings = pr.payslips.reduce(
      (sum, p) => sum + (Array.isArray(p.warnings) ? p.warnings.length : 0),
      0
    )
    return {
      ...pr,
      employeeCount: pr._count.payslips,
      warningCount: totalWarnings,
    }
  })
}

/**
 * Get one payrun by ID
 */
async function getOne(id) {
  const payrun = await prisma.payrun.findUnique({
    where: { id },
    include: {
      salaryStructure: true,
      createdBy: { select: { id: true, email: true } },
      payslips: {
        include: {
          employee: {
            include: {
              user: { select: { id: true, email: true } },
              department: { select: { id: true, name: true } },
            },
          },
          lines: { orderBy: { sequence: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!payrun) throw new AppError('Payrun not found', 404)
  return payrun
}

/**
 * Create a new payrun in DRAFT status with initial DRAFT payslips
 */
async function create({ salaryStructureId, name, periodStart, periodEnd, employeeIds, createdById }) {
  if (!name || !name.trim()) throw new AppError('Period name is required', 400)
  if (!salaryStructureId) throw new AppError('Salary structure is required', 400)
  if (!periodStart || !periodEnd) throw new AppError('Period start and end dates are required', 400)

  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  if (start >= end) {
    throw new AppError('Period start date must be before period end date', 400)
  }

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw new AppError('At least one employee must be selected', 400)
  }

  const structure = await prisma.salaryStructure.findUnique({
    where: { id: salaryStructureId },
  })
  if (!structure || !structure.active) {
    throw new AppError('Selected salary structure is invalid or inactive', 400)
  }

  // Ensure unique employees (Rule P2)
  const uniqueEmpIds = [...new Set(employeeIds)]

  return prisma.$transaction(async (tx) => {
    const payrun = await tx.payrun.create({
      data: {
        name: name.trim(),
        salaryStructureId,
        periodStart: start,
        periodEnd: end,
        status: 'DRAFT',
        createdById,
      },
    })

    const payslipsData = uniqueEmpIds.map((empId) => ({
      payrunId: payrun.id,
      employeeId: empId,
      salaryStructureId,
      periodStart: start,
      periodEnd: end,
      status: 'DRAFT',
      warnings: [],
      workedDays: 0,
      totalDays: 0,
      basic: 0,
      gross: 0,
      deductions: 0,
      net: 0,
    }))

    await tx.payslip.createMany({ data: payslipsData })

    return tx.payrun.findUnique({
      where: { id: payrun.id },
      include: {
        payslips: { include: { employee: true } },
        salaryStructure: true,
      },
    })
  })
}

/**
 * Compute all payslips in a payrun
 */
async function compute(payrunId) {
  const payrun = await prisma.payrun.findUnique({ where: { id: payrunId } })
  if (!payrun) throw new AppError('Payrun not found', 404)
  if (payrun.status === 'PAID') throw new AppError('Cannot recompute a PAID payrun', 400)
  if (payrun.status === 'VALIDATED') throw new AppError('Cannot recompute a VALIDATED payrun', 400)

  await computeAllPayslips(payrunId)
  return getOne(payrunId)
}

/**
 * Validate payrun (requires all payslips COMPUTED or DONE)
 */
async function validate(payrunId) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: { payslips: true },
  })
  if (!payrun) throw new AppError('Payrun not found', 404)

  const hasDraft = payrun.payslips.some((p) => p.status === 'DRAFT')
  if (hasDraft) {
    throw new AppError('Compute all payslips before validating', 400)
  }

  await prisma.$transaction([
    prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'VALIDATED' },
    }),
    prisma.payslip.updateMany({
      where: { payrunId },
      data: { status: 'DONE' },
    }),
  ])

  return getOne(payrunId)
}

/**
 * Mark payrun as PAID
 */
async function markPaid(payrunId) {
  const payrun = await prisma.payrun.findUnique({ where: { id: payrunId } })
  if (!payrun) throw new AppError('Payrun not found', 404)
  if (payrun.status !== 'VALIDATED') {
    throw new AppError('Only VALIDATED payruns can be marked as PAID', 400)
  }

  await prisma.$transaction([
    prisma.payrun.update({
      where: { id: payrunId },
      data: { status: 'PAID' },
    }),
    prisma.payslip.updateMany({
      where: { payrunId },
      data: { status: 'PAID' },
    }),
  ])

  return getOne(payrunId)
}

/**
 * Send payslips via email to employees
 */
async function sendPayslips(payrunId) {
  const payrun = await prisma.payrun.findUnique({ where: { id: payrunId } })
  if (!payrun) throw new AppError('Payrun not found', 404)
  if (!['VALIDATED', 'PAID'].includes(payrun.status)) {
    throw new AppError('Payslips can only be sent on VALIDATED or PAID payruns', 400)
  }

  return sendAllPayslips(payrunId)
}

/**
 * Get eligible employees for a salary structure and period
 */
async function getEligibleEmployees(salaryStructureId, periodStart, periodEnd) {
  if (!salaryStructureId) throw new AppError('salaryStructureId is required', 400)

  // Find all ACTIVE contracts for this salary structure
  const contracts = await prisma.contract.findMany({
    where: {
      status: 'ACTIVE',
      salaryStructureId,
    },
    include: {
      employee: {
        include: {
          user: { select: { id: true, email: true } },
          workingSchedule: { select: { id: true, name: true, weeklyHours: true } },
        },
      },
    },
    orderBy: { employee: { firstName: 'asc' } },
  })

  // Group by employee to avoid duplicates
  const seen = new Set()
  const eligible = []

  for (const c of contracts) {
    if (seen.has(c.employeeId)) continue
    seen.add(c.employeeId)

    const emp = c.employee
    const hours = emp.workingSchedule?.weeklyHours || 40
    eligible.push({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      firstName: emp.firstName,
      lastName: emp.lastName,
      employeeNumber: emp.employeeNumber,
      workingHours: `${hours} hrs/week`,
      startDate: dayjs(c.startDate).format('MMM D, YYYY'),
      wage: c.wage,
    })
  }

  return eligible
}

module.exports = {
  getAll,
  getOne,
  create,
  compute,
  validate,
  markPaid,
  sendPayslips,
  getEligibleEmployees,
}
