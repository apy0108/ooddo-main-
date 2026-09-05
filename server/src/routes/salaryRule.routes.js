const express = require('express')
const router = express.Router()
const { authenticateToken, requireRole } = require('../middleware/auth')
const salaryRuleService = require('../services/salaryRule.service')

const hrOrAdmin = requireRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER')

router.use(authenticateToken)

router.get('/', async (req, res) => {
  const rules = await salaryRuleService.getAll(req.query)
  res.json({ success: true, data: rules })
})

router.post('/', hrOrAdmin, async (req, res) => {
  const rule = await salaryRuleService.create(req.body)
  res.status(201).json({ success: true, data: rule, message: 'Rule added to structure' })
})

router.get('/:id', async (req, res) => {
  const rule = await salaryRuleService.getOne(req.params.id)
  res.json({ success: true, data: rule })
})

router.put('/:id', hrOrAdmin, async (req, res) => {
  const rule = await salaryRuleService.update(req.params.id, req.body)
  res.json({ success: true, data: rule, message: 'Rule updated' })
})

router.delete('/:id', hrOrAdmin, async (req, res) => {
  await salaryRuleService.delete(req.params.id)
  res.json({ success: true, message: 'Rule removed' })
})

module.exports = router
