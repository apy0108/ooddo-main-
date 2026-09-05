const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const ctrl = require('../controllers/auth.controller')
const { authenticateToken, isAdmin, requireRole } = require('../middleware/auth')
const canManageUsers = requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Public
router.post('/login', loginLimiter, ctrl.login)
router.post('/logout', ctrl.logout)
router.post('/refresh', ctrl.refresh)
router.post('/forgot-password', ctrl.forgotPassword)
router.post('/reset-password', ctrl.resetPassword)

// Protected
router.get('/me', authenticateToken, ctrl.me)

// User Management (Role Hierarchy Enforced in Service)
router.get('/users', authenticateToken, canManageUsers, ctrl.getUsers)
router.post('/users', authenticateToken, isAdmin, ctrl.createUser)
router.put('/users/:id', authenticateToken, canManageUsers, ctrl.updateUser)
router.put('/users/:id/role', authenticateToken, canManageUsers, ctrl.updateUser)

module.exports = router

