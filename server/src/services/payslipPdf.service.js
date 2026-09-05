const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');
const prisma      = require('../config/prisma');

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/payslips');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Indian number format helper
function fmt(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(n || 0);
}

function fmtDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

async function generatePayslipPdf(payslipId) {
  // ── Load ALL data needed ──────────────────────────────────
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: {
        include: {
          user:            true,
          department:      true,
          jobPosition:     true,
          workingSchedule: true,
        }
      },
      salaryStructure: true,
      payrun:          true,
      lines: { orderBy: { sequence: 'asc' } },
    }
  });

  if (!payslip) throw new Error('Payslip not found');

  const emp  = payslip.employee;
  const user = emp.user || {};
  const empName = user.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
  const empEmail = user.email || emp.email || '—';

  // Active contract for this employee
  const contract = await prisma.contract.findFirst({
    where: { employeeId: emp.id, status: 'ACTIVE' },
    include: { salaryStructure: true }
  });

  // Attendance for the payslip period
  const attendance = await prisma.attendance.findMany({
    where: {
      employeeId: emp.id,
      OR: [
        { checkIn: { gte: new Date(payslip.periodStart), lte: new Date(payslip.periodEnd) } },
        { createdAt: { gte: new Date(payslip.periodStart), lte: new Date(payslip.periodEnd) } },
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  const presentDays  = attendance.filter(a => a.status === 'PRESENT').length;
  const lateDays     = attendance.filter(a => a.status === 'LATE').length;
  const absentDays   = attendance.filter(a => a.status === 'ABSENT').length;
  const halfDays     = attendance.filter(a => a.status === 'HALF_DAY').length;
  const totalWorked  = presentDays + lateDays + halfDays * 0.5;

  // Approved leave requests for this period
  const leaves = await prisma.timeOffRequest.findMany({
    where: {
      employeeId: emp.id,
      status:     'APPROVED',
      startDate:  { gte: new Date(payslip.periodStart) },
      endDate:    { lte: new Date(payslip.periodEnd) },
    },
    include: { type: true }
  });

  const totalLeaveDays = leaves.reduce((s, l) => s + (l.duration || 0), 0);

  // ── Build PDF ─────────────────────────────────────────────
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title:    `Payslip - ${empName} - ${payslip.payrun?.name || ''}`,
      Author:   'PeoplePay360',
      Subject:  'Employee Payslip',
    }
  });

  const filePath = path.join(UPLOAD_DIR, `${payslipId}.pdf`);
  const stream   = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ── Color palette ─────────────────────────────────────────
  const PRIMARY    = '#3B82F6';  // blue
  const DARK       = '#1E293B';  // dark background text equiv
  const MUTED      = '#6B7280';  // gray
  const SUCCESS    = '#22C55E';  // green
  const DANGER     = '#EF4444';  // red
  const BORDER     = '#E2E8F0';  // light border
  const WHITE      = '#FFFFFF';
  const LIGHT_BG   = '#F8FAFC';  // section background

  const PAGE_WIDTH = 515; // usable width (595 - 40*2)

  // ── HEADER ───────────────────────────────────────────────
  // Blue header bar
  doc.rect(40, 40, PAGE_WIDTH, 70).fill(PRIMARY);

  // Company name
  doc.fillColor(WHITE)
     .fontSize(20)
     .font('Helvetica-Bold')
     .text('PeoplePay360', 55, 55);

  // Payslip title
  doc.fillColor(WHITE)
     .fontSize(11)
     .font('Helvetica')
     .text('EMPLOYEE PAYSLIP', 55, 82);

  // Pay period on right
  const periodText = `${fmtDate(payslip.periodStart)} — ${fmtDate(payslip.periodEnd)}`;
  doc.fillColor(WHITE)
     .fontSize(10)
     .text(periodText, 55, 97, { align: 'right', width: PAGE_WIDTH - 20 });

  doc.moveDown(0.5);
  let y = 125;

  // ── SECTION 1: EMPLOYEE INFORMATION ─────────────────────
  doc.rect(40, y, PAGE_WIDTH, 18).fill(PRIMARY);
  doc.fillColor(WHITE)
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('EMPLOYEE INFORMATION', 50, y + 4);
  y += 22;

  doc.rect(40, y, PAGE_WIDTH, 85).fill(LIGHT_BG).stroke(BORDER);
  y += 8;

  // Two columns of employee info
  const col1x = 50;
  const col2x = 310;
  const lineH  = 16;

  function infoRow(label, value, x, currentY) {
    doc.fillColor(MUTED).fontSize(8.5).font('Helvetica')
       .text(label, x, currentY, { width: 120 });
    doc.fillColor(DARK).fontSize(8.5).font('Helvetica-Bold')
       .text(value || 'N/A', x + 100, currentY, { width: 130 });
  }

  infoRow('Employee Name:',   empName,                      col1x, y);
  infoRow('Pay Run:',         payslip.payrun?.name || '—',  col2x, y);
  y += lineH;

  infoRow('Department:',      emp.department?.name || '—',  col1x, y);
  infoRow('Salary Structure:',payslip.salaryStructure?.name || '—', col2x, y);
  y += lineH;

  infoRow('Designation:',     emp.jobPosition?.title || emp.jobPosition?.name || '—', col1x, y);
  infoRow('Contract Wage:',   contract ? fmt(contract.wage) : '—', col2x, y);
  y += lineH;

  infoRow('Work Location:',   emp.workLocation || '—',      col1x, y);
  infoRow('Bank Account:',    emp.bankAccountNo || emp.bankAccountNumber || 'Not on file', col2x, y);
  y += lineH;

  infoRow('Email:',           empEmail,                     col1x, y);
  infoRow('Status:',          payslip.status,               col2x, y);
  y += 18;

  // ── SECTION 2: ATTENDANCE SUMMARY ───────────────────────
  doc.rect(40, y, PAGE_WIDTH, 18).fill(PRIMARY);
  doc.fillColor(WHITE)
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('ATTENDANCE SUMMARY', 50, y + 4);
  y += 22;

  doc.rect(40, y, PAGE_WIDTH, 45).fill(LIGHT_BG).stroke(BORDER);
  y += 8;

  // 5 attendance stat boxes in a row
  const attStats = [
    { label: 'Working Days',  value: payslip.totalDays || '—' },
    { label: 'Days Present',  value: presentDays },
    { label: 'Days Late',     value: lateDays },
    { label: 'Days Absent',   value: absentDays },
    { label: 'Leave Taken',   value: totalLeaveDays },
  ];

  const boxW = PAGE_WIDTH / 5;
  attStats.forEach((stat, i) => {
    const bx = 40 + i * boxW;
    doc.fillColor(MUTED).fontSize(7.5).font('Helvetica')
       .text(stat.label, bx + 5, y, { width: boxW - 10, align: 'center' });
    doc.fillColor(DARK).fontSize(14).font('Helvetica-Bold')
       .text(String(stat.value), bx + 5, y + 11, { width: boxW - 10, align: 'center' });
  });
  y += 35;

  // ── SECTION 3: LEAVE SUMMARY (if any leaves in period) ──
  if (leaves.length > 0) {
    doc.rect(40, y, PAGE_WIDTH, 18).fill(PRIMARY);
    doc.fillColor(WHITE)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('LEAVE TAKEN THIS PERIOD', 50, y + 4);
    y += 22;

    // Table header
    doc.rect(40, y, PAGE_WIDTH, 16).fill('#EFF6FF');
    doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold');
    doc.text('Leave Type', 50, y + 4);
    doc.text('From', 220, y + 4);
    doc.text('To', 310, y + 4);
    doc.text('Days', 400, y + 4);
    doc.text('Status', 460, y + 4);
    y += 18;

    leaves.forEach(leave => {
      doc.rect(40, y, PAGE_WIDTH, 15).fill(WHITE).stroke(BORDER);
      doc.fillColor(DARK).fontSize(8).font('Helvetica');
      doc.text(leave.type?.name || '—', 50, y + 4);
      doc.text(fmtDate(leave.startDate), 220, y + 4);
      doc.text(fmtDate(leave.endDate), 310, y + 4);
      doc.text(String(leave.duration), 400, y + 4);
      doc.fillColor(SUCCESS).text('Approved', 460, y + 4);
      y += 16;
    });
    y += 5;
  }

  // ── SECTION 4: SALARY COMPUTATION ───────────────────────
  doc.rect(40, y, PAGE_WIDTH, 18).fill(PRIMARY);
  doc.fillColor(WHITE)
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('SALARY COMPUTATION', 50, y + 4);
  y += 22;

  // Table header row
  doc.rect(40, y, PAGE_WIDTH, 16).fill('#EFF6FF');
  doc.fillColor(MUTED).fontSize(8.5).font('Helvetica-Bold');
  doc.text('Rule',     50,  y + 4);
  doc.text('Code',    280,  y + 4);
  doc.text('Category',330,  y + 4);
  doc.text('Amount',  460,  y + 4, { align: 'right', width: 75 });
  y += 18;

  // Payslip lines
  payslip.lines.forEach((line, idx) => {
    const bg = idx % 2 === 0 ? WHITE : '#F8FAFC';
    doc.rect(40, y, PAGE_WIDTH, 16).fill(bg).stroke(BORDER);

    // Category-based color for amount
    let amtColor = DARK;
    if (line.category === 'DEDUCTION') amtColor = DANGER;
    if (line.category === 'NET')       amtColor = SUCCESS;
    if (line.category === 'GROSS')     amtColor = PRIMARY;

    const isBold = ['NET', 'GROSS'].includes(line.category);
    const font   = isBold ? 'Helvetica-Bold' : 'Helvetica';

    doc.fillColor(DARK).fontSize(8.5).font(font)
       .text(line.ruleName, 50, y + 4, { width: 220 });
    doc.fillColor(MUTED).fontSize(8).font('Helvetica')
       .text(line.ruleCode, 280, y + 4);
    doc.fillColor(MUTED).fontSize(8).font('Helvetica')
       .text(line.category, 330, y + 4);
    doc.fillColor(amtColor).fontSize(8.5).font(font)
       .text(fmt(line.amount), 460, y + 4, { align: 'right', width: 75 });
    y += 17;
  });

  y += 5;

  // ── SECTION 5: SUMMARY BOX ───────────────────────────────
  doc.rect(40, y, PAGE_WIDTH, 65).fill(LIGHT_BG).stroke(BORDER);

  // Gross
  doc.fillColor(MUTED).fontSize(9).font('Helvetica')
     .text('Gross Salary:', 55, y + 10);
  doc.fillColor(PRIMARY).fontSize(9).font('Helvetica-Bold')
     .text(fmt(payslip.gross), 55, y + 10, { align: 'right', width: PAGE_WIDTH - 30 });

  // Deductions
  doc.fillColor(MUTED).fontSize(9).font('Helvetica')
     .text('Total Deductions:', 55, y + 28);
  doc.fillColor(DANGER).fontSize(9).font('Helvetica-Bold')
     .text(`-${fmt(payslip.deductions)}`, 55, y + 28,
           { align: 'right', width: PAGE_WIDTH - 30 });

  // Net — large bold
  doc.rect(40, y + 44, PAGE_WIDTH, 21).fill(PRIMARY);
  doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
     .text('NET SALARY:', 55, y + 49);
  doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
     .text(fmt(payslip.net), 55, y + 49,
           { align: 'right', width: PAGE_WIDTH - 30 });
  y += 70;

  // ── FOOTER ───────────────────────────────────────────────
  y += 10;
  doc.rect(40, y, PAGE_WIDTH, 1).fill(BORDER); // divider line
  y += 8;

  doc.fillColor(MUTED).fontSize(8).font('Helvetica')
     .text(
       'This is a computer-generated payslip and does not require a signature.',
       50, y, { width: PAGE_WIDTH, align: 'center' }
     );
  y += 14;
  doc.fillColor(MUTED).fontSize(8)
     .text(
       `Generated on ${fmtDate(new Date())} by PeoplePay360`,
       50, y, { width: PAGE_WIDTH, align: 'center' }
     );

  // Finalize PDF
  doc.end();

  // Wait for file to finish writing
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error',  reject);
  });

  // Update payslip with pdfPath
  await prisma.payslip.update({
    where: { id: payslipId },
    data:  { pdfPath: filePath },
  });

  return filePath;
}

module.exports = { generatePayslipPdf };
