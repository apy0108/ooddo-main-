const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const { paginate, paginateMeta } = require('../utils/pagination')

// ── List employees (with search + filters) ──────────────────
const getAllEmployees = async (query = {}) => {
  const { page, limit, skip } = paginate(query)
  const { search, status, departmentId, jobPositionId } = query

  const where = {
    ...(status && { status }),
    ...(departmentId && { departmentId }),
    ...(jobPositionId && { jobPositionId }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      orderBy: { firstName: 'asc' },
      include: {
        department:   { select: { id: true, name: true } },
        jobPosition:  { select: { id: true, title: true } },
        workingSchedule: { select: { id: true, name: true } },
        manager:      { select: { id: true, firstName: true, lastName: true } },
        _count: {
          select: {
            contracts:       true,
            attendance:      true,
            timeOffRequests: true,
            payslips:        true,
          },
        },
      },
    }),
  ])

  return { employees, meta: paginateMeta(total, page, limit) }
}

// ── Get single employee ──────────────────────────────────────
const getEmployeeById = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department:      { select: { id: true, name: true } },
      jobPosition:     { select: { id: true, title: true } },
      workingSchedule: { select: { id: true, name: true, weeklyHours: true } },
      manager:         { select: { id: true, firstName: true, lastName: true, email: true } },
      user:            { select: { id: true, email: true, role: true } },
      _count: {
        select: {
          contracts:       true,
          attendance:      true,
          timeOffRequests: true,
          payslips:        true,
        },
      },
    },
  })

  if (!employee) throw new AppError('Employee not found', 404)
  return employee
}

// ── Create employee ──────────────────────────────────────────
const createEmployee = async (data) => {
  const {
    firstName, lastName, email, phone, dateOfBirth,
    hireDate, departmentId, jobPositionId, managerId,
    workingScheduleId, workLocation, company,
    bankAccountNumber, bankName, status = 'ACTIVE',
  } = data

  // Auto-generate employee number
  const count = await prisma.employee.count()
  const employeeNumber = `EMP-${String(count + 1).padStart(3, '0')}`

  // Check email unique
  const existing = await prisma.employee.findUnique({ where: { email } })
  if (existing) throw new AppError('An employee with this email already exists', 400)

  return prisma.employee.create({
    data: {
      employeeNumber,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      hireDate: new Date(hireDate || Date.now()),
      status,
      workLocation,
      company: company || 'PeoplePay360',
      bankAccountNumber,
      bankName,
      ...(departmentId      && { department:      { connect: { id: departmentId } } }),
      ...(jobPositionId     && { jobPosition:     { connect: { id: jobPositionId } } }),
      ...(managerId         && { manager:         { connect: { id: managerId } } }),
      ...(workingScheduleId && { workingSchedule: { connect: { id: workingScheduleId } } }),
    },
    include: {
      department:      { select: { id: true, name: true } },
      jobPosition:     { select: { id: true, title: true } },
      workingSchedule: { select: { id: true, name: true } },
      manager:         { select: { id: true, firstName: true, lastName: true } },
    },
  })
}

// ── Update employee ──────────────────────────────────────────
const updateEmployee = async (id, data) => {
  await getEmployeeById(id) // throws 404 if not found

  const {
    firstName, lastName, email, phone, dateOfBirth,
    hireDate, departmentId, jobPositionId, managerId,
    workingScheduleId, workLocation, company,
    bankAccountNumber, bankName, status,
  } = data

  return prisma.employee.update({
    where: { id },
    data: {
      ...(firstName         !== undefined && { firstName }),
      ...(lastName          !== undefined && { lastName }),
      ...(email             !== undefined && { email }),
      ...(phone             !== undefined && { phone }),
      ...(dateOfBirth       !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
      ...(hireDate          !== undefined && { hireDate: new Date(hireDate) }),
      ...(status            !== undefined && { status }),
      ...(workLocation      !== undefined && { workLocation }),
      ...(company           !== undefined && { company }),
      ...(bankAccountNumber !== undefined && { bankAccountNumber }),
      ...(bankName          !== undefined && { bankName }),
      ...(departmentId      !== undefined && {
        department: departmentId ? { connect: { id: departmentId } } : { disconnect: true }
      }),
      ...(jobPositionId     !== undefined && {
        jobPosition: jobPositionId ? { connect: { id: jobPositionId } } : { disconnect: true }
      }),
      ...(managerId         !== undefined && {
        manager: managerId ? { connect: { id: managerId } } : { disconnect: true }
      }),
      ...(workingScheduleId !== undefined && {
        workingSchedule: workingScheduleId ? { connect: { id: workingScheduleId } } : { disconnect: true }
      }),
    },
    include: {
      department:      { select: { id: true, name: true } },
      jobPosition:     { select: { id: true, title: true } },
      workingSchedule: { select: { id: true, name: true } },
      manager:         { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { contracts: true, attendance: true, timeOffRequests: true, payslips: true } },
    },
  })
}

// ── Archive (soft delete — set status to TERMINATED) ────────
const archiveEmployee = async (id) => {
  await getEmployeeById(id)
  return prisma.employee.update({
    where: { id },
    data: { status: 'TERMINATED' },
  })
}

// ── Smart button counts ──────────────────────────────────────
const getEmployeeCounts = async (id) => {
  await getEmployeeById(id)
  const [contracts, attendance, timeOffRequests, payslips] = await Promise.all([
    prisma.contract.count({ where: { employeeId: id } }),
    prisma.attendance.count({ where: { employeeId: id } }),
    prisma.timeOffRequest.count({ where: { employeeId: id } }),
    prisma.payslip.count({ where: { employeeId: id } }),
  ])
  return { contracts, attendance, timeOffRequests, payslips }
}

module.exports = {
  getAllEmployees, getEmployeeById, createEmployee,
  updateEmployee, archiveEmployee, getEmployeeCounts,
}
