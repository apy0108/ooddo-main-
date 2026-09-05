const vm = require('vm')

function evaluateFormula(expression, context = {}) {
  // context = { categories, workedDays, totalDays, contractWage }
  // expression example: "result = categories['BASIC'] * 0.10"
  // expression example: "result = (worked_days / total_days) * categories['BASIC']"
  // expression example: "result = categories['GROS'] * 0.05"

  const sandbox = {
    categories: context.categories || {},     // { BASIC: 50000, HRA: 20000, ... }
    worked_days: context.workedDays ?? 0,     // actual days from attendance
    total_days: context.totalDays ?? 0,       // total working days in period
    contract_wage: context.contractWage ?? 0,
    result: 0,                                // formula sets this value
  }

  try {
    if (!expression || typeof expression !== 'string') return 0
    vm.runInNewContext(expression, sandbox, { timeout: 1000 })
    return Math.round(sandbox.result || 0)
  } catch (err) {
    console.error(`Formula evaluation error for "${expression}":`, err.message)
    return 0 // safe fallback — log warning but don't crash payrun
  }
}

module.exports = { evaluateFormula }
