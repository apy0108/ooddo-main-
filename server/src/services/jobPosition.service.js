const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

const getAll = () => prisma.jobPosition.findMany({
  orderBy: { title: 'asc' },
  include: { _count: { select: { employees: true } } },
})

const create = (data) => prisma.jobPosition.create({ data })

const update = (id, data) => prisma.jobPosition.update({ where: { id }, data })

const remove = async (id) => {
  const pos = await prisma.jobPosition.findUnique({
    where: { id }, include: { _count: { select: { employees: true } } }
  })
  if (!pos) throw new AppError('Job position not found', 404)
  if (pos._count.employees > 0)
    throw new AppError('Cannot delete a job position that has employees', 400)
  return prisma.jobPosition.delete({ where: { id } })
}

module.exports = { getAll, create, update, remove }
