const jwt = require('jsonwebtoken')
const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const asyncHandler = require('../utils/asyncHandler')

const authenticateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) throw new AppError('Access token required', 401)

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    throw new AppError('Invalid or expired access token', 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, role: true, isActive: true },
  })

  if (!user) throw new AppError('User not found', 401)
  if (!user.isActive) throw new AppError('Account deactivated', 403)

  req.user = { userId: user.id, role: user.role }
  next()
})

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401))
  if (!roles.includes(req.user.role))
    return next(new AppError('You do not have permission to perform this action', 403))
  next()
}

// Convenience role guards
const isAdmin = requireRole('ADMIN')
const isHROrAbove = requireRole('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN')
const isPayrollOrAbove = requireRole('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN')
const isPayrollManager = requireRole('HR_PAYROLL_MANAGER', 'ADMIN')

module.exports = { authenticateToken, requireRole, isAdmin, isHROrAbove, isPayrollOrAbove, isPayrollManager }
