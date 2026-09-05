const prisma = require('./src/config/prisma')
require('dotenv').config()

async function test() {
  try {
    const emp = await prisma.employee.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, departmentId: true },
    })
    console.log('Employee:', emp.id, emp.firstName)

    const c = await prisma.contract.create({
      data: {
        contractRef: 'CON/TEST/999',
        employeeId: emp.id,
        startDate: new Date('2035-01-01'),
        endDate: new Date('2035-12-31'),
        wage: 50000,
        wageType: 'MONTHLY',
        contractType: 'FULL_TIME',
        status: 'DRAFT',
        departmentId: emp.departmentId || null,
      },
    })
    console.log('SUCCESS - Contract created:', c.contractRef, '| dept:', c.departmentId)

    await prisma.contract.delete({ where: { id: c.id } })
    console.log('Cleaned up test contract.')
  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
