const router = require('express').Router()
const { authenticateToken, requireRole, isHROrAbove } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')

const typeSvc = require('../services/timeOffType.service')
const allocSvc = require('../services/timeOffAllocation.service')
const reqSvc = require('../services/timeOffRequest.service')

const isHRAdmin = requireRole('HR_MANAGER', 'ADMIN')

router.use(authenticateToken)

// ── DASHBOARD SUMMARY ───────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const data = await reqSvc.getDashboardSummary(req.user)
  return success(res, data)
})

// ── TIME OFF TYPES ──────────────────────────────────────────
router.get('/types', async (req, res) => {
  const types = await typeSvc.getAll()
  return success(res, types)
})

router.post('/types', isHRAdmin, async (req, res) => {
  const type = await typeSvc.create(req.body)
  return success(res, type, 201)
})

router.get('/types/:id', async (req, res) => {
  const type = await typeSvc.getOne(req.params.id)
  return success(res, type)
})

router.put('/types/:id', isHRAdmin, async (req, res) => {
  const type = await typeSvc.update(req.params.id, req.body)
  return success(res, type)
})

router.patch('/types/:id/toggle', isHRAdmin, async (req, res) => {
  const type = await typeSvc.toggle(req.params.id)
  return success(res, type)
})

// ── BALANCE LOOKUP ──────────────────────────────────────────
router.get('/balance/:employeeId/:typeId', async (req, res) => {
  const balance = await allocSvc.getBalance(req.params.employeeId, req.params.typeId)
  return success(res, balance)
})

// ── ALLOCATIONS ─────────────────────────────────────────────
router.get('/allocations', async (req, res) => {
  const allocations = await allocSvc.getAll(req.query, req.user)
  return success(res, allocations)
})

router.post('/allocations', isHROrAbove, async (req, res) => {
  const allocation = await allocSvc.create(req.body)
  return success(res, allocation, 201)
})

router.get('/allocations/:id', async (req, res) => {
  const allocation = await allocSvc.getOne(req.params.id, req.user)
  return success(res, allocation)
})

router.post('/allocations/:id/approve', isHROrAbove, async (req, res) => {
  const approverId = req.user.userId || req.user.id
  const allocation = await allocSvc.approve(req.params.id, approverId)
  return success(res, allocation)
})

router.post('/allocations/:id/refuse', isHROrAbove, async (req, res) => {
  const approverId = req.user.userId || req.user.id
  const allocation = await allocSvc.refuse(req.params.id, approverId, req.body.refuseReason)
  return success(res, allocation)
})

// ── REQUESTS ────────────────────────────────────────────────
router.get('/requests', async (req, res) => {
  const requests = await reqSvc.getAll(req.query, req.user)
  return success(res, requests)
})

router.post('/requests', async (req, res) => {
  const request = await reqSvc.create(req.body, req.user)
  return success(res, request, 201)
})

router.get('/requests/:id', async (req, res) => {
  const request = await reqSvc.getOne(req.params.id, req.user)
  return success(res, request)
})

router.post('/requests/:id/approve', isHROrAbove, async (req, res) => {
  const approverId = req.user.userId || req.user.id
  const request = await reqSvc.approve(req.params.id, approverId)
  return success(res, request)
})

router.post('/requests/:id/refuse', isHROrAbove, async (req, res) => {
  const approverId = req.user.userId || req.user.id
  const request = await reqSvc.refuse(req.params.id, approverId, req.body.refuseReason)
  return success(res, request)
})

module.exports = router
