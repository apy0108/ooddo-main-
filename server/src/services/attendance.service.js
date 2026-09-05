const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const { paginate, paginateMeta } = require('../utils/pagination')
const dayjs = require('dayjs')

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

/**
 * Get working schedule line for an employee on a given date
 */
const getEmployeeScheduleLine = async (employeeId, date) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      workingSchedule: { include: { lines: true } },
      contracts: {
        where: { status: 'ACTIVE' },
        include: { workingSchedule: { include: { lines: true } } },
        take: 1,
      },
    },
  })

  if (!employee) return { scheduleLine: null, workingSchedule: null }

  // Check active contract schedule first, then employee schedule
  const workingSchedule = employee.contracts?.[0]?.workingSchedule || employee.workingSchedule
  if (!workingSchedule || !workingSchedule.lines) return { scheduleLine: null, workingSchedule: null }

  const dayOfWeek = DAY_NAMES[dayjs(date).day()]
  const scheduleLine = workingSchedule.lines.find((l) => l.dayOfWeek === dayOfWeek)

  return { scheduleLine, workingSchedule }
}

/**
 * Get scheduled working hours for an employee on a given date (defaults to 8 if not configured)
 */
const getScheduledHours = async (employeeId, date) => {
  const { scheduleLine } = await getEmployeeScheduleLine(employeeId, date)
  if (scheduleLine && typeof scheduleLine.workedHours === 'number') {
    return scheduleLine.workedHours
  }
  return 8 // Standard default
}

/**
 * Calculate worked hours between checkIn and checkOut rounded to 2 decimals
 */
const calcWorkedHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0
  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (diffMs <= 0) return 0
  return Math.round((diffMs / 3600000) * 100) / 100
}

/**
 * Calculate overtime: Worked Hours - Scheduled Hours (never negative, rounded to 2 decimals)
 */
const calcOvertime = (workedHours, scheduledHours) => {
  const diff = (workedHours || 0) - (scheduledHours || 0)
  return diff > 0 ? Math.round(diff * 100) / 100 : 0
}

/**
 * Detect status based on check-in time, schedule, and worked hours
 */
const detectStatus = (checkIn, scheduledStart, scheduledHours, workedHours) => {
  if (!checkIn) return 'ABSENT'

  let isLate = false
  if (scheduledStart) {
    const [startH, startM] = scheduledStart.split(':').map(Number)
    const schedMins = startH * 60 + startM
    const checkInMins = dayjs(checkIn).hour() * 60 + dayjs(checkIn).minute()
    // 10 minutes grace period
    if (checkInMins > schedMins + 10) {
      isLate = true
    }
  }

  if (workedHours !== null && workedHours !== undefined && workedHours > 0 && scheduledHours > 0) {
    if (workedHours < scheduledHours / 2) {
      return 'HALF_DAY'
    }
  }

  return isLate ? 'LATE' : 'PRESENT'
}

/**
 * List attendance records with pagination and filters
 */
const getAllAttendance = async (query = {}, currentUser = {}) => {
  const { page, limit, skip } = paginate(query)
  const { search, status, departmentId, employeeId, startDate, endDate, date } = query

  const where = {}

  // If user is a regular employee, force filter to their own record
  if (currentUser.role === 'EMPLOYEE') {
    const userEmployee = await prisma.employee.findUnique({
      where: { userId: currentUser.id },
      select: { id: true },
    })
    if (!userEmployee) {
      return { attendance: [], meta: paginateMeta(0, page, limit) }
    }
    where.employeeId = userEmployee.id
  } else if (employeeId) {
    where.employeeId = employeeId
  }

  if (status) {
    where.status = status
  }

  if (departmentId) {
    where.employee = { ...(where.employee || {}), departmentId }
  }

  if (date) {
    const startOfTarget = dayjs(date).startOf('day').toDate()
    const endOfTarget = dayjs(date).endOf('day').toDate()
    where.OR = [
      { checkIn: { gte: startOfTarget, lte: endOfTarget } },
      { AND: [{ checkIn: null }, { createdAt: { gte: startOfTarget, lte: endOfTarget } }] },
    ]
  } else if (startDate || endDate) {
    const dateRange = {}
    if (startDate) dateRange.gte = dayjs(startDate).startOf('day').toDate()
    if (endDate) dateRange.lte = dayjs(endDate).endOf('day').toDate()
    where.OR = [
      { checkIn: dateRange },
      { AND: [{ checkIn: null }, { createdAt: dateRange }] },
    ]
  }

  if (search) {
    where.employee = {
      ...(where.employee || {}),
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const [total, attendance] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ checkIn: 'desc' }, { createdAt: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
            department: { select: { id: true, name: true } },
            jobPosition: { select: { id: true, title: true } },
            workingSchedule: { select: { id: true, name: true, weeklyHours: true } },
          },
        },
      },
    }),
  ])

  return { attendance, meta: paginateMeta(total, page, limit) }
}

