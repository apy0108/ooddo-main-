const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack)

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      message: `A record with this ${err.meta?.target?.join(', ')} already exists.`,
    })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found.' })
  }

  // Operational errors (thrown with AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }

  // Unknown errors
  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

module.exports = { errorHandler }
