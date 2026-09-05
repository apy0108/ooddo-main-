const nodemailer           = require('nodemailer');
const path                 = require('path');
const fs                   = require('fs');
const prisma               = require('../config/prisma');
const { generatePayslipPdf } = require('./payslipPdf.service');

// Transporter configuration with fallback for env var names
const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

function fmt(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(n || 0);
}

async function sendPayslipEmail(payslipId) {
  // Load payslip data
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: { include: { user: true } },
      payrun:   true,
      salaryStructure: true,
      lines:    { orderBy: { sequence: 'asc' } },
    }
  });

  if (!payslip) throw new Error('Payslip not found');

  const empEmail = payslip.employee?.user?.email || payslip.employee?.email;
  const empName  = payslip.employee?.user?.name || `${payslip.employee?.firstName || ''} ${payslip.employee?.lastName || ''}`.trim() || 'Employee';
  const period   = payslip.payrun?.name || 'Payslip';

  if (!empEmail) throw new Error(`No email for employee: ${empName}`);

  // Generate PDF (or use existing)
  const pdfPath = await generatePayslipPdf(payslipId);

  if (!fs.existsSync(pdfPath)) {
    throw new Error('PDF file not found after generation');
  }

  // Build HTML email body
  const earningsLines  = payslip.lines
    .filter(l => ['BASIC','ALLOWANCE','GROSS'].includes(l.category));
  const deductionLines = payslip.lines
    .filter(l => l.category === 'DEDUCTION');

  const earningsRows  = earningsLines.map(l =>
    `<tr>
       <td style="padding:6px 12px;border-bottom:1px solid #eee">${l.ruleName}</td>
       <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#22C55E">
         ${fmt(l.amount)}
       </td>
     </tr>`
  ).join('');

  const deductionRows = deductionLines.map(l =>
    `<tr>
       <td style="padding:6px 12px;border-bottom:1px solid #eee">${l.ruleName}</td>
       <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#EF4444">
         -${fmt(Math.abs(l.amount))}
       </td>
     </tr>`
  ).join('');

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4">
    <div style="max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

      <!-- Header -->
      <div style="background:#3B82F6;padding:24px 30px">
        <h1 style="margin:0;color:#fff;font-size:22px">PeoplePay360</h1>
        <p style="margin:6px 0 0;color:#DBEAFE;font-size:13px">
          Payslip for ${period}
        </p>
      </div>

      <!-- Greeting -->
      <div style="padding:24px 30px 0">
        <p style="font-size:15px;color:#1E293B">Dear <strong>${empName}</strong>,</p>
        <p style="font-size:14px;color:#475569">
          Please find your payslip for <strong>${period}</strong> attached to this email.
          A summary of your salary computation is shown below.
        </p>
      </div>

      <!-- Salary Summary Table -->
      <div style="padding:16px 30px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#EFF6FF">
              <th style="padding:8px 12px;text-align:left;color:#3B82F6">Earnings</th>
              <th style="padding:8px 12px;text-align:right;color:#3B82F6">Amount</th>
            </tr>
          </thead>
          <tbody>${earningsRows}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">
          <thead>
            <tr style="background:#FFF5F5">
              <th style="padding:8px 12px;text-align:left;color:#EF4444">Deductions</th>
              <th style="padding:8px 12px;text-align:right;color:#EF4444">Amount</th>
            </tr>
          </thead>
          <tbody>${deductionRows}</tbody>
        </table>
      </div>

      <!-- Net Salary Banner -->
      <div style="margin:0 30px;background:#3B82F6;border-radius:6px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:#fff;font-size:15px;font-weight:bold">NET SALARY</span>
        <span style="color:#fff;font-size:18px;font-weight:bold">${fmt(payslip.net)}</span>
      </div>

      <!-- Footer -->
      <div style="padding:20px 30px;border-top:1px solid #eee;margin-top:20px">
        <p style="font-size:12px;color:#94A3B8;margin:0">
          This is an auto-generated email from PeoplePay360.
          The payslip PDF is attached to this email.
          For any queries, please contact your HR department.
        </p>
      </div>
    </div>
  </body>
  </html>`;

  // Send email with PDF attachment
  const senderEmail = emailUser || 'noreply@peoplepay360.com';
  const info = await transporter.sendMail({
    from:    `"PeoplePay360" <${senderEmail}>`,
    to:      empEmail,
    subject: `Your Payslip for ${period} — PeoplePay360`,
    html:    htmlBody,
    attachments: [{
      filename:    `Payslip_${empName.replace(/\s+/g,'_')}_${period.replace(/\s+/g,'_')}.pdf`,
      path:        pdfPath,
      contentType: 'application/pdf',
    }],
  });

  // Mark as sent
  await prisma.payslip.update({
    where: { id: payslipId },
    data:  { sentAt: new Date() },
  });

  console.log(`Payslip email sent to ${empEmail} — MessageId: ${info.messageId}`);
  return { success: true, sentTo: empEmail, messageId: info.messageId };
}

async function sendAllPayslips(payrunId) {
  const payslips = await prisma.payslip.findMany({
    where: {
      payrunId,
      status: { in: ['COMPUTED', 'DONE', 'PAID'] },
    },
    select: { id: true }
  });

  const results = { sent: 0, failed: [], total: payslips.length };

  for (const p of payslips) {
    try {
      await sendPayslipEmail(p.id);
      results.sent++;
    } catch (err) {
      console.error(`Failed to send payslip ${p.id}:`, err.message);
      results.failed.push({ payslipId: p.id, error: err.message });
    }
  }

  return results;
}

module.exports = { sendPayslipEmail, sendAllPayslips };