/**
 * Get single attendance record by ID
 */
const getAttendanceById = async (id, currentUser = {}) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          photoUrl: true,
          userId: true,
          department: { select: { id: true, name: true } },
          jobPosition: { select: { id: true, title: true } },
          workingSchedule: {
            select: {
              id: true,
              name: true,
              weeklyHours: true,
              lines: true,
            },
          },
        },
      },
    },
  })

  if (!attendance) {
    throw new AppError('Attendance record not found', 404)
  }

  // Security check: Regular employees can only view their own attendance record
  if (currentUser.role === 'EMPLOYEE' && attendance.employee.userId !== currentUser.id) {
    throw new AppError('Access denied: You may only view your own attendance records.', 403)
  }

  // Calculate scheduled hours for reference
  const recordDate = attendance.checkIn || attendance.createdAt
  const scheduledHours = await getScheduledHours(attendance.employeeId, recordDate)

  return { ...attendance, scheduledHours }
}

/**
 * Get today's attendance session for an employee
 */
const getTodaySession = async (employeeId) => {
  const startOfDay = dayjs().startOf('day').toDate()
  const endOfDay = dayjs().endOf('day').toDate()

  const record = await prisma.attendance.findFirst({
    where: {
      employeeId,
      OR: [
        { checkIn: { gte: startOfDay, lte: endOfDay } },
        { createdAt: { gte: startOfDay, lte: endOfDay } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
        },
      },
    },
  })

  if (!record) {
    return { isCheckedIn: false, session: null }
  }

  const isCheckedIn = !!record.checkIn && !record.checkOut
  const scheduledHours = await getScheduledHours(employeeId, new Date())

  let currentWorkedHours = record.workedHours || 0
  if (isCheckedIn && record.checkIn) {
    currentWorkedHours = calcWorkedHours(record.checkIn, new Date())
  }

  return {
    isCheckedIn,
    session: record,
    scheduledHours,
    currentWorkedHours,
  }
}

/**
 * Check In for today
 */
