const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

/**
 * CALCULATION ENGINE:
 * calculatePayslip(employeeId, structureId, workedDays, totalDaysInMonth)
 * Evaluates salary rules sequentially and produces a line-by-line breakdown
 * with basic, gross, deductions, net, and contractWage.
 */
const calculatePayslip = async (employeeId, structureId, workedDays = 30, totalDaysInMonth = 30) => {
  if (!employeeId) throw new AppError('Employee ID is required', 400)
  if (!structureId) throw new AppError('Structure ID is required', 400)

  // Step 1: Get employee's ACTIVE contract
  const contract = await prisma.contract.findFirst({
    where: { employeeId, status: 'ACTIVE' },
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

  if (!contract) {
    throw new AppError('No active running contract found for this employee', 404)
  }

  const contractWage = contract.wage // Employee salary set by HR

  // Step 2: Get all ACTIVE rules for structureId, ordered by sequence
  const rules = await prisma.salaryRule.findMany({
    where: { structureId, active: true },
    orderBy: { sequence: 'asc' },
  })

  if (!rules || rules.length === 0) {
    throw new AppError('No active salary rules configured for this structure', 400)
  }

  // Step 3: Loop through rules and calculate each line
  const results = {} // stores computed amounts by rule code
  const lines = []

  for (const rule of rules) {
    let lineAmount = 0

    switch (rule.amountType) {
      case 'CONTRACT_WAGE':
        // Basic salary = employee's contract wage
        lineAmount = contractWage
        break

      case 'FIXED':
        lineAmount = rule.amount || 0
        break

      case 'PERCENTAGE':
        let base = 0
        if (rule.percentageBase === 'BASIC') {
          base = results['BASIC'] || 0
        } else if (rule.percentageBase === 'GROSS') {
          base = results['GROS'] || 0
        } else if (rule.percentageBase === 'CONTRACT_WAGE') {
          base = contractWage
        }
        lineAmount = Math.round(((rule.percentage || 0) / 100) * base)
        break

      case 'COMPUTED':
        if (rule.category === 'GROSS') {
          // GROSS = sum of all BASIC + ALLOWANCE lines computed so far
          lineAmount = lines
            .filter((l) => ['BASIC', 'ALLOWANCE'].includes(l.category))
            .reduce((sum, l) => sum + l.amount, 0)
        } else if (rule.category === 'NET') {
          // NET = GROSS - sum of all DEDUCTION lines computed so far
          const gross = results['GROS'] || 0
          const totalDeductions = lines
            .filter((l) => l.category === 'DEDUCTION')
            .reduce((sum, l) => sum + l.amount, 0)
          lineAmount = gross - totalDeductions
        }
        break

      default:
        lineAmount = 0
    }

    results[rule.code] = lineAmount

    lines.push({
      ruleId: rule.id,
      ruleName: rule.name,
      ruleCode: rule.code,
      category: rule.category,
      amountType: rule.amountType,
      amount: lineAmount,
      sequence: rule.sequence,
    })
  }

  // Step 4: Build summary
  const basic = results['BASIC'] || 0
  const gross = results['GROS'] || 0
  const net = results['NET'] || 0
  const deductions = lines
    .filter((l) => l.category === 'DEDUCTION')
    .reduce((sum, l) => sum + l.amount, 0)

  // Step 5: Return
  return {
    contract,
    contractWage,
    lines,
    basic,
    gross,
    deductions,
    net,
    workedDays,
    totalDaysInMonth,
  }
}

module.exports = {
  calculatePayslip,
}
