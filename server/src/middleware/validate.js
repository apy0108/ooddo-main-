const { ZodError } = require('zod')

const validate = (schema) => (req, res, next) => {
  try {
    req.validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    })
    next()
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }
    next(err)
  }
}

module.exports = { validate }
