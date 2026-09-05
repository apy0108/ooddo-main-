const success = (res, data, statusCode = 200, meta = null) => {
  const payload = { success: true, data }
  if (meta) payload.meta = meta
  return res.status(statusCode).json(payload)
}

const error = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({ success: false, message })
}

module.exports = { success, error }
