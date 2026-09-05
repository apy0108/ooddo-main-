const router = require('express').Router()
const ctrl = require('../controllers/attendance.controller')
const { authenticateToken, requireRole, isHROrAbove } = require('../middleware/auth')

// Rule A2: Manual edit strictly restricted to HR_MANAGER, HR_PAYROLL_MANAGER, ADMIN
const canManualEditAttendance = requireRole('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN')

router.use(authenticateToken)

// Self-service widget routes (accessible to all logged-in employees)
router.get('/today', ctrl.todaySession)
router.post('/checkin', ctrl.checkIn)
router.post('/checkout', ctrl.checkOut)

// Attendance listing & detail (EMPLOYEE sees own, HR/Admin sees all)
router.get('/', ctrl.list)
router.get('/:id', ctrl.getOne)

// Manual record creation (HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN)
router.post('/', isHROrAbove, ctrl.createManual)

// Rule A2: Manual edit attendance record
router.put('/:id', canManualEditAttendance, ctrl.update)

// Midnight auto-absent trigger (Admins / HR Managers)
router.post('/auto-absent', canManualEditAttendance, ctrl.autoAbsent)

module.exports = router
