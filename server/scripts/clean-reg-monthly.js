const prisma = require('../src/config/prisma')

async function clean() {
  const reg = await prisma.salaryStructure.findUnique({ where: { code: 'REG' } })
  if (reg) {
    await prisma.payrun.updateMany({
      where: { salaryStructure: { code: 'REG_MONTHLY' } },
      data: { salaryStructureId: reg.id },
    })
    await prisma.contract.updateMany({
      where: { salaryStructure: { code: 'REG_MONTHLY' } },
      data: { salaryStructureId: reg.id },
    })
  }
  await prisma.salaryStructure.deleteMany({ where: { code: 'REG_MONTHLY' } })
  console.log('✅ Reassigned and cleaned old REG_MONTHLY structure')
}

clean()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