const checkIn = async (employeeId) => {
  const startOfDay = dayjs().startOf('day').toDate()
  const endOfDay = dayjs().endOf('day').toDate()

  // Check if active unclosed session exists
  const activeSession = await prisma.attendance.findFirst({
    where: {
      employeeId,
      checkOut: null,
      checkIn: { gte: startOfDay, lte: endOfDay },
    },
  })

  if (activeSession) {
    throw new AppError('You are already checked in. Please check out first.', 400)
  }

  const now = new Date()
  const { scheduleLine } = await getEmployeeScheduleLine(employeeId, now)
  const scheduledStart = scheduleLine?.startTime || '09:00'
  const scheduledHours = scheduleLine?.workedHours || 8

  // Detect status at check-in (LATE vs PRESENT)
  const initialStatus = detectStatus(now, scheduledStart, scheduledHours, 0)

  const record = await prisma.attendance.create({
    data: {
      employeeId,
      checkIn: now,
      status: initialStatus,
      workedHours: 0,
      overtime: 0,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  })

  return record
}

/**
 * Check Out for active session
 */
const checkOut = async (employeeId) => {
  const activeSession = await prisma.attendance.findFirst({
    where: {
      employeeId,
      checkOut: null,
      checkIn: { not: null },
    },
    orderBy: { checkIn: 'desc' },
  })

  if (!activeSession) {
    throw new AppError('No active check-in session found. Please check in first.', 400)
  }

  const now = new Date()
  if (now.getTime() <= new Date(activeSession.checkIn).getTime()) {
    throw new AppError('Check-out time must be after check-in time.', 400)
  }

  const workedHours = calcWorkedHours(activeSession.checkIn, now)
  const scheduledHours = await getScheduledHours(employeeId, activeSession.checkIn)
  const overtime = calcOvertime(workedHours, scheduledHours)

  // Status adjustment for half-day if applicable and not already marked late
  let status = activeSession.status
  if (workedHours < scheduledHours / 2 && status !== 'LATE') {
    status = 'HALF_DAY'
  }

  const updated = await prisma.attendance.update({
    where: { id: activeSession.id },
    data: {
      checkOut: now,
      workedHours,
      overtime,
      status,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  })

  return updated
}

/**
 * Helper to build editor label with name and role
 */
const formatEditorLabel = (currentUser) => {
  const name = currentUser.employee
    ? `${currentUser.employee.firstName} ${currentUser.employee.lastName}`
    : currentUser.email || 'Admin'
  return `${name} (${currentUser.role})`
}

/**
 * Create manual attendance record (HR / Admin)
 */
const createManualAttendance = async (data, currentUser) => {
  const { employeeId, checkIn, checkOut, status = 'PRESENT', reason, notes, editNote } = data

  if (!employeeId) {
    throw new AppError('Employee ID is required', 400)
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!employee) {
    throw new AppError('Employee not found', 404)
  }

  const editorLabel = formatEditorLabel(currentUser)
  let workedHours = 0
  let overtime = 0
  let parsedCheckIn = checkIn ? new Date(checkIn) : null
  let parsedCheckOut = checkOut ? new Date(checkOut) : null

  if (status === 'ABSENT' || status === 'ON_LEAVE') {
    parsedCheckIn = null
    parsedCheckOut = null
    workedHours = 0
    overtime = 0
  } else {
    if (!parsedCheckIn) {
      throw new AppError('Check-in time is required for this attendance status', 400)
    }
    if (parsedCheckOut) {
      if (parsedCheckOut.getTime() <= parsedCheckIn.getTime()) {
        throw new AppError('Check-out time must be after check-in time', 400)
      }
      workedHours = calcWorkedHours(parsedCheckIn, parsedCheckOut)
      const scheduledHours = await getScheduledHours(employeeId, parsedCheckIn)
      overtime = calcOvertime(workedHours, scheduledHours)
    }
  }

  const auditNote = editNote || notes || 'Manual attendance record created'
  const auditTrailEntry = `[${dayjs().format('YYYY-MM-DD HH:mm')}] Created by ${editorLabel}: ${auditNote}`
  const combinedNotes = notes ? `${notes}\n${auditTrailEntry}` : auditTrailEntry

  const created = await prisma.attendance.create({
    data: {
      employeeId,
      checkIn: parsedCheckIn,
      checkOut: parsedCheckOut,
      workedHours,
      overtime,
      status,
      reason: reason || null,
      notes: combinedNotes,
      isManualEdit: true,
      editedBy: editorLabel,
      editNote: auditNote,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: { select: { id: true, name: true } },
          jobPosition: { select: { id: true, title: true } },
        },
      },
    },
  })

  return created
}

/**
 * Update attendance record manually (Rule A2: HR_MANAGER, HR_PAYROLL_MANAGER, ADMIN only)
 */
