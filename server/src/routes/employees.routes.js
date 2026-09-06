const router = require('express').Router()
const ctrl = require('../controllers/employee.controller')
const { authenticateToken, isHROrAbove, isAdmin } = require('../middleware/auth')
const prisma = require('../config/prisma')

router.use(authenticateToken)

router.get('/', isHROrAbove, ctrl.list)
router.post('/', isHROrAbove, ctrl.create)

// Employee self-service: GET own profile
router.get('/me', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id
    let emp = await prisma.employee.findFirst({
      where: { userId },
      include: {
        department:      { select: { id: true, name: true } },
        jobPosition:     { select: { id: true, title: true } },
        workingSchedule: { select: { id: true, name: true } },
        manager:         { select: { id: true, firstName: true, lastName: true } },
        user:            { select: { id: true, email: true, role: true } },
      },
    })
    if (!emp && userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.email) {
        emp = await prisma.employee.findFirst({
          where: { email: { equals: user.email, mode: 'insensitive' } },
          include: {
            department:      { select: { id: true, name: true } },
            jobPosition:     { select: { id: true, title: true } },
            workingSchedule: { select: { id: true, name: true } },
            manager:         { select: { id: true, firstName: true, lastName: true } },
            user:            { select: { id: true, email: true, role: true } },
          },
        })
      }
    }
    if (!emp) return res.status(404).json({ success: false, message: 'Employee record not found for your account' })
    return res.json({ success: true, data: emp })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// Employee self-service: GET own counts
router.get('/me/counts', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id
    let emp = await prisma.employee.findFirst({ where: { userId } })
    if (!emp && userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.email) {
        emp = await prisma.employee.findFirst({
          where: { email: { equals: user.email, mode: 'insensitive' } },
        })
      }
    }
    if (!emp) return res.status(404).json({ success: false, message: 'Employee record not found' })
    const [contracts, attendance, timeOffRequests, payslips] = await Promise.all([
      prisma.contract.count({ where: { employeeId: emp.id } }),
      prisma.attendance.count({ where: { employeeId: emp.id } }),
      prisma.timeOffRequest.count({ where: { employeeId: emp.id } }),
      prisma.payslip.count({ where: { employeeId: emp.id } }),
    ])
    return res.json({ success: true, data: { contracts, attendance, timeOffRequests, payslips } })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/:id', isHROrAbove, ctrl.getOne)
router.put('/:id', isHROrAbove, ctrl.update)
router.patch('/:id/archive', isHROrAbove, ctrl.archive)
router.get('/:id/counts', isHROrAbove, ctrl.counts)

// ADMIN only: permanently delete employee
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const payslipCount = await prisma.payslip.count({
      where: { employeeId: req.params.id },
    })
    if (payslipCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete employee — ${payslipCount} payslip(s) exist. Deactivate instead.`,
      })
    }

    await prisma.employee.delete({ where: { id: req.params.id } })
    return res.json({ success: true, message: 'Employee deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router

