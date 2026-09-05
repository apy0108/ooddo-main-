const prisma = require('./src/config/prisma')
const { calculatePayslip } = require('./src/services/salaryCalculation.service')

async function runTest() {
  console.log('🧪 Testing Phase 7 Calculation Engine & Rules...')

  // 1. Find Vikram Nair
  const vikram = await prisma.employee.findFirst({
    where: { email: 'vikram.nair@company.com' },
    include: { contracts: { where: { status: 'ACTIVE' } } }
  })
  console.log('Vikram Nair:', vikram ? `${vikram.firstName} ${vikram.lastName}, Contract Wage: ₹${vikram.contracts[0]?.wage}` : 'Not found')

  // 2. Find Regular Salary structure
  const regularStructure = await prisma.salaryStructure.findUnique({
    where: { code: 'REG' },
    include: { rules: { orderBy: { sequence: 'asc' } } }
  })
  console.log(`Regular Salary Structure: ${regularStructure?.name} (${regularStructure?.rules?.length} rules)`)

  if (!vikram || !regularStructure) {
    throw new Error('Vikram or Regular Salary structure missing!')
  }

  // 3. Test calculation engine
  const preview = await calculatePayslip(vikram.id, regularStructure.id, 30, 30)
  console.log('\n📊 Calculation Breakdown:')
  for (const line of preview.lines) {
    console.log(`   #${line.sequence} ${line.ruleName.padEnd(24)} [${line.category.padEnd(10)}] : ₹${line.amount}`)
  }
  console.log('\nSummary:')
  console.log(`   Basic:       ₹${preview.basic}`)
  console.log(`   Gross:       ₹${preview.gross}`)
  console.log(`   Deductions:  ₹${preview.deductions}`)
  console.log(`   Net:         ₹${preview.net}`)

  // Verify Vikram: Wage is ₹6000
  // Basic: ₹6000
  // HRA: 40% of Basic = ₹2400
  // STI: Fixed ₹10000
  // Gross: 6000 + 2400 + 10000 = ₹18400
  // PF: 12% of Basic = ₹720
  // PT: Fixed ₹200
  // Net: 18400 - 720 - 200 = ₹17480
  const expectedGross = 18400
  const expectedNet = 17480
  if (preview.gross === expectedGross && preview.net === expectedNet) {
    console.log('\n✅ Calculation test PASSED EXACTLY!')
  } else {
    throw new Error(`Calculation mismatch! Expected Gross: ${expectedGross}, Net: ${expectedNet}, got Gross: ${preview.gross}, Net: ${preview.net}`)
  }
}

runTest()
  .catch((e) => { console.error('❌ Test failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
