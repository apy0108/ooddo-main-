const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')
const prisma = require('../config/prisma')
const { sendEmail } = require('../config/email')
const { generatePayslipPdf } = require('./payslipPdf.service')

const formatINR = (val) => {
  const num = Math.round(val || 0)
  return '₹' + num.toLocaleString('en-IN')
}

/**
 * Send single payslip email with PDF attachment
 */
async function sendPayslipEmail(payslipId) {
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: {
        include: { user: true },
      },
      payrun: true,
      salaryStructure: true,
    },
  })

  if (!payslip) throw new Error('Payslip not found')

  const recipientEmail = payslip.employee?.user?.email || payslip.employee?.email
  if (!recipientEmail) {
    throw new Error('Employee has no email address configured')
  }

  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`
  const period = payslip.payrun?.name || `${dayjs(payslip.periodStart).format('MMM YYYY')}`

  // Check if PDF exists, otherwise generate
  let pdfFilePath = path.join(__dirname, '../../uploads/payslips', `${payslipId}.pdf`)
  if (!fs.existsSync(pdfFilePath) || !payslip.pdfPath) {
    const { filePath } = await generatePayslipPdf(payslipId)
    pdfFilePath = filePath
  }

  const subject = `Your Payslip for ${period} — PeoplePay360`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 18px 24px; border-radius: 8px; margin-bottom: 24px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">PeoplePay360</h2>
        <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 13px;">Salary Payslip Notification</p>
      </div>

      <p style="color: #334155; font-size: 14px; margin-bottom: 16px;">Dear <strong>${employeeName}</strong>,</p>
      <p style="color: #475569; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        Please find your payslip for <strong>${period}</strong> attached with this email.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <h3 style="color: #1e293b; margin: 0 0 12px 0; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Salary Summary</h3>
        <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0;">Basic Salary:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #16a34a;">${formatINR(payslip.basic)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;">Gross Salary:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #16a34a;">${formatINR(payslip.gross)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;">Deductions:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #dc2626;">-${formatINR(payslip.deductions)}</td>
          </tr>
          <tr style="border-top: 1px solid #cbd5e1;">
            <td style="padding: 10px 0 0 0; font-size: 15px; font-weight: bold; color: #0f172a;">NET SALARY:</td>
            <td style="padding: 10px 0 0 0; font-size: 15px; font-weight: bold; color: #ca8a04; text-align: right;">${formatINR(payslip.net)}</td>
          </tr>
        </table>
      </div>

      <p style="color: #64748b; font-size: 12px; margin-bottom: 8px;">
        For queries or clarifications, please contact your HR or Payroll department.
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        — PeoplePay360 Team
      </p>
    </div>
  `

  await sendEmail({
    to: recipientEmail,
    subject,
    html,
    attachments: [
      {
        filename: `Payslip_${employeeName}_${period}.pdf`,
        path: pdfFilePath,
      },
    ],
  })

  await prisma.payslip.update({
    where: { id: payslipId },
    data: { sentAt: new Date() },
  })

  return { success: true, sentTo: recipientEmail }
}

/**
 * Send payslips to all computed/done/paid employees in a payrun
 */
async function sendAllPayslips(payrunId) {
  const payslips = await prisma.payslip.findMany({
    where: {
      payrunId,
      status: { in: ['COMPUTED', 'DONE', 'PAID'] },
    },
    include: {
      employee: { include: { user: true } },
    },
  })

  let sent = 0
  const failed = []
  const errors = []

  for (const ps of payslips) {
    try {
      await sendPayslipEmail(ps.id)
      sent++
    } catch (err) {
      console.error(`Failed to send payslip email for ${ps.id}:`, err.message)
      failed.push(ps.id)
      errors.push({ payslipId: ps.id, error: err.message })
    }
  }

  return { sent, failed, errors }
}

module.exports = {
  sendPayslipEmail,
  sendAllPayslips,
}