const updateAttendance = async (id, data, currentUser) => {
  const allowedRoles = ['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']
  if (!allowedRoles.includes(currentUser.role)) {
    throw new AppError(
      'Permission denied: Only HR Managers, HR Payroll Managers, and Admins can edit attendance records.',
      403
    )
  }

  if (!data.editNote || !data.editNote.trim()) {
    throw new AppError('Edit note is required for manual adjustments', 400)
  }

  const existing = await prisma.attendance.findUnique({
    where: { id },
    include: { employee: true },
  })

  if (!existing) {
    throw new AppError('Attendance record not found', 404)
  }

  const editorLabel = formatEditorLabel(currentUser)

  let checkIn = data.checkIn !== undefined ? (data.checkIn ? new Date(data.checkIn) : null) : existing.checkIn
  let checkOut = data.checkOut !== undefined ? (data.checkOut ? new Date(data.checkOut) : null) : existing.checkOut
  let status = data.status || existing.status

  if (status === 'ABSENT' || status === 'ON_LEAVE') {
    checkIn = null
    checkOut = null
  }

  if (checkIn && checkOut && checkOut.getTime() <= checkIn.getTime()) {
    throw new AppError('Check-out time must be after check-in time', 400)
  }

  let workedHours = existing.workedHours || 0
  let overtime = existing.overtime || 0

  if (status === 'ABSENT' || status === 'ON_LEAVE') {
    workedHours = 0
    overtime = 0
  } else if (checkIn && checkOut) {
    workedHours = calcWorkedHours(checkIn, checkOut)
    const scheduledHours = await getScheduledHours(existing.employeeId, checkIn)
    overtime = calcOvertime(workedHours, scheduledHours)
  } else if (checkIn && !checkOut) {
    workedHours = 0
    overtime = 0
  }

  const auditEntry = `[${dayjs().format('YYYY-MM-DD HH:mm')}] Edited by ${editorLabel}: ${data.editNote.trim()}`
  const updatedNotes = existing.notes ? `${existing.notes}\n${auditEntry}` : auditEntry

  const updated = await prisma.attendance.update({
    where: { id },
    data: {
      checkIn,
      checkOut,
      status,
      workedHours,
      overtime,
      reason: data.reason !== undefined ? data.reason : existing.reason,
      notes: updatedNotes,
      isManualEdit: true,
      editedBy: editorLabel,
      editNote: data.editNote.trim(),
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: { select: { id: true, name: true } },
          jobPosition: { select: { id: true, title: true } },
        },
      },
    },
  })

  return updated
}

/**
 * Auto-create absent records for active employees with scheduled work on targetDate
 */
const autoCreateAbsentRecords = async (targetDate = new Date()) => {
  const dayStart = dayjs(targetDate).startOf('day').toDate()
  const dayEnd = dayjs(targetDate).endOf('day').toDate()
  const dayOfWeek = DAY_NAMES[dayjs(targetDate).day()]

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    include: {
      workingSchedule: { include: { lines: true } },
      contracts: {
        where: { status: 'ACTIVE' },
        include: { workingSchedule: { include: { lines: true } } },
        take: 1,
      },
      attendance: {
        where: {
          OR: [
            { checkIn: { gte: dayStart, lte: dayEnd } },
            { createdAt: { gte: dayStart, lte: dayEnd } },
          ],
        },
      },
      timeOffRequests: {
        where: {
          status: 'APPROVED',
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart },
        },
      },
    },
  })

  let createdAbsent = 0
  let createdLeave = 0

  for (const emp of employees) {
    // If employee already has an attendance record for this day, skip
    if (emp.attendance && emp.attendance.length > 0) {
      continue
    }

    // Check if scheduled to work on this day
    const workingSchedule = emp.contracts?.[0]?.workingSchedule || emp.workingSchedule
    const line = workingSchedule?.lines?.find((l) => l.dayOfWeek === dayOfWeek)

    // If day is not a scheduled working day, skip
    if (!line || line.workedHours <= 0) {
      continue
    }

    // Check if employee is on approved leave
    const approvedLeave = emp.timeOffRequests && emp.timeOffRequests.length > 0
    if (approvedLeave) {
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          checkIn: null,
          checkOut: null,
          workedHours: 0,
          overtime: 0,
          status: 'ON_LEAVE',
          notes: `Auto-generated: Approved time-off on ${dayjs(targetDate).format('YYYY-MM-DD')}`,
          isManualEdit: false,
        },
      })
      createdLeave++
    } else {
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          checkIn: null,
          checkOut: null,
          workedHours: 0,
          overtime: 0,
          status: 'ABSENT',
          notes: `Auto-generated: No check-in recorded for ${dayjs(targetDate).format('YYYY-MM-DD')}`,
          isManualEdit: false,
        },
      })
      createdAbsent++
    }
  }

  return { createdAbsent, createdLeave }
}

module.exports = {
  getScheduledHours,
  calcWorkedHours,
  calcOvertime,
  detectStatus,
  getAllAttendance,
  getAttendanceById,
  getTodaySession,
  checkIn,
  checkOut,
  createManualAttendance,
  updateAttendance,
  autoCreateAbsentRecords,
}
