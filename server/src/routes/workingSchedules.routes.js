const router = require('express').Router()
const prisma = require('../config/prisma')
const { authenticateToken } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')

router.use(authenticateToken)

router.get('/', async (req, res) => {
  const schedules = await prisma.workingSchedule.findMany({
    orderBy: { name: 'asc' },
    include: { lines: true },
  })
  return success(res, schedules)
})

module.exports = router
