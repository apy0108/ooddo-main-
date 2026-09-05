const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

const getAll = async (filters = {}, currentUser = {}) => {
  const { employeeId, typeId, status, search } = filters

  const where = {}

  // If user is a regular employee, only show their own allocations
  if (currentUser.role === 'EMPLOYEE') {
    const emp = await prisma.employee.findUnique({
      where: { userId: currentUser.userId || currentUser.id },
      select: { id: true },
    })
    if (!emp) return []
    where.employeeId = emp.id
  } else if (employeeId) {
    where.employeeId = employeeId
  }

  if (typeId) where.typeId = typeId
  if (status) where.status = status

  if (search) {
    where.OR = [
      { employee: { firstName: { contains: search, mode: 'insensitive' } } },
      { employee: { lastName: { contains: search, mode: 'insensitive' } } },
      { employee: { employeeNumber: { contains: search, mode: 'insensitive' } } },
      { type: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  return prisma.timeOffAllocation.findMany({
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
  const allocation = await prisma.timeOffAllocation.findUnique({
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

  if (!allocation) throw new AppError('Allocation not found', 404)

  if (currentUser.role === 'EMPLOYEE' && allocation.employee.userId !== (currentUser.userId || currentUser.id)) {
    throw new AppError('Access denied: You may only view your own allocations.', 403)
  }

  return allocation
}

const create = async (data) => {
  const { employeeId, typeId, allocated, validity, description } = data

  if (!employeeId) throw new AppError('Employee is required', 400)
  if (!typeId) throw new AppError('Time off type is required', 400)
  if (allocated === undefined || allocated === null || Number(allocated) <= 0) {
    throw new AppError('Allocated amount must be greater than 0', 400)
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!employee) throw new AppError('Employee not found', 404)

  const type = await prisma.timeOffType.findUnique({ where: { id: typeId } })
  if (!type) throw new AppError('Time off type not found', 404)

  return prisma.timeOffAllocation.create({
    data: {
      employeeId,
      typeId,
      allocated: Number(allocated),
      taken: 0,
      validity: validity || null,
      description: description || null,
      status: 'DRAFT',
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
    },
  })
}

const approve = async (id, approverId) => {
  const allocation = await prisma.timeOffAllocation.findUnique({ where: { id } })
  if (!allocation) throw new AppError('Allocation not found', 404)
  if (allocation.status === 'APPROVED') throw new AppError('Allocation is already approved', 400)

  return prisma.timeOffAllocation.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approverId,
      taken: 0,
    },
    include: {
      employee: true,
      type: true,
      approver: {
        select: {
          id: true,
          email: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })
}

const refuse = async (id, approverId, refuseReason) => {
  const allocation = await prisma.timeOffAllocation.findUnique({ where: { id } })
  if (!allocation) throw new AppError('Allocation not found', 404)

  const descNote = refuseReason
    ? (allocation.description ? `${allocation.description}\n[Refused: ${refuseReason}]` : `[Refused: ${refuseReason}]`)
    : allocation.description

  return prisma.timeOffAllocation.update({
    where: { id },
    data: {
      status: 'REFUSED',
      approverId,
      description: descNote,
    },
    include: {
      employee: true,
      type: true,
      approver: {
        select: {
          id: true,
          email: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })
}

const getBalance = async (employeeId, typeId) => {
  const allocation = await prisma.timeOffAllocation.findFirst({
    where: {
      employeeId,
      typeId,
      status: 'APPROVED',
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!allocation) {
    return { allocated: 0, taken: 0, remaining: 0 }
  }

  const remaining = Math.max(0, allocation.allocated - allocation.taken)
  return {
    allocated: allocation.allocated,
    taken: allocation.taken,
    remaining,
    validity: allocation.validity,
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  approve,
  refuse,
  getBalance,
}
