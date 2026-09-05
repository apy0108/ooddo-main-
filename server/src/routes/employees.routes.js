const router = require('express').Router()
const ctrl = require('../controllers/employee.controller')
const { authenticateToken, isHROrAbove } = require('../middleware/auth')

router.use(authenticateToken)

router.get('/', isHROrAbove, ctrl.list)
router.post('/', isHROrAbove, ctrl.create)
router.get('/:id', isHROrAbove, ctrl.getOne)
router.put('/:id', isHROrAbove, ctrl.update)
router.patch('/:id/archive', isHROrAbove, ctrl.archive)
router.get('/:id/counts', isHROrAbove, ctrl.counts)

module.exports = router
