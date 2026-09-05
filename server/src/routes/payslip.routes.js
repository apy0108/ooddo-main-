const router = require('express').Router()
const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')
const payslipService = require('../services/payslip.service')
const { authenticateToken, isHROrAbove } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')
const AppError = require('../utils/AppError')

router.use(authenticateToken)

// GET /api/payslips - list all payslips (role-aware: employee sees own only)
router.get('/', async (req, res) => {
  const payslips = await payslipService.getAll(req.query, req.user.role, req.user.id)
  return success(res, payslips)
})

// POST /api/payslips - create standalone payslip [HR, ADMIN]
router.post('/', isHROrAbove, async (req, res) => {
  const payslip = await payslipService.createStandalone(req.body, req.user.id)
  return success(res, payslip, 201)
})

// GET /api/payslips/:id - get single payslip (role-aware)
router.get('/:id', async (req, res) => {
  const payslip = await payslipService.getOne(req.params.id, req.user.role, req.user.id)
  return success(res, payslip)
})

// POST /api/payslips/:id/compute - compute single payslip [HR, ADMIN]
router.post('/:id/compute', isHROrAbove, async (req, res) => {
  const payslip = await payslipService.computeOne(req.params.id)
  return success(res, payslip)
})

// POST /api/payslips/:id/generate-pdf - generate PDF
router.post('/:id/generate-pdf', async (req, res) => {
  // Allow HR/Admin or employee viewing own
  await payslipService.getOne(req.params.id, req.user.role, req.user.id)
  const result = await payslipService.generatePdf(req.params.id)
  return success(res, result)
})

// POST /api/payslips/:id/send - send single payslip email [HR, ADMIN]
router.post('/:id/send', isHROrAbove, async (req, res) => {
  const result = await payslipService.sendOne(req.params.id)
  return success(res, result)
})

// POST /api/payslips/:id/mark-paid - mark single payslip as paid [HR, ADMIN]
router.post('/:id/mark-paid', isHROrAbove, async (req, res) => {
  const payslip = await payslipService.markPaid(req.params.id)
  return success(res, payslip)
})

// GET /api/payslips/:id/download - stream PDF file
router.get('/:id/download', async (req, res) => {
  const payslip = await payslipService.getOne(req.params.id, req.user.role, req.user.id)

  let filePath = path.join(__dirname, '../../uploads/payslips', `${payslip.id}.pdf`)
  if (!fs.existsSync(filePath)) {
    const generated = await payslipService.generatePdf(payslip.id)
    filePath = generated.filePath
  }

  const empName = `${payslip.employee.firstName}_${payslip.employee.lastName}`
  const period = payslip.payrun?.name || dayjs(payslip.periodStart).format('MMM_YYYY')
  const downloadName = `Payslip_${empName}_${period}.pdf`.replace(/\s+/g, '_')

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`)

  const stream = fs.createReadStream(filePath)
  stream.pipe(res)
})

module.exports = router
