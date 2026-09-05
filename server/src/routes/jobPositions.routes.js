const router = require('express').Router()
const svc = require('../services/jobPosition.service')
const { authenticateToken, isHROrAbove } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')

router.use(authenticateToken)

router.get('/', async (req, res) => {
  const positions = await svc.getAll()
  return success(res, positions)
})

router.post('/', isHROrAbove, async (req, res) => {
  const pos = await svc.create(req.body)
  return success(res, pos, 201)
})

router.put('/:id', isHROrAbove, async (req, res) => {
  const pos = await svc.update(req.params.id, req.body)
  return success(res, pos)
})

router.delete('/:id', isHROrAbove, async (req, res) => {
  await svc.remove(req.params.id)
  return success(res, { message: 'Job position deleted successfully' })
})

module.exports = router
