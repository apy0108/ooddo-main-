const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const { computePayslip } = require('./payslipComputation.service')
const { generatePayslipPdf } = require('./payslipPdf.service')
const { sendPayslipEmail } = require('./payslipEmail.service')
const dayjs = require('dayjs')

/**
 * List all payslips with RBAC and filtering
 */
async function getAll(filters = {}, userRole, userId) {
  const { period, employeeId, status, payrunId, search } = filters

  const where = {}

  // RBAC: Regular employee can only see their own payslips
  if (userRole === 'EMPLOYEE') {
    const emp = await prisma.employee.findUnique({ where: { userId } })
    if (!emp) return []
    where.employeeId = emp.id
  } else if (employeeId) {
    where.employeeId = employeeId
  }

  if (status) where.status = status
  if (payrunId) where.payrunId = payrunId

  if (period && period !== 'All Periods') {
    // Period format can be "Jan 2026", "2026-01", etc.
    const parsed = dayjs(period)
    if (parsed.isValid()) {
      where.periodStart = {
        gte: parsed.startOf('month').toDate(),
        lte: parsed.endOf('month').toDate(),
      }
    }
  }

  if (search) {
    where.OR = [
      { employee: { firstName: { contains: search, mode: 'insensitive' } } },
      { employee: { lastName: { contains: search, mode: 'insensitive' } } },
      { employee: { employeeNumber: { contains: search, mode: 'insensitive' } } },
      { payrun: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  return prisma.payslip.findMany({
    where,
    include: {
      employee: {
        include: {
          user: { select: { id: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      },
      salaryStructure: { select: { id: true, name: true, code: true } },
      payrun: { select: { id: true, name: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get one payslip with RBAC
 */
async function getOne(id, userRole, userId) {
  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          user: { select: { id: true, email: true } },
          department: { select: { id: true, name: true } },
          jobPosition: { select: { id: true, title: true } },
        },
      },
      salaryStructure: true,
      payrun: true,
      lines: { orderBy: { sequence: 'asc' } },
    },
  })

  if (!payslip) throw new AppError('Payslip not found', 404)

  // RBAC check
  if (userRole === 'EMPLOYEE' && payslip.employee?.userId !== userId) {
    throw new AppError('Unauthorized: You may only view your own payslips', 403)
  }

  return payslip
}

/**
 * Compute one payslip
 */
async function computeOne(payslipId) {
  return computePayslip(payslipId)
}

/**
 * Generate PDF and return download URL
 */
async function generatePdf(payslipId) {
  const { publicPath, filePath } = await generatePayslipPdf(payslipId)
  return { pdfUrl: publicPath, filePath }
}

/**
 * Send one payslip via email
 */
async function sendOne(payslipId) {
  return sendPayslipEmail(payslipId)
}

/**
 * Mark a single payslip as PAID
 */
async function markPaid(payslipId) {
  const payslip = await prisma.payslip.findUnique({ where: { id: payslipId } })
  if (!payslip) throw new AppError('Payslip not found', 404)
  if (!['COMPUTED', 'DONE'].includes(payslip.status)) {
    throw new AppError('Only COMPUTED or DONE payslips can be marked as PAID', 400)
  }

  return prisma.payslip.update({
    where: { id: payslipId },
    data: { status: 'PAID' },
    include: {
      lines: { orderBy: { sequence: 'asc' } },
      employee: true,
    },
  })
}

/**
 * Create a standalone payslip (outside payrun for adjustments/corrections)
 */
async function createStandalone(data, createdById) {
  const { employeeId, salaryStructureId, periodStart, periodEnd } = data
  if (!employeeId) throw new AppError('Employee is required', 400)
  if (!periodStart || !periodEnd) throw new AppError('Period start and end dates are required', 400)

  // Get active contract to resolve salary structure if not provided
  let structId = salaryStructureId
  if (!structId) {
    const contract = await prisma.contract.findFirst({
      where: { employeeId, status: 'ACTIVE' },
    })
    structId = contract?.salaryStructureId
  }
  if (!structId) throw new AppError('Salary structure is required', 400)

  // Find or create default ad-hoc payrun for standalone payslips
  const periodName = `Ad-hoc ${dayjs(periodStart).format('MMM YYYY')}`
  let adhocPayrun = await prisma.payrun.findFirst({
    where: { name: periodName, salaryStructureId: structId },
  })
  if (!adhocPayrun) {
    adhocPayrun = await prisma.payrun.create({
      data: {
        name: periodName,
        salaryStructureId: structId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: 'DRAFT',
        createdById,
      },
    })
  }

  const payslip = await prisma.payslip.create({
    data: {
      payrunId: adhocPayrun.id,
      employeeId,
      salaryStructureId: structId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: 'DRAFT',
      warnings: [],
      workedDays: 0,
      totalDays: 0,
      basic: 0,
      gross: 0,
      deductions: 0,
      net: 0,
    },
  })

  // Compute it immediately
  return computePayslip(payslip.id)
}

module.exports = {
  getAll,
  getOne,
  computeOne,
  generatePdf,
  sendOne,
  markPaid,
  createStandalone,
}
