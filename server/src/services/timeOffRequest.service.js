const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const dayjs = require('dayjs')

const getAll = async (filters = {}, currentUser = {}) => {
  const { employeeId, typeId, status, myTeam, search } = filters

  const where = {}

  if (currentUser.role === 'EMPLOYEE') {
    const emp = await prisma.employee.findUnique({
      where: { userId: currentUser.userId || currentUser.id },
      select: { id: true },
    })
    if (!emp) return []
    where.employeeId = emp.id
  } else {
    if (employeeId) where.employeeId = employeeId

    if (myTeam === 'true' || myTeam === true) {
      const currentEmp = await prisma.employee.findUnique({
        where: { userId: currentUser.userId || currentUser.id },
        select: { departmentId: true },
      })
      if (currentEmp?.departmentId) {
        where.employee = { departmentId: currentEmp.departmentId }
      }
    }
  }

  if (typeId) where.typeId = typeId
  if (status) where.status = status

  if (search) {
    where.OR = [
      { employee: { firstName: { contains: search, mode: 'insensitive' } } },
      { employee: { lastName: { contains: search, mode: 'insensitive' } } },
      { employee: { employeeNumber: { contains: search, mode: 'insensitive' } } },
      { reason: { contains: search, mode: 'insensitive' } },
      { type: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  return prisma.timeOffRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          department: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, role: true } },
        },
      },
      type: true,
      allocation: true,
      approver: {
        select: {
          id: true,
          email: true,
          role: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })
}

const getOne = async (id, currentUser = {}) => {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          userId: true,
          department: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, role: true } },
        },
      },
      type: true,
      allocation: true,
      approver: {
        select: {
          id: true,
          email: true,
          role: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  if (!request) throw new AppError('Time off request not found', 404)

  if (currentUser.role === 'EMPLOYEE' && request.employee.userId !== (currentUser.userId || currentUser.id)) {
    throw new AppError('Access denied: You may only view your own time off requests.', 403)
  }

  return request
}

const create = async (data, currentUser = {}) => {
  let { employeeId, typeId, startDate, endDate, duration, reason } = data

  // If regular employee, lock employeeId to their own
  if (currentUser.role === 'EMPLOYEE') {
    const emp = await prisma.employee.findUnique({
      where: { userId: currentUser.userId || currentUser.id },
      select: { id: true },
    })
    if (!emp) throw new AppError('Employee profile not found for user account', 404)
    employeeId = emp.id
  }

  if (!employeeId) throw new AppError('Employee is required', 400)
  if (!typeId) throw new AppError('Time off type is required', 400)
  if (!startDate) throw new AppError('Start date is required', 400)
  if (!endDate) throw new AppError('End date is required', 400)

  const parsedStart = new Date(startDate)
  const parsedEnd = new Date(endDate)
  if (parsedEnd.getTime() < parsedStart.getTime()) {
    throw new AppError('End date cannot be earlier than start date', 400)
  }

  const type = await prisma.timeOffType.findUnique({ where: { id: typeId } })
  if (!type) throw new AppError('Time off type not found', 404)

  // Calculate duration
  let calculatedDuration = Number(duration)
  if (type.unit === 'DAYS') {
    const diffDays = Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / 86400000) + 1
    calculatedDuration = diffDays > 0 ? diffDays : 1
  } else if (!calculatedDuration || calculatedDuration <= 0) {
    calculatedDuration = 8
  }

  let allocationId = null

  if (type.requiresAllocation) {
    const approvedAllocation = await prisma.timeOffAllocation.findFirst({
      where: {
        employeeId,
        typeId,
        status: 'APPROVED',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!approvedAllocation) {
      throw new AppError('No approved allocation found for this employee and leave type', 400)
    }

    allocationId = approvedAllocation.id
  }

  return prisma.timeOffRequest.create({
    data: {
      employeeId,
      typeId,
      allocationId,
      startDate: parsedStart,
      endDate: parsedEnd,
      duration: calculatedDuration,
      reason: reason || null,
      status: 'PENDING',
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
        },
      },
      type: true,
      allocation: true,
    },
  })
}

/**
 * BUSINESS RULE T1:
 * When approving a request for a type that requiresAllocation:
 * 1. Find APPROVED allocation for that employee + typeId
 * 2. Compute remaining = allocation.allocated - allocation.taken
 * 3. If request.duration > remaining -> throw Error('Insufficient leave balance')
 * 4. Else: approve request AND increment allocation.taken += request.duration (atomic transaction)
 */
