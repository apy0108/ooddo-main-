const requireRole = (...roles) => (req, res, next) => {
  // TODO: implement role check in Phase 2
  next()
}

module.exports = { requireRole }
