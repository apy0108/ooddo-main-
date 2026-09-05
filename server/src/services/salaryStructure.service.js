const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

const getAll = async (filters = {}) => {
  const { active, search } = filters

  const where = {}
  if (active !== undefined && active !== '') {
    where.active = active === 'true' || active === true
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  return prisma.salaryStructure.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          rules: true,
          contracts: true,
          payruns: true,
        },
      },
    },
  })
}

const getOne = async (id) => {
  const structure = await prisma.salaryStructure.findUnique({
    where: { id },
    include: {
      rules: {
        orderBy: { sequence: 'asc' },
      },
      _count: {
        select: {
          rules: true,
          contracts: true,
          payruns: true,
        },
      },
    },
  })

  if (!structure) {
    throw new AppError('Salary structure not found', 404)
  }

  return structure
}

const create = async (data) => {
  const { name, code, description, active = true } = data

  if (!name || !name.trim()) throw new AppError('Structure name is required', 400)
  if (!code || !code.trim()) throw new AppError('Structure code is required', 400)

  const formattedCode = code.trim().toUpperCase()

  // Rule S1: Structure code must be UNIQUE across all structures
  const existingCode = await prisma.salaryStructure.findUnique({
    where: { code: formattedCode },
  })
  if (existingCode) {
    throw new AppError(`A salary structure with code "${formattedCode}" already exists.`, 400)
  }

  const existingName = await prisma.salaryStructure.findUnique({
    where: { name: name.trim() },
  })
  if (existingName) {
    throw new AppError(`A salary structure with name "${name.trim()}" already exists.`, 400)
  }

  return prisma.salaryStructure.create({
    data: {
      name: name.trim(),
      code: formattedCode,
      description: description ? description.trim() : null,
      active: active === true || active === 'true',
    },
    include: {
      _count: { select: { rules: true } },
    },
  })
}

const update = async (id, data) => {
  const structure = await prisma.salaryStructure.findUnique({
    where: { id },
    include: { _count: { select: { payslips: true } } },
  })

  if (!structure) {
    throw new AppError('Salary structure not found', 404)
  }

  const updateData = {}

  if (data.name !== undefined) {
    const trimmedName = data.name.trim()
    if (!trimmedName) throw new AppError('Structure name cannot be empty', 400)
    if (trimmedName !== structure.name) {
      const conflict = await prisma.salaryStructure.findUnique({ where: { name: trimmedName } })
      if (conflict) throw new AppError(`Structure name "${trimmedName}" is already in use`, 400)
    }
    updateData.name = trimmedName
  }

  if (data.code !== undefined) {
    const formattedCode = data.code.trim().toUpperCase()
    if (!formattedCode) throw new AppError('Structure code cannot be empty', 400)
    if (formattedCode !== structure.code) {
      if (structure._count?.payslips > 0) {
        throw new AppError('Cannot change structure code because payslips already reference this structure', 400)
      }
      const conflict = await prisma.salaryStructure.findUnique({ where: { code: formattedCode } })
      if (conflict) throw new AppError(`Structure code "${formattedCode}" is already in use`, 400)
      updateData.code = formattedCode
    }
  }

  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null
  }

  if (data.active !== undefined) {
    updateData.active = Boolean(data.active)
  }

  return prisma.salaryStructure.update({
    where: { id },
    data: updateData,
    include: {
      rules: { orderBy: { sequence: 'asc' } },
      _count: { select: { rules: true, contracts: true } },
    },
  })
}

const toggle = async (id) => {
  const structure = await prisma.salaryStructure.findUnique({ where: { id } })
  if (!structure) throw new AppError('Salary structure not found', 404)

  return prisma.salaryStructure.update({
    where: { id },
    data: { active: !structure.active },
  })
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  toggle,
}
