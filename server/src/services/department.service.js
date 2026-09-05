const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

const getAll = () => prisma.department.findMany({
  orderBy: { name: 'asc' },
  include: { _count: { select: { employees: true } } },
})

const create = (data) => prisma.department.create({ data })

const update = (id, data) => prisma.department.update({ where: { id }, data })

const remove = async (id) => {
  const dept = await prisma.department.findUnique({
    where: { id }, include: { _count: { select: { employees: true } } }
  })
  if (!dept) throw new AppError('Department not found', 404)
  if (dept._count.employees > 0)
    throw new AppError('Cannot delete a department that has employees', 400)
  return prisma.department.delete({ where: { id } })
}

module.exports = { getAll, create, update, remove }
