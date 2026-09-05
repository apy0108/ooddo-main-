const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')
const prisma = require('../config/prisma')

/**
 * Format currency in Indian Rupees
 */
const formatINR = (val) => {
  const num = Math.round(val || 0)
  return '₹' + num.toLocaleString('en-IN')
}

/**
 * Generate PDF payslip using PDFKit
 */
async function generatePayslipPdf(payslipId) {
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: {
        include: {
          user: true,
          department: true,
          jobPosition: true,
        },
      },
      salaryStructure: true,
      payrun: true,
      lines: { orderBy: { sequence: 'asc' } },
    },
  })

  if (!payslip) throw new Error('Payslip not found')

  const uploadsDir = path.join(__dirname, '../../uploads/payslips')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const filePath = path.join(uploadsDir, `${payslipId}.pdf`)
  const publicPath = `/uploads/payslips/${payslipId}.pdf`

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    const empName = `${payslip.employee.firstName} ${payslip.employee.lastName}`
    const empId = payslip.employee.employeeNumber || '—'
    const structureName = payslip.salaryStructure?.name || 'Regular Salary'
    const periodStr = `${dayjs(payslip.periodStart).format('DD-MMM-YYYY')} → ${dayjs(payslip.periodEnd).format('DD-MMM-YYYY')}`
    const daysStr = `${payslip.workedDays} / ${payslip.totalDays || 22}`
    const payrunName = payslip.payrun?.name || 'Payroll'

    // ── Header Banner ──
    doc.rect(40, 40, 515, 60).fill('#1e3a8a')
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('PeoplePay360', 55, 52)
    doc.fontSize(11).font('Helvetica').text(`Payslip for ${payrunName}`, 55, 76)

    // ── Employee Info Card ──
    doc.rect(40, 110, 515, 95).strokeColor('#e2e8f0').lineWidth(1).stroke()
    doc.fillColor('#f8fafc').rect(40, 110, 515, 95).fill()

    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold')

    // Left column
    doc.text('Employee Name:', 55, 122)
    doc.font('Helvetica').fillColor('#0f172a').text(empName, 155, 122)

    doc.font('Helvetica-Bold').fillColor('#334155').text('Employee ID:', 55, 140)
    doc.font('Helvetica').fillColor('#0f172a').text(empId, 155, 140)

    doc.font('Helvetica-Bold').fillColor('#334155').text('Salary Structure:', 55, 158)
    doc.font('Helvetica').fillColor('#0f172a').text(structureName, 155, 158)

    doc.font('Helvetica-Bold').fillColor('#334155').text('Department:', 55, 176)
    doc.font('Helvetica').fillColor('#0f172a').text(payslip.employee.department?.name || '—', 155, 176)

    // Right column
    doc.font('Helvetica-Bold').fillColor('#334155').text('Pay Period:', 320, 122)
    doc.font('Helvetica').fillColor('#0f172a').text(periodStr, 405, 122)

    doc.font('Helvetica-Bold').fillColor('#334155').text('Days Worked:', 320, 140)
    doc.font('Helvetica').fillColor('#0f172a').text(daysStr, 405, 140)

    doc.font('Helvetica-Bold').fillColor('#334155').text('Pay Run:', 320, 158)
    doc.font('Helvetica').fillColor('#0f172a').text(payrunName, 405, 158)

    doc.font('Helvetica-Bold').fillColor('#334155').text('Job Position:', 320, 176)
    doc.font('Helvetica').fillColor('#0f172a').text(payslip.employee.jobPosition?.title || '—', 405, 176)

    // ── Salary Computation Header ──
    let y = 220
    doc.fillColor('#1e3a8a').fontSize(12).font('Helvetica-Bold').text('SALARY COMPUTATION', 40, y)
    y += 20

    // Table Header
    doc.rect(40, y, 515, 24).fill('#f1f5f9')
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold')
    doc.text('Rule', 55, y + 7)
    doc.text('Category', 280, y + 7)
    doc.text('Amount', 460, y + 7, { width: 80, align: 'right' })
    y += 26

    // Table Lines
    for (const line of payslip.lines) {
      doc.rect(40, y, 515, 22).fill(y % 2 === 0 ? '#ffffff' : '#f8fafc')
      doc.fontSize(9).font('Helvetica')
      doc.fillColor('#1e293b').text(line.ruleName, 55, y + 6)
      doc.fillColor('#64748b').text(line.category, 280, y + 6)

      const amtVal = line.amount
      const amtStr = amtVal < 0 ? `-${formatINR(Math.abs(amtVal))}` : formatINR(amtVal)
      const amtColor = line.category === 'DEDUCTION' ? '#dc2626' : (line.category === 'NET' ? '#ca8a04' : '#16a34a')

      doc.font(line.category === 'NET' || line.category === 'GROSS' ? 'Helvetica-Bold' : 'Helvetica')
      doc.fillColor(amtColor).text(amtStr, 460, y + 6, { width: 80, align: 'right' })
      y += 22
    }

    // ── Divider ──
    y += 10
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').lineWidth(1).stroke()
    y += 15

    // ── Summary Box ──
    doc.rect(40, y, 515, 80).fill('#f8fafc').strokeColor('#cbd5e1').stroke()
    doc.fontSize(10).font('Helvetica-Bold')
    doc.fillColor('#0f172a').text('GROSS SALARY:', 60, y + 14)
    doc.fillColor('#16a34a').text(formatINR(payslip.gross), 440, y + 14, { width: 100, align: 'right' })

    doc.fillColor('#0f172a').text('DEDUCTIONS:', 60, y + 34)
    doc.fillColor('#dc2626').text(`-${formatINR(payslip.deductions)}`, 440, y + 34, { width: 100, align: 'right' })

    doc.fontSize(12).fillColor('#0f172a').text('NET SALARY:', 60, y + 54)
    doc.fontSize(13).fillColor('#ca8a04').text(formatINR(payslip.net), 440, y + 54, { width: 100, align: 'right' })

    // ── Footer ──
    const footerY = 740
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
    doc.text('This is a computer-generated payslip.', 40, footerY, { align: 'center', width: 515 })
    doc.text(`Generated on: ${dayjs().format('DD-MMM-YYYY HH:mm')}`, 40, footerY + 12, { align: 'center', width: 515 })

    doc.end()
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

  // Update payslip record with pdfPath
  await prisma.payslip.update({
    where: { id: payslipId },
    data: { pdfPath: publicPath },
  })

  return { filePath, publicPath }
}

module.exports = {
  generatePayslipPdf,
}
