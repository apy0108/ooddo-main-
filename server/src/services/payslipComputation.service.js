const prisma = require('../config/prisma')
const { evaluateFormula } = require('./formulaEvaluator.service')
const { getWorkedDays } = require('./payrollAttendance.service')

/**
 * Compute single payslip
 */
async function computePayslip(payslipId) {
  // Step 1: Load payslip with employee, structure, payrun
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: true,
      salaryStructure: true,
      payrun: true,
    },
  })
  if (!payslip) throw new Error('Payslip not found')

  if (payslip.status === 'PAID') {
    throw new Error('Cannot recompute a PAID payslip')
  }
  if (payslip.payrun && payslip.payrun.status === 'VALIDATED') {
    throw new Error('Cannot recompute payslip in a VALIDATED payrun')
  }

  // Step 2: Load employee's ACTIVE contract → contractWage
  const contract = await prisma.contract.findFirst({
    where: { employeeId: payslip.employeeId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  })
  const contractWage = contract ? contract.wage : 0

  // Step 3: Get worked days from attendance
  const { workedDays, totalDays } = await getWorkedDays(
    payslip.employeeId,
    payslip.periodStart,
    payslip.periodEnd
  )

  // Step 4: Load all ACTIVE salary rules for structure, ordered by sequence
  const rules = await prisma.salaryRule.findMany({
    where: {
      structureId: payslip.salaryStructureId,
      active: true,
    },
    orderBy: { sequence: 'asc' },
  })

  // Step 5: Calculate each rule in sequence order
  const categories = {}
  const lines = []

  for (const rule of rules) {
    let amount = 0

    if (rule.amountType === 'FIXED') {
      amount = rule.amount || 0
    } else if (rule.amountType === 'PERCENTAGE') {
      let base = 0
      if (rule.percentageBase === 'BASIC') base = categories['BASIC'] || 0
      else if (rule.percentageBase === 'GROSS') base = categories['GROS'] || 0
      else if (rule.percentageBase === 'CONTRACT_WAGE') base = contractWage
      amount = Math.round(((rule.percentage || 0) / 100) * base)
    } else if (rule.amountType === 'CONTRACT_WAGE') {
      amount = contractWage
    } else if (rule.amountType === 'FORMULA') {
      amount = evaluateFormula(rule.formulaCode, {
        categories,
        workedDays,
        totalDays,
        contractWage,
      })
    } else if (rule.amountType === 'COMPUTED') {
      if (rule.category === 'GROSS') {
        amount = lines
          .filter((l) => ['BASIC', 'ALLOWANCE'].includes(l.category))
          .reduce((sum, l) => sum + l.amount, 0)
      } else if (rule.category === 'NET') {
        const gross = categories['GROS'] || 0
        const totalDed = lines
          .filter((l) => l.category === 'DEDUCTION')
          .reduce((sum, l) => sum + Math.abs(l.amount), 0)
        amount = gross - totalDed
      }
    }

    const displayAmount = rule.category === 'DEDUCTION' ? -Math.abs(amount) : Math.abs(amount)
    categories[rule.code] = Math.abs(amount)

    lines.push({
      payslipId,
      ruleName: rule.name,
      ruleCode: rule.code,
      category: rule.category,
      amount: displayAmount,
      sequence: rule.sequence,
    })
  }

  // Step 6: Build summary
  const basic = categories['BASIC'] || 0
  const gross = categories['GROS'] || 0
  const net = categories['NET'] || 0
  const deductions = lines
    .filter((l) => l.category === 'DEDUCTION')
    .reduce((sum, l) => sum + Math.abs(l.amount), 0)

  // Step 7: Detect warnings
  const warnings = []
  const employee = await prisma.employee.findUnique({ where: { id: payslip.employeeId } })
  if (!employee?.bankAccountNo && !employee?.bankAccountNumber) {
    warnings.push('A/C missing')
  }

  const duplicate = await prisma.payslip.findFirst({
    where: {
      employeeId: payslip.employeeId,
      periodStart: payslip.periodStart,
      id: { not: payslipId },
      status: { in: ['COMPUTED', 'DONE', 'PAID'] },
    },
  })
  if (duplicate) {
    warnings.push('Duplicate')
  }

  // Step 8: Save everything in ONE Prisma transaction
  await prisma.$transaction([
    prisma.payslipLine.deleteMany({ where: { payslipId } }),
    prisma.payslipLine.createMany({ data: lines }),
    prisma.payslip.update({
      where: { id: payslipId },
      data: {
        basic,
        gross,
        deductions,
        net,
        workedDays,
        totalDays,
        warnings,
        status: 'COMPUTED',
      },
    }),
  ])

  // Step 9: Return updated payslip with lines
  return prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      lines: { orderBy: { sequence: 'asc' } },
      employee: { include: { user: true, department: true, jobPosition: true } },
      salaryStructure: true,
      payrun: true,
    },
  })
}

/**
 * Compute all payslips in a payrun sequentially
 */
async function computeAllPayslips(payrunId) {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: { payslips: true },
  })
  if (!payrun) throw new Error('Payrun not found')
  if (payrun.status === 'PAID') throw new Error('Cannot recompute a PAID payrun')
  if (payrun.status === 'VALIDATED') throw new Error('Cannot recompute a VALIDATED payrun')

  let computed = 0
  const errors = []

  for (const ps of payrun.payslips) {
    try {
      await computePayslip(ps.id)
      computed++
    } catch (err) {
      console.error(`Error computing payslip ${ps.id}:`, err)
      errors.push({ payslipId: ps.id, error: err.message })
    }
  }

  await prisma.payrun.update({
    where: { id: payrunId },
    data: { status: 'COMPUTED' },
  })

  return { computed, errors }
}

module.exports = {
  computePayslip,
  computeAllPayslips,
}