const approve = async (id, approverId) => {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id },
    include: { type: true, allocation: true },
  })

  if (!request) throw new AppError('Time off request not found', 404)
  if (request.status === 'APPROVED') throw new AppError('Request is already approved', 400)

  if (request.type.requiresAllocation) {
    // Find the approved allocation (prefer linked one or active approved one)
    let allocation = request.allocation
    if (!allocation || allocation.status !== 'APPROVED') {
      allocation = await prisma.timeOffAllocation.findFirst({
        where: {
          employeeId: request.employeeId,
          typeId: request.typeId,
          status: 'APPROVED',
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!allocation) {
      throw new AppError('No approved allocation found for this leave request', 400)
    }

    const remaining = allocation.allocated - allocation.taken
    if (request.duration > remaining) {
      throw new AppError(
        `Insufficient leave balance: Request requires ${request.duration} ${request.type.unit.toLowerCase()}, but only ${remaining} remaining.`,
        400
      )
    }

    // Atomic transaction: update request status AND increment allocation taken
    const [updatedRequest] = await prisma.$transaction([
      prisma.timeOffRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId,
          allocationId: allocation.id,
        },
        include: {
          employee: true,
          type: true,
          allocation: true,
          approver: { select: { id: true, email: true } },
        },
      }),
      prisma.timeOffAllocation.update({
        where: { id: allocation.id },
        data: {
          taken: { increment: request.duration },
        },
      }),
    ])

    return updatedRequest
  }

  // If allocation is not required (e.g. Sick Leave)
  return prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approverId,
    },
    include: {
      employee: true,
      type: true,
      approver: { select: { id: true, email: true } },
    },
  })
}

const refuse = async (id, approverId, refuseReason) => {
  const request = await prisma.timeOffRequest.findUnique({ where: { id } })
  if (!request) throw new AppError('Time off request not found', 404)

  return prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'REFUSED',
      approverId,
      refuseReason: refuseReason || null,
    },
    include: {
      employee: true,
      type: true,
      approver: { select: { id: true, email: true } },
    },
  })
}

const getDashboardSummary = async (currentUser = {}) => {
  const startOfToday = dayjs().startOf('day').toDate()

  // Find user's employee record
  const employee = await prisma.employee.findUnique({
    where: { userId: currentUser.userId || currentUser.id },
    select: { id: true, firstName: true, lastName: true },
  })

  const [pendingRequests, pendingAllocations, approvedToday, allTypes] = await Promise.all([
    prisma.timeOffRequest.count({ where: { status: 'PENDING' } }),
    prisma.timeOffAllocation.count({ where: { status: 'DRAFT' } }),
    prisma.timeOffRequest.count({
      where: {
        status: 'APPROVED',
        updatedAt: { gte: startOfToday },
      },
    }),
    prisma.timeOffType.findMany({ where: { active: true } }),
  ])

  let myBalance = []
  if (employee) {
    const allocations = await prisma.timeOffAllocation.findMany({
      where: {
        employeeId: employee.id,
        status: 'APPROVED',
      },
      include: { type: true },
    })

    myBalance = allocations.map((a) => ({
      typeId: a.typeId,
      typeName: a.type.name,
      unit: a.type.unit,
      displayColor: a.type.displayColor,
      allocated: a.allocated,
      taken: a.taken,
      remaining: Math.max(0, a.allocated - a.taken),
      status: a.status,
    }))
  }

  // If HR user, also prepare team overview counts
  let teamBalances = []
  if (currentUser.role !== 'EMPLOYEE') {
    const activeAllocations = await prisma.timeOffAllocation.findMany({
      where: { status: 'APPROVED' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        type: true,
      },
      orderBy: { employee: { firstName: 'asc' } },
    })
    teamBalances = activeAllocations.map((a) => ({
      id: a.id,
      employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
      employeeNumber: a.employee.employeeNumber,
      typeName: a.type.name,
      unit: a.type.unit,
      displayColor: a.type.displayColor,
      allocated: a.allocated,
      taken: a.taken,
      remaining: Math.max(0, a.allocated - a.taken),
      status: a.status,
    }))
  }

  return {
    pendingRequests,
    pendingAllocations,
    approvedToday,
    myBalance,
    teamBalances,
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  approve,
  refuse,
  getDashboardSummary,
}
