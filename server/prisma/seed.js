const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const dayjs = require('dayjs')
require('dotenv').config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const HASH_DEFAULT = bcrypt.hashSync('Password@123', 10)
const HASH_ADMIN   = bcrypt.hashSync('Apy@0108', 10)

async function main() {
  console.log('🌱 Seeding PeoplePay360...')

  // ── 1. Departments ──
  const depts = await Promise.all([
    prisma.department.upsert({ where: { name: 'Engineering' }, update: {}, create: { name: 'Engineering', description: 'Software development and infrastructure' } }),
    prisma.department.upsert({ where: { name: 'Human Resources' }, update: {}, create: { name: 'Human Resources', description: 'People management and recruitment' } }),
    prisma.department.upsert({ where: { name: 'Finance' }, update: {}, create: { name: 'Finance', description: 'Accounting, payroll, and financial planning' } }),
    prisma.department.upsert({ where: { name: 'Sales' }, update: {}, create: { name: 'Sales', description: 'Revenue and client relations' } }),
    prisma.department.upsert({ where: { name: 'Operations' }, update: {}, create: { name: 'Operations', description: 'Business operations and logistics' } }),
  ])
  const [eng, hr, finance, sales, ops] = depts
  console.log('✅ Departments seeded')

  // ── 2. Job Positions ──
  const positions = await Promise.all([
    prisma.jobPosition.upsert({ where: { title: 'Software Engineer' }, update: {}, create: { title: 'Software Engineer' } }),
    prisma.jobPosition.upsert({ where: { title: 'Senior Software Engineer' }, update: {}, create: { title: 'Senior Software Engineer' } }),
    prisma.jobPosition.upsert({ where: { title: 'HR Manager' }, update: {}, create: { title: 'HR Manager' } }),
    prisma.jobPosition.upsert({ where: { title: 'Payroll Specialist' }, update: {}, create: { title: 'Payroll Specialist' } }),
    prisma.jobPosition.upsert({ where: { title: 'Financial Analyst' }, update: {}, create: { title: 'Financial Analyst' } }),
    prisma.jobPosition.upsert({ where: { title: 'Sales Representative' }, update: {}, create: { title: 'Sales Representative' } }),
    prisma.jobPosition.upsert({ where: { title: 'Operations Manager' }, update: {}, create: { title: 'Operations Manager' } }),
  ])
  const [swEng, srSwEng, hrMgr, payrollSpec, finAnalyst, salesRep, opsMgr] = positions
  console.log('✅ Job positions seeded')

  // ── 3. Working Schedules ──
  const std40 = await prisma.workingSchedule.upsert({
    where: { name: 'Standard 40h Week' },
    update: {},
    create: {
      name: 'Standard 40h Week',
      scheduleType: 'FIXED',
      weeklyHours: 35,
      lines: {
        create: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].map(day => ({
          dayOfWeek: day, startTime: '09:00', endTime: '17:00',
          breakMinutes: 60, workedHours: 7,
        })),
      },
    },
  })

  const ext45 = await prisma.workingSchedule.upsert({
    where: { name: 'Extended 45h Week' },
    update: {},
    create: {
      name: 'Extended 45h Week',
      scheduleType: 'FIXED',
      weeklyHours: 45,
      lines: {
        create: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].map(day => ({
          dayOfWeek: day, startTime: '08:00', endTime: '18:00',
          breakMinutes: 60, workedHours: 9,
        })),
      },
    },
  })

  const partTime = await prisma.workingSchedule.upsert({
    where: { name: 'Part-Time 3 Days' },
    update: {},
    create: {
      name: 'Part-Time 3 Days',
      scheduleType: 'FIXED',
      weeklyHours: 12,
      lines: {
        create: ['MONDAY','WEDNESDAY','FRIDAY'].map(day => ({
          dayOfWeek: day, startTime: '09:00', endTime: '13:00',
          breakMinutes: 0, workedHours: 4,
        })),
      },
    },
  })
  console.log('✅ Working schedules seeded')

  // ── 4. Time Off Types ──
  const [annual, sick, unpaid, maternity, compassionate] = await Promise.all([
    prisma.timeOffType.upsert({ where: { code: 'ANNUAL' }, update: {}, create: { name: 'Annual Leave', code: 'ANNUAL', unit: 'DAYS', requiresAllocation: true, approvalMode: 'HR_MANAGER', isPaid: true, maxDaysPerYear: 21, color: '#3B82F6' } }),
    prisma.timeOffType.upsert({ where: { code: 'SICK' }, update: {}, create: { name: 'Sick Leave', code: 'SICK', unit: 'DAYS', requiresAllocation: false, approvalMode: 'HR_MANAGER', isPaid: true, maxDaysPerYear: 14, color: '#EF4444' } }),
    prisma.timeOffType.upsert({ where: { code: 'UNPAID' }, update: {}, create: { name: 'Unpaid Leave', code: 'UNPAID', unit: 'DAYS', requiresAllocation: false, approvalMode: 'HR_MANAGER', isPaid: false, color: '#6B7280' } }),
    prisma.timeOffType.upsert({ where: { code: 'MATERNITY' }, update: {}, create: { name: 'Maternity Leave', code: 'MATERNITY', unit: 'DAYS', requiresAllocation: true, approvalMode: 'HR_MANAGER', isPaid: true, maxDaysPerYear: 90, color: '#EC4899' } }),
    prisma.timeOffType.upsert({ where: { code: 'COMPASSIONATE' }, update: {}, create: { name: 'Compassionate Leave', code: 'COMPASSIONATE', unit: 'DAYS', requiresAllocation: false, approvalMode: 'HR_MANAGER', isPaid: true, maxDaysPerYear: 5, color: '#8B5CF6' } }),
  ])
  console.log('✅ Time off types seeded')

  // ── 5. Salary Structure + Rules ──
  const structure = await prisma.salaryStructure.upsert({
    where: { code: 'REG_MONTHLY' },
    update: {},
    create: {
      name: 'Regular Monthly Salary',
      code: 'REG_MONTHLY',
      description: 'Standard monthly salary structure with allowances and statutory deductions',
      isActive: true,
      rules: {
        create: [
          { name: 'Basic Salary',          code: 'BASIC',        category: 'BASIC',        sequence: 1,  computationMethod: 'FIXED',      fixedAmount: 0,   description: 'Base wage from contract (auto-overridden)' },
          { name: 'Transport Allowance',   code: 'TRANS_ALLOW',  category: 'ALLOWANCE',    sequence: 10, computationMethod: 'FIXED',      fixedAmount: 500, appearsOnPayslip: true },
          { name: 'Meal Allowance',        code: 'MEAL_ALLOW',   category: 'ALLOWANCE',    sequence: 20, computationMethod: 'FIXED',      fixedAmount: 300, appearsOnPayslip: true },
          { name: 'Housing Allowance',     code: 'HOUSE_ALLOW',  category: 'ALLOWANCE',    sequence: 30, computationMethod: 'PERCENTAGE', percentage: 10,   percentageBase: 'BASIC', appearsOnPayslip: true },
          { name: 'Gross Salary',          code: 'GROSS',        category: 'GROSS',        sequence: 40, computationMethod: 'FORMULA',    formula: 'BASIC + TRANS_ALLOW + MEAL_ALLOW + HOUSE_ALLOW', appearsOnPayslip: true },
          { name: 'Income Tax',            code: 'INCOME_TAX',   category: 'DEDUCTION',    sequence: 50, computationMethod: 'PERCENTAGE', percentage: 15,   percentageBase: 'GROSS', appearsOnPayslip: true },
          { name: 'Social Security',       code: 'SOC_SEC',      category: 'DEDUCTION',    sequence: 60, computationMethod: 'PERCENTAGE', percentage: 5,    percentageBase: 'GROSS', appearsOnPayslip: true },
          { name: 'Health Insurance',      code: 'HEALTH_INS',   category: 'DEDUCTION',    sequence: 70, computationMethod: 'FIXED',      fixedAmount: 200, appearsOnPayslip: true },
          { name: 'Pension Contribution',  code: 'PENSION',      category: 'CONTRIBUTION', sequence: 80, computationMethod: 'PERCENTAGE', percentage: 6,    percentageBase: 'GROSS', appearsOnPayslip: true },
          { name: 'Net Salary',            code: 'NET',          category: 'NET',          sequence: 90, computationMethod: 'FORMULA',    formula: 'GROSS - INCOME_TAX - SOC_SEC - HEALTH_INS', appearsOnPayslip: true },
        ],
      },
    },
  })
  console.log('✅ Salary structure and rules seeded')

  // ── 6. Users + Employees ──
  const employeeData = [
    {
      email: 'apy0108@gmail.com',
      role: 'ADMIN',
      firstName: 'Arjun',
      lastName: 'Pawar',
      dept: hr, pos: hrMgr, schedule: std40,
      wage: 10000, num: 'EMP-001', hire: '2022-01-01',
      type: 'FULL_TIME', bank: 'ACC-001-AP', bankName: 'HDFC Bank'
    },
    {
      email: 'priya.sharma@company.com',
      role: 'HR_MANAGER',
      firstName: 'Priya',
      lastName: 'Sharma',
      dept: hr, pos: hrMgr, schedule: std40,
      wage: 8000, num: 'EMP-002', hire: '2022-03-15',
      type: 'FULL_TIME', bank: 'ACC-002-PS', bankName: 'SBI'
    },
    {
      email: 'rohan.mehta@company.com',
      role: 'HR_PAYROLL_MANAGER',
      firstName: 'Rohan',
      lastName: 'Mehta',
      dept: finance, pos: finAnalyst, schedule: std40,
      wage: 9000, num: 'EMP-003', hire: '2022-02-01',
      type: 'FULL_TIME', bank: 'ACC-003-RM', bankName: 'ICICI Bank'
    },
    {
      email: 'sneha.kulkarni@company.com',
      role: 'HR_PAYROLL_USER',
      firstName: 'Sneha',
      lastName: 'Kulkarni',
      dept: finance, pos: payrollSpec, schedule: std40,
      wage: 7500, num: 'EMP-004', hire: '2022-06-01',
      type: 'FULL_TIME', bank: 'ACC-004-SK', bankName: 'Axis Bank'
    },
    {
      email: 'vikram.nair@company.com',
      role: 'EMPLOYEE',
      firstName: 'Vikram',
      lastName: 'Nair',
      dept: eng, pos: swEng, schedule: std40,
      wage: 6000, num: 'EMP-005', hire: '2023-01-10',
      type: 'FULL_TIME', bank: 'ACC-005-VN', bankName: 'HDFC Bank'
    },
    {
      email: 'ananya.iyer@company.com',
      role: 'EMPLOYEE',
      firstName: 'Ananya',
      lastName: 'Iyer',
      dept: eng, pos: srSwEng, schedule: ext45,
      wage: 7200, num: 'EMP-006', hire: '2022-09-01',
      type: 'FULL_TIME', bank: 'ACC-006-AI', bankName: 'Kotak Bank'
    },
    {
      email: 'rahul.desai@company.com',
      role: 'EMPLOYEE',
      firstName: 'Rahul',
      lastName: 'Desai',
      dept: sales, pos: salesRep, schedule: std40,
      wage: 5500, num: 'EMP-007', hire: '2023-03-20',
      type: 'FULL_TIME', bank: null, bankName: null
    },
    {
      email: 'kavita.reddy@company.com',
      role: 'EMPLOYEE',
      firstName: 'Kavita',
      lastName: 'Reddy',
      dept: ops, pos: opsMgr, schedule: std40,
      wage: 6800, num: 'EMP-008', hire: '2022-11-01',
      type: 'FULL_TIME', bank: 'ACC-008-KR', bankName: 'SBI'
    },
  ]

  const createdEmployees = []

  for (const e of employeeData) {
    const user = await prisma.user.upsert({
      where: { email: e.email },
      update: {},
      create: {
        email: e.email,
        passwordHash: e.email === 'apy0108@gmail.com' ? HASH_ADMIN : HASH_DEFAULT,
        role: e.role
      },
    })

    const employee = await prisma.employee.upsert({
      where: { employeeNumber: e.num },
      update: {},
      create: {
        employeeNumber: e.num,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        hireDate: new Date(e.hire),
        status: 'ACTIVE',
        bankAccountNumber: e.bank,
        bankName: e.bankName,
        userId: user.id,
        departmentId: e.dept.id,
        jobPositionId: e.pos.id,
        workingScheduleId: e.schedule.id,
      },
    })

    // Create ACTIVE contract
    await prisma.contract.upsert({
      where: { contractRef: `CTR-${e.num}` },
      update: {},
      create: {
        contractRef: `CTR-${e.num}`,
        employeeId: employee.id,
        startDate: new Date('2024-01-01'),
        contractType: e.type,
        status: 'ACTIVE',
        wage: e.wage,
        wageType: 'MONTHLY',
        departmentId: e.dept.id,
        jobPositionId: e.pos.id,
        workingScheduleId: e.schedule.id,
        salaryStructureId: structure.id,
      },
    })

    // Create approved Annual Leave allocation (21 days, valid full year)
    await prisma.timeOffAllocation.create({
      data: {
        employeeId: employee.id,
        timeOffTypeId: annual.id,
        numberOfDays: 21,
        usedDays: 0,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31'),
        status: 'APPROVED',
        approvedBy: 'seed',
        approvedAt: new Date('2024-01-01'),
      },
    })

    createdEmployees.push(employee)
  }
  console.log('✅ Users and employees seeded')

  // ── 7. Attendance (last 60 working days for all employees) ──
  const statuses = ['PRESENT','PRESENT','PRESENT','PRESENT','LATE','PRESENT','PRESENT','PRESENT','ABSENT','PRESENT']
  let attendanceDate = dayjs().subtract(60, 'day')
  const today = dayjs()

  for (const emp of createdEmployees) {
    let d = attendanceDate
    while (d.isBefore(today)) {
      const dow = d.day()
      if (dow !== 0 && dow !== 6) { // Mon-Fri only
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const checkInHour = status === 'LATE' ? 10 : 9
        const checkIn = d.hour(checkInHour).minute(0).second(0).toDate()
        const checkOut = d.hour(17).minute(0).second(0).toDate()
        const workedHours = status === 'ABSENT' ? 0 : (17 - checkInHour) - 1 // minus 1hr break
        if (status !== 'ABSENT') {
          await prisma.attendance.create({
            data: {
              employeeId: emp.id,
              checkIn,
              checkOut: status === 'ABSENT' ? null : checkOut,
              workedHours: status === 'ABSENT' ? 0 : workedHours,
              status,
            },
          })
        }
      }
      d = d.add(1, 'day')
    }
  }
  console.log('✅ Attendance records seeded (60 days)')

  // ── 8. Sample Time Off Requests ──
  const emp5 = createdEmployees[4] // John Doe
  const emp5Alloc = await prisma.timeOffAllocation.findFirst({
    where: { employeeId: emp5.id, timeOffTypeId: annual.id }
  })
  await prisma.timeOffRequest.create({
    data: {
      employeeId: emp5.id,
      timeOffTypeId: annual.id,
      allocationId: emp5Alloc?.id,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-08-05'),
      numberOfDays: 5,
      description: 'Summer vacation',
      status: 'APPROVED',
      approvedBy: 'seed',
      approvedAt: new Date('2024-07-15'),
    },
  })

  const emp6 = createdEmployees[5] // Jane Smith
  await prisma.timeOffRequest.create({
    data: {
      employeeId: emp6.id,
      timeOffTypeId: sick.id,
      startDate: dayjs().subtract(2, 'day').toDate(),
      endDate: dayjs().subtract(1, 'day').toDate(),
      numberOfDays: 2,
      description: 'Flu',
      status: 'PENDING',
    },
  })
  console.log('✅ Time off requests seeded')

  // ── 9. Completed Payrun for July 2024 ──
  const julyPayrun = await prisma.payrun.create({
    data: {
      name: 'July 2024 Payroll',
      salaryStructureId: structure.id,
      periodStart: new Date('2024-07-01'),
      periodEnd: new Date('2024-07-31'),
      status: 'PAID',
      createdBy: 'seed',
      paidAt: new Date('2024-07-31'),
    },
  })

  // For each employee, create a computed payslip
  const contracts = await prisma.contract.findMany({
    where: { status: 'ACTIVE' },
    include: { employee: true }
  })
  const rules = await prisma.salaryRule.findMany({
    where: { structures: { some: { id: structure.id } } },
    orderBy: { sequence: 'asc' }
  })

  for (const contract of contracts) {
    const computed = {}
    const lines = []

    for (const rule of rules) {
      let amount = 0
      if (rule.code === 'BASIC') {
        amount = contract.wage
      } else if (rule.computationMethod === 'FIXED') {
        amount = rule.fixedAmount || 0
      } else if (rule.computationMethod === 'PERCENTAGE') {
        amount = ((rule.percentage || 0) / 100) * (computed[rule.percentageBase] || 0)
      } else if (rule.computationMethod === 'FORMULA') {
        // Simple formula evaluation: replace code names with computed values
        let formula = rule.formula || '0'
        for (const [code, val] of Object.entries(computed)) {
          formula = formula.replaceAll(code, val.toString())
        }
        try { amount = eval(formula) } catch { amount = 0 }
      }
      computed[rule.code] = Math.round(amount * 100) / 100
      if (rule.appearsOnPayslip) {
        lines.push({ salaryRuleId: rule.id, name: rule.name, code: rule.code, category: rule.category, sequence: rule.sequence, amount: computed[rule.code] })
      }
    }

    const warnings = []
    if (!contract.employee.bankAccountNumber) {
      warnings.push({ message: 'Employee has no bank account number on file.', severity: 'WARNING' })
    }

    await prisma.payslip.create({
      data: {
        payrunId: julyPayrun.id,
        employeeId: contract.employeeId,
        contractId: contract.id,
        periodStart: new Date('2024-07-01'),
        periodEnd: new Date('2024-07-31'),
        status: 'PAID',
        workedDays: 23,
        basicSalary: computed['BASIC'] || 0,
        totalAllowances: (computed['TRANS_ALLOW'] || 0) + (computed['MEAL_ALLOW'] || 0) + (computed['HOUSE_ALLOW'] || 0),
        grossSalary: computed['GROSS'] || 0,
        totalDeductions: (computed['INCOME_TAX'] || 0) + (computed['SOC_SEC'] || 0) + (computed['HEALTH_INS'] || 0),
        totalContributions: computed['PENSION'] || 0,
        netSalary: computed['NET'] || 0,
        lines: { create: lines },
        warnings: { create: warnings },
      },
    })
  }
  console.log('✅ July 2024 payrun and payslips seeded')

  console.log('\n🎉 Seed complete! Login credentials:')
  console.log('   apy0108@gmail.com         → ADMIN       (password: Apy@0108)')
  console.log('   priya.sharma@company.com  → HR_MANAGER  (password: Password@123)')
  console.log('   rohan.mehta@company.com   → HR_PAYROLL_MANAGER')
  console.log('   sneha.kulkarni@company.com→ HR_PAYROLL_USER')
  console.log('   vikram.nair@company.com   → EMPLOYEE')
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
