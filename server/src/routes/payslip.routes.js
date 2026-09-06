const router = require('express').Router()
const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')
const payslipService = require('../services/payslip.service')
const { authenticateToken, isHROrAbove, isPayrollOrAbove } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')
const AppError = require('../utils/AppError')

router.use(authenticateToken)

// GET /api/payslips - list all payslips (role-aware: employee sees own only)
router.get('/', async (req, res) => {
  const payslips = await payslipService.getAll(req.query, req.user.role, req.user.id)
  return success(res, payslips)
})

// POST /api/payslips - create standalone payslip [HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN]
router.post('/', isPayrollOrAbove, async (req, res) => {
  const payslip = await payslipService.createStandalone(req.body, req.user.id)
  return success(res, payslip, 201)
})

// GET /api/payslips/:id - get single payslip (role-aware)
router.get('/:id', async (req, res) => {
  const payslip = await payslipService.getOne(req.params.id, req.user.role, req.user.id)
  return success(res, payslip)
})

// POST /api/payslips/:id/compute - compute single payslip [HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN]
router.post('/:id/compute', isPayrollOrAbove, async (req, res) => {
  const payslip = await payslipService.computeOne(req.params.id)
  return success(res, payslip)
})

// POST /api/payslips/:id/generate-pdf - generate PDF on demand
router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const { generatePayslipPdf } = require('../services/payslipPdf.service')
    const filePath = await generatePayslipPdf(req.params.id)
    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdfUrl: `/api/payslips/${req.params.id}/download`,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/payslips/:id/send - send single payslip email [HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN]
router.post('/:id/send', isPayrollOrAbove, async (req, res) => {
  const result = await payslipService.sendOne(req.params.id)
  return success(res, result)
})

// POST /api/payslips/:id/mark-paid - mark single payslip as paid [HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN]
router.post('/:id/mark-paid', isPayrollOrAbove, async (req, res) => {
  const payslip = await payslipService.markPaid(req.params.id)
  return success(res, payslip)
})

// GET /api/payslips/:id/download - stream PDF file
router.get('/:id/download', async (req, res) => {
  try {
    const payslipId = req.params.id
    const prisma = require('../config/prisma')

    // RBAC: employee can only download own payslip
    if (req.user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: req.user.id }
      })
      const payslip = await prisma.payslip.findUnique({
        where: { id: payslipId }
      })
      if (!payslip || payslip.employeeId !== employee?.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        })
      }
    }

    // Generate PDF if it doesn't exist yet
    const { generatePayslipPdf } = require('../services/payslipPdf.service')
    const filePath = await generatePayslipPdf(payslipId)

    // Verify file actually exists
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({
        success: false,
        message: 'PDF generation failed — file not found'
      })
    }

    // Get employee name for filename
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: { include: { user: true } },
        payrun: true,
      }
    })

    const empName = payslip?.employee?.user?.name || `${payslip?.employee?.firstName || ''}_${payslip?.employee?.lastName || ''}`.trim() || 'Employee'
    const cleanEmpName = empName.replace(/\s+/g, '_')
    const period = payslip?.payrun?.name?.replace(/\s+/g, '_') || 'Payslip'
    const filename = `Payslip_${cleanEmpName}_${period}.pdf`

    // Set correct headers and stream file
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', fs.statSync(filePath).size)

    const fileStream = fs.createReadStream(filePath)
    fileStream.on('error', (err) => {
      console.error('PDF stream error:', err)
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to stream PDF' })
      }
    })
    fileStream.pipe(res)

  } catch (err) {
    console.error('Download error:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
