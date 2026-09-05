const router = require('express').Router()
const dashboardService = require('../services/dashboard.service')
const { authenticateToken, isHROrAbove } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')

router.use(authenticateToken)
router.use(isHROrAbove)

// GET /api/dashboard/filter-options
router.get('/filter-options', async (req, res) => {
  const data = await dashboardService.getFilterOptions()
  return success(res, data)
})

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  const data = await dashboardService.getSummaryCards(req.query)
  return success(res, data)
})

// GET /api/dashboard/salary-by-dept
router.get('/salary-by-dept', async (req, res) => {
  const data = await dashboardService.getSalaryByDepartment(req.query)
  return success(res, data)
})

// GET /api/dashboard/salary-trend
router.get('/salary-trend', async (req, res) => {
  const data = await dashboardService.getSalaryTrend(req.query)
  return success(res, data)
})

// GET /api/dashboard/payslip-status
router.get('/payslip-status', async (req, res) => {
  const data = await dashboardService.getPayslipStatusSplit(req.query)
  return success(res, data)
})

// GET /api/dashboard/attendance
router.get('/attendance', async (req, res) => {
  const data = await dashboardService.getAttendanceOverview(req.query)
  return success(res, data)
})

// GET /api/dashboard/time-off
router.get('/time-off', async (req, res) => {
  const data = await dashboardService.getTimeOffOverview(req.query)
  return success(res, data)
})

// GET /api/dashboard/departments
router.get('/departments', async (req, res) => {
  const data = await dashboardService.getDepartmentOverview(req.query)
  return success(res, data)
})

module.exports = router
