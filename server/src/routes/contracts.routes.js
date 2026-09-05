const router = require('express').Router()
const ctrl = require('../controllers/contract.controller')
const { authenticateToken, isHROrAbove, isAdmin } = require('../middleware/auth')
const prisma = require('../config/prisma')

router.use(authenticateToken)

router.get('/', isHROrAbove, ctrl.list)
router.post('/', isHROrAbove, ctrl.create)
router.get('/:id', isHROrAbove, ctrl.getOne)
router.put('/:id', isHROrAbove, ctrl.update)
router.patch('/:id/activate', isHROrAbove, ctrl.activate)
router.patch('/:id/cancel', isHROrAbove, ctrl.cancel)

// ADMIN only: permanently delete contract
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
    })

    if (contract?.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an ACTIVE contract. Cancel it first.',
      })
    }

    await prisma.contract.delete({ where: { id: req.params.id } })
    return res.json({ success: true, message: 'Contract deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router

