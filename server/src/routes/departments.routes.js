const router = require('express').Router()
const svc = require('../services/department.service')
const { authenticateToken, isHROrAbove } = require('../middleware/auth')
const { success } = require('../utils/apiResponse')

router.use(authenticateToken)

router.get('/', async (req, res) => {
  const depts = await svc.getAll()
  return success(res, depts)
})

router.post('/', isHROrAbove, async (req, res) => {
  const dept = await svc.create(req.body)
  return success(res, dept, 201)
})

router.put('/:id', isHROrAbove, async (req, res) => {
  const dept = await svc.update(req.params.id, req.body)
  return success(res, dept)
})

router.delete('/:id', isHROrAbove, async (req, res) => {
  await svc.remove(req.params.id)
  return success(res, { message: 'Department deleted successfully' })
})

module.exports = router
