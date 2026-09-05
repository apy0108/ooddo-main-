const router = require('express').Router()
const ctrl = require('../controllers/employee.controller')
const { authenticateToken, isHROrAbove, isAdmin } = require('../middleware/auth')
const prisma = require('../config/prisma')

router.use(authenticateToken)

router.get('/', isHROrAbove, ctrl.list)
router.post('/', isHROrAbove, ctrl.create)
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

