const multer = require('multer')
const path = require('path')
const env = require('../config/env')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.upload.dir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxSize },
})

module.exports = upload
