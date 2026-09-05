const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const dayjs = require('dayjs')

// ── Generate contract reference ──────────────────────────────
const generateContractRef = async () => {
  const year = new Date().getFullYear()
  const count = await prisma.contract.count()
  return `CON/${year}/${String(count + 1).padStart(3, '0')}`
}

// ── Check for overlapping ACTIVE contracts (Rule C1) ─────────
const checkOverlap = async (employeeId, startDate, endDate, excludeId = null) => {
  const existing = await prisma.contract.findMany({
    where: {
      employeeId,
      status: 'ACTIVE',
      ...(excludeId && { NOT: { id: excludeId } }),
    },
  })

  for (const contract of existing) {
    const existStart = dayjs(contract.startDate)
    const existEnd   = contract.endDate ? dayjs(contract.endDate) : dayjs('2099-12-31')
    const newStart   = dayjs(startDate)
    const newEnd     = endDate ? dayjs(endDate) : dayjs('2099-12-31')

    const overlaps = newStart.isBefore(existEnd) && existStart.isBefore(newEnd)
    if (overlaps) {
      throw new AppError(
        `This employee already has a Running contract (${contract.contractRef}) ` +
        `that overlaps with the selected period. ` +
        `An employee can only have one Running contract at a time.`,
        400
      )
    }
  }
}

// ── List contracts ────────────────────────────────────────────
const getAll = async (query = {}) => {
  const { employeeId, status, search } = query
  return prisma.contract.findMany({
    where: {
      ...(employeeId && { employeeId }),
      ...(status     && { status }),
      ...(search && {
        OR: [
          { contractRef: { contains: search, mode: 'insensitive' } },
          { employee: { firstName: { contains: search, mode: 'insensitive' } } },
          { employee: { lastName:  { contains: search, mode: 'insensitive' } } },
        ],
      }),
    },
    include: {
      employee:        { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      department:      { select: { id: true, name: true } },
      jobPosition:     { select: { id: true, title: true } },
      workingSchedule: { select: { id: true, name: true } },
      salaryStructure: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ── Get one contract ──────────────────────────────────────────
const getById = async (id) => {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      employee:        { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
      department:      { select: { id: true, name: true } },
      jobPosition:     { select: { id: true, title: true } },
      workingSchedule: { select: { id: true, name: true, weeklyHours: true } },
      salaryStructure: { select: { id: true, name: true, code: true, description: true } },
    },
  })
  if (!contract) throw new AppError('Contract not found', 404)
  return contract
}

// ── Create contract (starts as DRAFT) ────────────────────────
const create = async (data) => {
  const {
    employeeId, startDate, endDate, contractType = 'FULL_TIME',
    wage, wageType = 'MONTHLY', departmentId, jobPositionId,
    workingScheduleId, salaryStructureId, notes,
  } = data

  if (!employeeId) throw new AppError('Employee is required', 400)
  if (!startDate)  throw new AppError('Start date is required', 400)
  if (!wage || wage <= 0) throw new AppError('Wage must be a positive number', 400)

  const contractRef = await generateContractRef()

  return prisma.contract.create({
    data: {
      contractRef,
      employeeId,
      startDate:  new Date(startDate),
      endDate:    endDate ? new Date(endDate) : null,
      contractType,
      status:     'DRAFT',
      wage:       parseFloat(wage),
      wageType,
      notes:      notes || null,
      ...(departmentId      && { department:      { connect: { id: departmentId } } }),
      ...(jobPositionId     && { jobPosition:     { connect: { id: jobPositionId } } }),
      ...(workingScheduleId && { workingSchedule: { connect: { id: workingScheduleId } } }),
      ...(salaryStructureId && { salaryStructure: { connect: { id: salaryStructureId } } }),
    },
    include: {
      employee:        { select: { id: true, firstName: true, lastName: true } },
      department:      { select: { id: true, name: true } },
      jobPosition:     { select: { id: true, title: true } },
      workingSchedule: { select: { id: true, name: true } },
    },
  })
}

// ── Update contract ───────────────────────────────────────────
const update = async (id, data) => {
  const contract = await getById(id)

  if (contract.status === 'ACTIVE') {
    // Running contracts: only allow editing notes and endDate
    const allowed = ['endDate', 'notes']
    const attempted = Object.keys(data).filter((k) => !allowed.includes(k))
    if (attempted.length > 0) {
      throw new AppError(
        'A Running contract can only have its End Date or Notes updated. ' +
        'To change other details, create a new contract.',
        400
      )
    }
  }

  return prisma.contract.update({
    where: { id },
    data: {
      ...(data.endDate          !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      ...(data.notes            !== undefined && { notes: data.notes }),
      ...(data.wage             !== undefined && { wage: parseFloat(data.wage) }),
      ...(data.contractType     !== undefined && { contractType: data.contractType }),
      ...(data.wageType         !== undefined && { wageType: data.wageType }),
      ...(data.departmentId     !== undefined && {
        department: data.departmentId ? { connect: { id: data.departmentId } } : { disconnect: true },
      }),
      ...(data.jobPositionId    !== undefined && {
        jobPosition: data.jobPositionId ? { connect: { id: data.jobPositionId } } : { disconnect: true },
      }),
      ...(data.workingScheduleId !== undefined && {
        workingSchedule: data.workingScheduleId ? { connect: { id: data.workingScheduleId } } : { disconnect: true },
      }),
      ...(data.salaryStructureId !== undefined && {
        salaryStructure: data.salaryStructureId ? { connect: { id: data.salaryStructureId } } : { disconnect: true },
      }),
    },
    include: {
      employee:        { select: { id: true, firstName: true, lastName: true } },
      department:      { select: { id: true, name: true } },
      jobPosition:     { select: { id: true, title: true } },
      workingSchedule: { select: { id: true, name: true } },
      salaryStructure: { select: { id: true, name: true } },
    },
  })
}

// ── Activate contract (DRAFT → ACTIVE) — enforces Rule C1 ────
const activate = async (id) => {
  const contract = await getById(id)

  if (contract.status === 'ACTIVE')
    throw new AppError('This contract is already Running', 400)
  if (contract.status === 'CANCELLED')
    throw new AppError('A cancelled contract cannot be activated', 400)
  if (contract.status === 'EXPIRED')
    throw new AppError('An expired contract cannot be reactivated', 400)

  // Rule C1 — check for overlap with other ACTIVE contracts
  await checkOverlap(
    contract.employeeId,
    contract.startDate,
    contract.endDate,
    id
  )

  return prisma.contract.update({
    where: { id },
    data: { status: 'ACTIVE' },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  })
}

// ── Cancel contract ───────────────────────────────────────────
const cancel = async (id) => {
  const contract = await getById(id)
  if (contract.status === 'PAID')
    throw new AppError('Cannot cancel a contract that has paid payslips', 400)
  return prisma.contract.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })
}

// ── Auto-expire contracts whose endDate has passed ───────────
const expireOverdueContracts = async () => {
  const today = new Date()
  return prisma.contract.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: today },
    },
    data: { status: 'EXPIRED' },
  })
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  activate,
  cancel,
  expireOverdueContracts,
}
