const router = require('express').Router()
const ctrl = require('../controllers/auth.controller')
const { authenticateToken, requireRole } = require('../middleware/auth')

const canManageUsers = requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER')

router.use(authenticateToken)
router.use(canManageUsers)

router.get('/', ctrl.getUsers)
router.post('/', requireRole('ADMIN'), ctrl.createUser)
router.put('/:id', ctrl.updateUser)
router.put('/:id/role', ctrl.updateUser)

module.exports = router
