const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

const CORE_RULE_CODES = ['BASIC', 'GROS', 'GROSS', 'NET']

const getAll = async (filters = {}) => {
  const { structureId, category, search } = filters

  const where = {}
  if (structureId) where.structureId = structureId
  if (category) where.category = category

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { structure: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  return prisma.salaryRule.findMany({
    where,
    orderBy: [{ structureId: 'asc' }, { sequence: 'asc' }],
    include: {
      structure: {
        select: {
          id: true,
          name: true,
          code: true,
          active: true,
        },
      },
    },
  })
}

const getOne = async (id) => {
  const rule = await prisma.salaryRule.findUnique({
    where: { id },
    include: {
      structure: true,
    },
  })

  if (!rule) throw new AppError('Salary rule not found', 404)
  return rule
}

const validateRuleData = async (data, currentRuleId = null) => {
  const {
    structureId,
    code,
    category,
    amountType,
    amount,
    percentage,
    percentageBase,
    sequence,
  } = data

  if (!structureId) throw new AppError('Structure ID is required', 400)
  if (!data.name || !data.name.trim()) throw new AppError('Rule name is required', 400)
  if (!code || !code.trim()) throw new AppError('Rule code is required', 400)
  if (sequence === undefined || sequence === null || isNaN(sequence)) {
    throw new AppError('Sequence number is required', 400)
  }

  const formattedCode = code.trim().toUpperCase()
  const seqNum = Number(sequence)

  // Rule S2: Sequence unique within structure
  const existingSeq = await prisma.salaryRule.findFirst({
    where: {
      structureId,
      sequence: seqNum,
      ...(currentRuleId ? { NOT: { id: currentRuleId } } : {}),
    },
  })
  if (existingSeq) {
    throw new AppError(`Sequence ${seqNum} is already used by rule "${existingSeq.name}" in this structure.`, 400)
  }

  // Code unique within structure
  const existingCode = await prisma.salaryRule.findFirst({
    where: {
      structureId,
      code: formattedCode,
      ...(currentRuleId ? { NOT: { id: currentRuleId } } : {}),
    },
  })
  if (existingCode) {
    throw new AppError(`Rule code "${formattedCode}" already exists in this structure.`, 400)
  }

  // Rule S3: PERCENTAGE requires percentageBase
  if (amountType === 'PERCENTAGE') {
    if (!percentage || isNaN(percentage) || Number(percentage) <= 0) {
      throw new AppError('Percentage must be a positive number', 400)
    }
    if (!percentageBase) {
      throw new AppError('Please select what this percentage is based on', 400)
    }
  }

  // FIXED requires amount > 0
  if (amountType === 'FIXED') {
    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) < 0) {
      throw new AppError('Fixed amount must be a positive number', 400)
    }
  }

  // COMPUTED only allowed for GROSS and NET
  if (amountType === 'COMPUTED') {
    if (!['GROSS', 'NET'].includes(category)) {
      throw new AppError('Auto-Computed type is only allowed for GROSS or NET categories', 400)
    }
  }

  // CONTRACT_WAGE only allowed for BASIC
  if (amountType === 'CONTRACT_WAGE') {
    if (category !== 'BASIC') {
      throw new AppError('Contract Wage amount type is only allowed for BASIC category', 400)
    }
  }

  // Rule S5: Unique GROSS and NET per structure
  if (category === 'GROSS' || category === 'NET') {
    const existingCat = await prisma.salaryRule.findFirst({
      where: {
        structureId,
        category,
        ...(currentRuleId ? { NOT: { id: currentRuleId } } : {}),
      },
    })
    if (existingCat) {
      throw new AppError(`Structure already has a ${category} rule ("${existingCat.name}"). Only one is allowed.`, 400)
    }
  }

  return { formattedCode, seqNum }
}

const create = async (data) => {
  const { formattedCode, seqNum } = await validateRuleData(data)

  return prisma.salaryRule.create({
    data: {
      structureId: data.structureId,
      name: data.name.trim(),
      code: formattedCode,
      category: data.category,
      amountType: data.amountType,
      amount: data.amountType === 'FIXED' ? parseFloat(data.amount) : null,
      percentage: data.amountType === 'PERCENTAGE' ? parseFloat(data.percentage) : null,
      percentageBase: data.amountType === 'PERCENTAGE' ? data.percentageBase : null,
      sequence: seqNum,
      active: data.active !== undefined ? Boolean(data.active) : true,
    },
    include: {
      structure: { select: { id: true, name: true, code: true } },
    },
  })
}

const update = async (id, data) => {
  const current = await prisma.salaryRule.findUnique({ where: { id } })
  if (!current) throw new AppError('Salary rule not found', 404)

  const merged = {
    structureId: data.structureId || current.structureId,
    name: data.name !== undefined ? data.name : current.name,
    code: data.code !== undefined ? data.code : current.code,
    category: data.category !== undefined ? data.category : current.category,
    amountType: data.amountType !== undefined ? data.amountType : current.amountType,
    amount: data.amount !== undefined ? data.amount : current.amount,
    percentage: data.percentage !== undefined ? data.percentage : current.percentage,
    percentageBase: data.percentageBase !== undefined ? data.percentageBase : current.percentageBase,
    sequence: data.sequence !== undefined ? data.sequence : current.sequence,
    active: data.active !== undefined ? data.active : current.active,
  }

  const { formattedCode, seqNum } = await validateRuleData(merged, id)

  return prisma.salaryRule.update({
    where: { id },
    data: {
      name: merged.name.trim(),
      code: formattedCode,
      category: merged.category,
      amountType: merged.amountType,
      amount: merged.amountType === 'FIXED' ? parseFloat(merged.amount) : null,
      percentage: merged.amountType === 'PERCENTAGE' ? parseFloat(merged.percentage) : null,
      percentageBase: merged.amountType === 'PERCENTAGE' ? merged.percentageBase : null,
      sequence: seqNum,
      active: Boolean(merged.active),
    },
    include: {
      structure: { select: { id: true, name: true, code: true } },
    },
  })
}

const deleteRule = async (id) => {
  const rule = await prisma.salaryRule.findUnique({ where: { id } })
  if (!rule) throw new AppError('Salary rule not found', 404)

  // Rule S7: Core rules (BASIC, GROSS, NET) cannot be deleted
  if (CORE_RULE_CODES.includes(rule.code.toUpperCase()) || ['BASIC', 'GROSS', 'NET'].includes(rule.category)) {
    throw new AppError('Core rules (BASIC, GROSS, NET) cannot be deleted.', 400)
  }

  return prisma.salaryRule.delete({ where: { id } })
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  delete: deleteRule,
}
