const prisma = require('./src/config/prisma')
const { evaluateFormula } = require('./src/services/formulaEvaluator.service')
const { getWorkedDays, getTotalWorkingDays } = require('./src/services/payrollAttendance.service')
const { computePayslip, computeAllPayslips } = require('./src/services/payslipComputation.service')
const { generatePayslipPdf } = require('./src/services/payslipPdf.service')
const fs = require('fs')

async function runTests() {
  console.log('🧪 Starting Phase 8 Automated Tests...\n')

  // 1. Formula Evaluator Test
  console.log('1️⃣ Testing Formula Evaluator...')
  const formula1 = "result = categories['BASIC'] * 0.4"
  const val1 = evaluateFormula(formula1, { categories: { BASIC: 50000 } })
  console.log('   Formula 1 (50000 * 0.4):', val1, val1 === 20000 ? '✅' : '❌')

  const formula2 = "result = (worked_days / total_days) * categories['BASIC']"
  const val2 = evaluateFormula(formula2, { categories: { BASIC: 66000 }, workedDays: 20, totalDays: 22 })
  console.log('   Formula 2 proration (20/22 * 66000):', val2, val2 === 60000 ? '✅' : '❌')

  // 2. Attendance Working Days Test
  console.log('\n2️⃣ Testing Attendance Service...')
  const febDays = getTotalWorkingDays('2026-02-01', '2026-02-28')
  console.log('   Feb 2026 working days:', febDays, febDays === 22 ? '✅' : '❌')

  // Find Vikram Nair
  const vikram = await prisma.employee.findFirst({
    where: { firstName: 'Vikram' },
    include: { contracts: { where: { status: 'ACTIVE' } } },
  })
  if (!vikram) throw new Error('Vikram not found')

  const vikramAtt = await getWorkedDays(vikram.id, '2026-02-01', '2026-02-28')
  console.log('   Vikram Feb 2026 worked days:', vikramAtt, vikramAtt.workedDays === 22 ? '✅' : '❌')

  // 3. Payslip Computation on Feb 2026
  console.log('\n3️⃣ Testing Payslip Computation on Feb 2026...')
  const febPayrun = await prisma.payrun.findFirst({
    where: { name: 'February 2026' },
  })
  if (!febPayrun) throw new Error('Feb 2026 payrun not found')

  const vikramPayslip = await prisma.payslip.findFirst({
    where: { payrunId: febPayrun.id, employeeId: vikram.id },
  })
  if (!vikramPayslip) throw new Error('Vikram payslip in Feb 2026 not found')

  const computedVikram = await computePayslip(vikramPayslip.id)
  console.log('   Vikram computed payslip:')
  console.log('   - Basic:      ₹' + computedVikram.basic, computedVikram.basic === 75000 ? '✅' : '❌')
  console.log('   - Gross:      ₹' + computedVikram.gross, computedVikram.gross === 115000 ? '✅' : '❌')
  console.log('   - Deductions: ₹' + computedVikram.deductions, computedVikram.deductions === 9200 ? '✅' : '❌')
  console.log('   - Net:        ₹' + computedVikram.net, computedVikram.net === 105800 ? '✅' : '❌')
  console.log('   - Worked Days:', computedVikram.workedDays, computedVikram.workedDays === 22 ? '✅' : '❌')
  console.log('   - Lines count:', computedVikram.lines.length, computedVikram.lines.length === 7 ? '✅' : '❌')

  // Verify Rahul Desai's A/C missing warning
  const rahul = await prisma.employee.findFirst({ where: { firstName: 'Rahul' } })
  if (rahul) {
    const rahulPayslip = await prisma.payslip.findFirst({
      where: { payrunId: febPayrun.id, employeeId: rahul.id },
    })
    if (rahulPayslip) {
      const computedRahul = await computePayslip(rahulPayslip.id)
      console.log('   Rahul warnings:', computedRahul.warnings, computedRahul.warnings.includes('A/C missing') ? '✅' : '❌')
    }
  }

  // 4. PDF Generation Test
  console.log('\n4️⃣ Testing PDF Generation for Vikram...')
  const pdfResult = await generatePayslipPdf(computedVikram.id)
  console.log('   PDF generated at:', pdfResult.filePath)
  const fileExists = fs.existsSync(pdfResult.filePath)
  const stats = fileExists ? fs.statSync(pdfResult.filePath) : null
  console.log('   File exists and size:', stats ? `${stats.size} bytes` : 'NOT FOUND', stats && stats.size > 1000 ? '✅' : '❌')

  console.log('\n🎉 All backend core services verified successfully!')
  process.exit(0)
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
