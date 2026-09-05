const router = require('express').Router()
const ctrl = require('../controllers/contract.controller')
const { authenticateToken, isHROrAbove } = require('../middleware/auth')

router.use(authenticateToken)
router.use(isHROrAbove)

router.get('/', ctrl.list)
router.post('/', ctrl.create)
router.get('/:id', ctrl.getOne)
router.put('/:id', ctrl.update)
router.patch('/:id/activate', ctrl.activate)
router.patch('/:id/cancel', ctrl.cancel)

module.exports = router
