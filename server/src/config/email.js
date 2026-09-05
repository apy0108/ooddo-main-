const nodemailer = require('nodemailer')
const env = require('./env')

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
})

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  return transporter.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to,
    subject,
    html,
    attachments,
  })
}

// Verify connection on startup
const verifyEmailConnection = async () => {
  try {
    await transporter.verify()
    console.log('✅ SMTP connection verified')
  } catch (err) {
    console.error('⚠️  SMTP connection failed:', err.message)
  }
}

module.exports = { sendEmail, verifyEmailConnection }
