const authService = require('../services/auth.service')
const { success } = require('../utils/apiResponse')

const COOKIE_OPTS = (rememberMe) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: rememberMe
    ? 30 * 24 * 60 * 60 * 1000   // 30 days
    : 7 * 24 * 60 * 60 * 1000,   // 7 days
})

const login = async (req, res) => {
  const { email, password, rememberMe } = req.body
  const result = await authService.login({ email, password, rememberMe })
  res.cookie('refreshToken', result.refreshToken, COOKIE_OPTS(rememberMe))
  return success(res, { accessToken: result.accessToken, user: result.user })
}

const logout = async (req, res) => {
  res.clearCookie('refreshToken')
  return success(res, { message: 'Logged out successfully' })
}

const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken
  const result = await authService.refresh(token)
  return success(res, result)
}

const me = async (req, res) => {
  const user = await authService.getMe(req.user.userId)
  return success(res, user)
}

const forgotPassword = async (req, res) => {
  const result = await authService.forgotPassword(req.body.email)
  return success(res, result)
}

const resetPassword = async (req, res) => {
  const result = await authService.resetPassword(
    req.body.token,
    req.body.password
  )
  return success(res, result)
}

const getUsers = async (req, res) => {
  const users = await authService.getAllUsers()
  return success(res, users)
}

const createUser = async (req, res) => {
  const user = await authService.createUser(req.body, req.user.userId)
  return success(res, user, 201)
}

const updateUser = async (req, res) => {
  const user = await authService.updateUser(req.params.id, req.body, req.user.userId)
  return success(res, user)
}

module.exports = { login, logout, refresh, me, forgotPassword, resetPassword,
                   getUsers, createUser, updateUser }
