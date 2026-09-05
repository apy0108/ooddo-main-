const router = require('express').Router()
const payrunService = require('../services/payrun.service')
const { authenticateToken, isPayrollOrAbove } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')

router.use(authenticateToken)

// GET eligible employees for a salary structure and period (must be before /:id)
router.get('/eligible-employees', isPayrollOrAbove, async (req, res) => {
  const { salaryStructureId, periodStart, periodEnd } = req.query
  const data = await payrunService.getEligibleEmployees(salaryStructureId, periodStart, periodEnd)
  return success(res, data)
})

// GET /api/payruns - list all payruns [HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN]
router.get('/', isPayrollOrAbove, async (req, res) => {
  const payruns = await payrunService.getAll(req.query)
  return success(res, payruns)
})

// POST /api/payruns - create new payrun [HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN]
router.post('/', isPayrollOrAbove, async (req, res) => {
  const payrun = await payrunService.create({
    ...req.body,
    createdById: req.user.id,
  })
  return success(res, payrun, 201)
})

// GET /api/payruns/:id - get payrun details
router.get('/:id', isPayrollOrAbove, async (req, res) => {
  const payrun = await payrunService.getOne(req.params.id)
  return success(res, payrun)
})

// POST /api/payruns/:id/compute - compute all payslips
router.post('/:id/compute', isPayrollOrAbove, async (req, res) => {
  const payrun = await payrunService.compute(req.params.id)
  return success(res, payrun)
})

// POST /api/payruns/:id/validate - validate payrun
router.post('/:id/validate', isPayrollOrAbove, async (req, res) => {
  const payrun = await payrunService.validate(req.params.id)
  return success(res, payrun)
})

// POST /api/payruns/:id/mark-paid - mark payrun as paid
router.post('/:id/mark-paid', isPayrollOrAbove, async (req, res) => {
  const payrun = await payrunService.markPaid(req.params.id)
  return success(res, payrun)
})

// POST /api/payruns/:id/send-payslips - send payslips via email
router.post('/:id/send-payslips', isPayrollOrAbove, async (req, res) => {
  const result = await payrunService.sendPayslips(req.params.id)
  return success(res, result)
})

module.exports = router
