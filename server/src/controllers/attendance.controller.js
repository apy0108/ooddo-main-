const svc = require('../services/attendance.service')
const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const { success } = require('../utils/apiResponse')

/**
 * Resolve user and linked employee details for audit and contextual actions
 */
const getUserContext = async (reqUser) => {
  const userId = reqUser.userId || reqUser.id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          departmentId: true,
        },
      },
    },
  })
  if (!user) {
    return { ...reqUser, employee: null }
  }
  return user
}

/**
 * Get the current user's linked employee record
 */
const getLoggedInEmployee = async (reqUser) => {
  const userId = reqUser.userId || reqUser.id
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeNumber: true,
      departmentId: true,
    },
  })
  if (!employee) {
    throw new AppError('No employee profile is linked to this account.', 404)
  }
  return employee
}

// ── GET /api/attendance ──────────────────────────────────────
const list = async (req, res) => {
  const userContext = await getUserContext(req.user)
  const result = await svc.getAllAttendance(req.query, userContext)
  return success(res, result.attendance, 200, result.meta)
}

// ── GET /api/attendance/today ────────────────────────────────
const todaySession = async (req, res) => {
  let employeeId = req.query.employeeId

  // If regular employee or no specific employee requested, use logged in employee
  if (!employeeId || req.user.role === 'EMPLOYEE') {
    const employee = await getLoggedInEmployee(req.user)
    employeeId = employee.id
  }

  const sessionData = await svc.getTodaySession(employeeId)
  return success(res, sessionData)
}

// ── GET /api/attendance/:id ──────────────────────────────────
const getOne = async (req, res) => {
  const userContext = await getUserContext(req.user)
  const record = await svc.getAttendanceById(req.params.id, userContext)
  return success(res, record)
}

// ── POST /api/attendance/checkin ─────────────────────────────
const checkIn = async (req, res) => {
  const employee = await getLoggedInEmployee(req.user)
  const record = await svc.checkIn(employee.id)
  return success(res, record, 201)
}

// ── POST /api/attendance/checkout ────────────────────────────
const checkOut = async (req, res) => {
  const employee = await getLoggedInEmployee(req.user)
  const record = await svc.checkOut(employee.id)
  return success(res, record, 200)
}

// ── POST /api/attendance ─────────────────────────────────────
const createManual = async (req, res) => {
  const userContext = await getUserContext(req.user)
  const record = await svc.createManualAttendance(req.body, userContext)
  return success(res, record, 201)
}

// ── PUT /api/attendance/:id ──────────────────────────────────
const update = async (req, res) => {
  const userContext = await getUserContext(req.user)
  const record = await svc.updateAttendance(req.params.id, req.body, userContext)
  return success(res, record, 200)
}

// ── POST /api/attendance/auto-absent ─────────────────────────
const autoAbsent = async (req, res) => {
  const targetDate = req.body.targetDate ? new Date(req.body.targetDate) : new Date()
  const result = await svc.autoCreateAbsentRecords(targetDate)
  return success(res, result, 200)
}

module.exports = {
  list,
  todaySession,
  getOne,
  checkIn,
  checkOut,
  createManual,
  update,
  autoAbsent,
}
