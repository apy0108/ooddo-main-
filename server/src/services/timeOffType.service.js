const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

const getAll = async () => {
  return prisma.timeOffType.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          allocations: true,
          requests: true,
        },
      },
    },
  })
}

const getOne = async (id) => {
  const type = await prisma.timeOffType.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          allocations: true,
          requests: true,
        },
      },
    },
  })
  if (!type) throw new AppError('Time off type not found', 404)
  return type
}

const create = async (data) => {
  const existing = await prisma.timeOffType.findUnique({
    where: { name: data.name },
  })
  if (existing) throw new AppError('A time off type with this name already exists', 400)

  return prisma.timeOffType.create({
    data: {
      name: data.name,
      unit: data.unit || 'DAYS',
      requiresAllocation: data.requiresAllocation !== undefined ? Boolean(data.requiresAllocation) : true,
      approval: data.approval || 'MANAGER',
      payrollWorkEntry: data.payrollWorkEntry || null,
      displayColor: data.displayColor || 'blue',
      configNotes: data.configNotes || null,
      active: data.active !== undefined ? Boolean(data.active) : true,
    },
  })
}

const update = async (id, data) => {
  await getOne(id)

  if (data.name) {
    const duplicate = await prisma.timeOffType.findFirst({
      where: { name: data.name, id: { not: id } },
    })
    if (duplicate) throw new AppError('A time off type with this name already exists', 400)
  }

  return prisma.timeOffType.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.unit && { unit: data.unit }),
      ...(data.requiresAllocation !== undefined && { requiresAllocation: Boolean(data.requiresAllocation) }),
      ...(data.approval && { approval: data.approval }),
      ...(data.payrollWorkEntry !== undefined && { payrollWorkEntry: data.payrollWorkEntry }),
      ...(data.displayColor !== undefined && { displayColor: data.displayColor }),
      ...(data.configNotes !== undefined && { configNotes: data.configNotes }),
      ...(data.active !== undefined && { active: Boolean(data.active) }),
    },
  })
}

const toggle = async (id) => {
  const type = await getOne(id)
  return prisma.timeOffType.update({
    where: { id },
    data: { active: !type.active },
  })
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  toggle,
}
