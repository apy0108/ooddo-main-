const express = require('express')
const router = express.Router()
const { authenticateToken, requireRole } = require('../middleware/auth')
const salaryStructureService = require('../services/salaryStructure.service')
const salaryRuleService = require('../services/salaryRule.service')
const salaryCalculationService = require('../services/salaryCalculation.service')

const hrOrAdmin = requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER')

// All routes require auth
router.use(authenticateToken)

// ── Structure Routes ──────────────────────────────────────────
router.get('/', async (req, res) => {
  const structures = await salaryStructureService.getAll(req.query)
  res.json({ success: true, data: structures })
})

router.post('/', hrOrAdmin, async (req, res) => {
  const structure = await salaryStructureService.create(req.body)
  res.status(201).json({ success: true, data: structure, message: 'Salary Structure created successfully' })
})

router.get('/:id', async (req, res) => {
  const structure = await salaryStructureService.getOne(req.params.id)
  res.json({ success: true, data: structure })
})

router.put('/:id', hrOrAdmin, async (req, res) => {
  const structure = await salaryStructureService.update(req.params.id, req.body)
  res.json({ success: true, data: structure, message: 'Salary Structure updated' })
})

router.patch('/:id/toggle', hrOrAdmin, async (req, res) => {
  const structure = await salaryStructureService.toggle(req.params.id)
  res.json({ success: true, data: structure, message: `Salary Structure ${structure.active ? 'activated' : 'deactivated'}` })
})

// Preview calculation endpoint
router.post('/:id/preview', async (req, res) => {
  const { employeeId, workedDays, totalDaysInMonth } = req.body
  const preview = await salaryCalculationService.calculatePayslip(
    employeeId,
    req.params.id,
    workedDays,
    totalDaysInMonth
  )
  res.json({ success: true, data: preview })
})

module.exports = router
