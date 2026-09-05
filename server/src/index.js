require('./config/env')          // validates env vars first
require('express-async-errors')  // must be before express
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')
const cookieParser = require('cookie-parser')
const { errorHandler } = require('./middleware/errorHandler')
const { verifyEmailConnection } = require('./config/email')

const app = express()

// ── Core middleware ──
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))
app.use(cookieParser())

// ── Static files (uploaded photos) ──
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'PeoplePay360 API',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  })
})

// ── Routes ──
app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/employees', require('./routes/employees.routes'))
app.use('/api/departments', require('./routes/departments.routes'))
app.use('/api/job-positions', require('./routes/jobPositions.routes'))
app.use('/api/working-schedules', require('./routes/workingSchedules.routes'))
app.use('/api/contracts', require('./routes/contracts.routes'))
app.use('/api/attendance', require('./routes/attendance.routes'))
app.use('/api/time-off', require('./routes/timeOff.routes'))
app.use('/api/salary-structures', require('./routes/salaryStructure.routes'))
app.use('/api/salary-rules', require('./routes/salaryRule.routes'))
// app.use('/api/payruns', require('./routes/payruns.routes'))
// app.use('/api/payslips', require('./routes/payslips.routes'))
// app.use('/api/dashboard', require('./routes/dashboard.routes'))

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` })
})

// ── Global error handler (must be last) ──
app.use(errorHandler)

// ── Start server ──
const PORT = process.env.PORT || 5000

app.listen(PORT, async () => {
  console.log(`🚀 PeoplePay360 API running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV}`)
  await verifyEmailConnection()
  const { startAttendanceCron } = require('./jobs/attendance.cron')
  startAttendanceCron()
})

module.exports = app
