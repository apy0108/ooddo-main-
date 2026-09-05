const router = require('express').Router()
const prisma = require('../config/prisma')
const { authenticateToken } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')

// List employees for dropdowns and general access
router.get('/', authenticateToken, async (req, res) => {
  const employees = await prisma.employee.findMany({
    orderBy: { employeeNumber: 'asc' },
    include: {
      department: { select: { id: true, name: true } },
      jobPosition: { select: { id: true, title: true } },
      user: { select: { id: true, email: true, role: true } },
    },
  })
  return success(res, employees)
})

module.exports = router
