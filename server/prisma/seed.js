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
  const paidLeave = await prisma.timeOffType.upsert({
    where: { name: 'Paid Time Off' },
    update: {},
    create: {
      name: 'Paid Time Off',
      unit: 'DAYS',
      requiresAllocation: true,
      approval: 'MANAGER',
      payrollWorkEntry: 'Leave Work Entry',
      displayColor: 'blue',
      configNotes: 'Standard annual leave. Balance comes from approved allocations.',
      active: true,
    },
  })

  const sickLeave = await prisma.timeOffType.upsert({
    where: { name: 'Sick Leave' },
    update: {},
    create: {
      name: 'Sick Leave',
      unit: 'DAYS',
      requiresAllocation: false,
      approval: 'MANAGER',
      payrollWorkEntry: 'Leave Work Entry',
      displayColor: 'red',
      configNotes: 'No allocation required. Employee submits; manager approves.',
      active: true,
    },
  })

  const compOff = await prisma.timeOffType.upsert({
    where: { name: 'Comp Off' },
    update: {},
    create: {
      name: 'Comp Off',
      unit: 'HOURS',
      requiresAllocation: true,
      approval: 'OFFICER',
      payrollWorkEntry: 'Leave Work Entry',
      displayColor: 'green',
      configNotes: 'Compensatory off tracked in hours.',
      active: true,
    },
  })
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
    {
      email: 'aditya.kapoor@company.com',
      role: 'EMPLOYEE',
      firstName: 'Aditya',
      lastName: 'Kapoor',
      dept: eng, pos: swEng, schedule: std40,
      wage: 6100, num: 'EMP-009', hire: '2023-04-03',
      type: 'FULL_TIME', bank: 'ACC-009-AK', bankName: 'HDFC Bank'
    },
    {
      email: 'meera.joshi@company.com',
      role: 'EMPLOYEE',
      firstName: 'Meera',
      lastName: 'Joshi',
      dept: eng, pos: srSwEng, schedule: ext45,
      wage: 7800, num: 'EMP-010', hire: '2022-12-12',
      type: 'FULL_TIME', bank: 'ACC-010-MJ', bankName: 'ICICI Bank'
    },
    {
      email: 'sanjay.patel@company.com',
      role: 'EMPLOYEE',
      firstName: 'Sanjay',
      lastName: 'Patel',
      dept: finance, pos: finAnalyst, schedule: std40,
      wage: 6400, num: 'EMP-011', hire: '2023-05-15',
      type: 'FULL_TIME', bank: 'ACC-011-SP', bankName: 'Axis Bank'
    },
    {
      email: 'nisha.verma@company.com',
      role: 'EMPLOYEE',
      firstName: 'Nisha',
      lastName: 'Verma',
      dept: finance, pos: payrollSpec, schedule: std40,
      wage: 5900, num: 'EMP-012', hire: '2023-07-01',
      type: 'FULL_TIME', bank: 'ACC-012-NV', bankName: 'SBI'
    },
    {
      email: 'arvind.menon@company.com',
      role: 'EMPLOYEE',
      firstName: 'Arvind',
      lastName: 'Menon',
      dept: sales, pos: salesRep, schedule: std40,
      wage: 5600, num: 'EMP-013', hire: '2023-02-14',
      type: 'FULL_TIME', bank: 'ACC-013-AM', bankName: 'Kotak Bank'
    },
    {
      email: 'pooja.singh@company.com',
      role: 'EMPLOYEE',
      firstName: 'Pooja',
      lastName: 'Singh',
      dept: sales, pos: salesRep, schedule: partTime,
      wage: 3200, num: 'EMP-014', hire: '2024-01-08',
      type: 'PART_TIME', bank: null, bankName: null
    },
    {
      email: 'manish.gupta@company.com',
      role: 'EMPLOYEE',
      firstName: 'Manish',
      lastName: 'Gupta',
      dept: ops, pos: opsMgr, schedule: ext45,
      wage: 7100, num: 'EMP-015', hire: '2022-08-22',
      type: 'FULL_TIME', bank: 'ACC-015-MG', bankName: 'HDFC Bank'
    },
    {
      email: 'riya.fernandes@company.com',
      role: 'EMPLOYEE',
      firstName: 'Riya',
      lastName: 'Fernandes',
      dept: hr, pos: hrMgr, schedule: std40,
      wage: 6900, num: 'EMP-016', hire: '2023-06-19',
      type: 'FULL_TIME', bank: 'ACC-016-RF', bankName: 'ICICI Bank'
    },
    {
      email: 'deepak.malhotra@company.com',
      role: 'EMPLOYEE',
      firstName: 'Deepak',
      lastName: 'Malhotra',
      dept: eng, pos: swEng, schedule: std40,
      wage: 6200, num: 'EMP-017', hire: '2024-02-05',
      type: 'FULL_TIME', bank: 'ACC-017-DM', bankName: 'SBI'
    },
    {
      email: 'simran.kaur@company.com',
      role: 'EMPLOYEE',
      firstName: 'Simran',
      lastName: 'Kaur',
      dept: eng, pos: srSwEng, schedule: ext45,
      wage: 8100, num: 'EMP-018', hire: '2022-05-09',
      type: 'FULL_TIME', bank: 'ACC-018-SK', bankName: 'Axis Bank'
    },
    {
      email: 'rohit.saxena@company.com',
      role: 'EMPLOYEE',
      firstName: 'Rohit',
      lastName: 'Saxena',
      dept: finance, pos: finAnalyst, schedule: std40,
      wage: 6700, num: 'EMP-019', hire: '2023-09-11',
      type: 'FULL_TIME', bank: 'ACC-019-RS', bankName: 'HDFC Bank'
    },
    {
      email: 'tanvi.bose@company.com',
      role: 'EMPLOYEE',
      firstName: 'Tanvi',
      lastName: 'Bose',
      dept: finance, pos: payrollSpec, schedule: std40,
      wage: 6000, num: 'EMP-020', hire: '2024-03-18',
      type: 'FULL_TIME', bank: 'ACC-020-TB', bankName: 'SBI'
    },
    {
      email: 'amit.choudhary@company.com',
      role: 'EMPLOYEE',
      firstName: 'Amit',
      lastName: 'Choudhary',
      dept: sales, pos: salesRep, schedule: std40,
      wage: 5700, num: 'EMP-021', hire: '2023-10-02',
      type: 'FULL_TIME', bank: null, bankName: null
    },
    {
      email: 'neha.agarwal@company.com',
      role: 'EMPLOYEE',
      firstName: 'Neha',
      lastName: 'Agarwal',
      dept: sales, pos: salesRep, schedule: partTime,
      wage: 3400, num: 'EMP-022', hire: '2024-04-15',
      type: 'PART_TIME', bank: 'ACC-022-NA', bankName: 'Kotak Bank'
    },
    {
      email: 'suresh.rao@company.com',
      role: 'EMPLOYEE',
      firstName: 'Suresh',
      lastName: 'Rao',
      dept: ops, pos: opsMgr, schedule: std40,
      wage: 7000, num: 'EMP-023', hire: '2022-10-17',
      type: 'FULL_TIME', bank: 'ACC-023-SR', bankName: 'ICICI Bank'
    },
    {
      email: 'aarti.mishra@company.com',
      role: 'EMPLOYEE',
      firstName: 'Aarti',
      lastName: 'Mishra',
      dept: hr, pos: hrMgr, schedule: std40,
      wage: 7300, num: 'EMP-024', hire: '2023-01-23',
      type: 'FULL_TIME', bank: 'ACC-024-AM', bankName: 'HDFC Bank'
    },
    {
      email: 'kunal.bhatia@company.com',
      role: 'EMPLOYEE',
      firstName: 'Kunal',
      lastName: 'Bhatia',
      dept: eng, pos: swEng, schedule: std40,
      wage: 6300, num: 'EMP-025', hire: '2024-05-06',
      type: 'FULL_TIME', bank: 'ACC-025-KB', bankName: 'Axis Bank'
    },
    {
      email: 'lavanya.krishnan@company.com',
      role: 'EMPLOYEE',
      firstName: 'Lavanya',
      lastName: 'Krishnan',
      dept: eng, pos: srSwEng, schedule: ext45,
      wage: 8200, num: 'EMP-026', hire: '2022-07-04',
      type: 'FULL_TIME', bank: 'ACC-026-LK', bankName: 'SBI'
    },
    {
      email: 'tarun.yadav@company.com',
      role: 'EMPLOYEE',
      firstName: 'Tarun',
      lastName: 'Yadav',
      dept: finance, pos: finAnalyst, schedule: std40,
      wage: 6500, num: 'EMP-027', hire: '2023-11-13',
      type: 'FULL_TIME', bank: 'ACC-027-TY', bankName: 'HDFC Bank'
    },
    {
      email: 'shruti.das@company.com',
      role: 'EMPLOYEE',
      firstName: 'Shruti',
      lastName: 'Das',
      dept: finance, pos: payrollSpec, schedule: std40,
      wage: 6100, num: 'EMP-028', hire: '2024-06-10',
      type: 'FULL_TIME', bank: 'ACC-028-SD', bankName: 'ICICI Bank'
    },
    {
      email: 'mohit.tiwari@company.com',
      role: 'EMPLOYEE',
      firstName: 'Mohit',
      lastName: 'Tiwari',
      dept: sales, pos: salesRep, schedule: std40,
      wage: 5800, num: 'EMP-029', hire: '2023-08-07',
      type: 'FULL_TIME', bank: 'ACC-029-MT', bankName: 'SBI'
    },
    {
      email: 'ishita.roy@company.com',
      role: 'EMPLOYEE',
      firstName: 'Ishita',
      lastName: 'Roy',
      dept: sales, pos: salesRep, schedule: partTime,
      wage: 3500, num: 'EMP-030', hire: '2024-07-01',
      type: 'PART_TIME', bank: null, bankName: null
    },
    {
      email: 'rakesh.iyer@company.com',
      role: 'EMPLOYEE',
      firstName: 'Rakesh',
      lastName: 'Iyer',
      dept: ops, pos: opsMgr, schedule: ext45,
      wage: 7200, num: 'EMP-031', hire: '2022-04-25',
      type: 'FULL_TIME', bank: 'ACC-031-RI', bankName: 'Kotak Bank'
    },
    {
      email: 'sonal.thakur@company.com',
      role: 'EMPLOYEE',
      firstName: 'Sonal',
      lastName: 'Thakur',
      dept: hr, pos: hrMgr, schedule: std40,
      wage: 7400, num: 'EMP-032', hire: '2023-12-04',
      type: 'FULL_TIME', bank: 'ACC-032-ST', bankName: 'Axis Bank'
    },
    {
      email: 'varun.sethi@company.com',
      role: 'EMPLOYEE',
      firstName: 'Varun',
      lastName: 'Sethi',
      dept: eng, pos: swEng, schedule: std40,
      wage: 6050, num: 'EMP-033', hire: '2024-08-12',
      type: 'FULL_TIME', bank: 'ACC-033-VS', bankName: 'HDFC Bank'
    },
    {
      email: 'payal.naik@company.com',
      role: 'EMPLOYEE',
      firstName: 'Payal',
      lastName: 'Naik',
      dept: eng, pos: srSwEng, schedule: ext45,
      wage: 8000, num: 'EMP-034', hire: '2022-06-27',
      type: 'FULL_TIME', bank: 'ACC-034-PN', bankName: 'SBI'
    },
    {
      email: 'harish.jain@company.com',
      role: 'EMPLOYEE',
      firstName: 'Harish',
      lastName: 'Jain',
      dept: finance, pos: finAnalyst, schedule: std40,
      wage: 6600, num: 'EMP-035', hire: '2023-09-25',
      type: 'FULL_TIME', bank: 'ACC-035-HJ', bankName: 'ICICI Bank'
    },
    {
      email: 'divya.nambiar@company.com',
      role: 'EMPLOYEE',
      firstName: 'Divya',
      lastName: 'Nambiar',
      dept: finance, pos: payrollSpec, schedule: std40,
      wage: 6150, num: 'EMP-036', hire: '2024-09-02',
      type: 'FULL_TIME', bank: 'ACC-036-DN', bankName: 'Axis Bank'
    },
    {
      email: 'sameer.ahmed@company.com',
      role: 'EMPLOYEE',
      firstName: 'Sameer',
      lastName: 'Ahmed',
      dept: sales, pos: salesRep, schedule: std40,
      wage: 5750, num: 'EMP-037', hire: '2023-05-29',
      type: 'FULL_TIME', bank: 'ACC-037-SA', bankName: 'HDFC Bank'
    },
    {
      email: 'kriti.pandey@company.com',
      role: 'EMPLOYEE',
      firstName: 'Kriti',
      lastName: 'Pandey',
      dept: ops, pos: opsMgr, schedule: std40,
      wage: 6850, num: 'EMP-038', hire: '2024-10-07',
      type: 'FULL_TIME', bank: null, bankName: null
    },
  ]

  const createdEmployees = []
  let contractIdx = 0

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

    contractIdx++
    const contractRef = `CON/2026/${String(contractIdx).padStart(3, '0')}`

    // Create ACTIVE contract
    await prisma.contract.upsert({
      where: { contractRef },
      update: {},
      create: {
        contractRef,
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

    // Phase 6: Allocations will be seeded in dedicated section below
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

  // ── 8. Phase 6 Time Off Allocations and Requests ──
  const adminUser = await prisma.user.findUnique({ where: { email: 'apy0108@gmail.com' } })
  const empVikram = createdEmployees.find(e => e.workEmail === 'vikram.nair@company.com')
  const empAnanya = createdEmployees.find(e => e.workEmail === 'ananya.iyer@company.com')
  const empRahul = createdEmployees.find(e => e.workEmail === 'rahul.desai@company.com')

  // Allocations
  let vikramPtoAlloc, vikramCompAlloc, ananyaPtoAlloc, rahulCompAlloc;
  if (empVikram) {
    vikramPtoAlloc = await prisma.timeOffAllocation.create({
      data: {
        employeeId: empVikram.id,
        timeOffTypeId: paidLeave.id,
        allocated: 21,
        taken: 5, // Rule T2: Vikram has 5 days approved taken
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
        status: 'APPROVED',
        approvedById: adminUser?.id,
        approvedAt: new Date('2026-01-01'),
      },
    })

    vikramCompAlloc = await prisma.timeOffAllocation.create({
      data: {
        employeeId: empVikram.id,
        timeOffTypeId: compOff.id,
        allocated: 8,
        taken: 0,
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
        status: 'APPROVED',
        approvedById: adminUser?.id,
        approvedAt: new Date('2026-01-01'),
      },
    })
  }

  if (empAnanya) {
    ananyaPtoAlloc = await prisma.timeOffAllocation.create({
      data: {
        employeeId: empAnanya.id,
        timeOffTypeId: paidLeave.id,
        allocated: 21,
        taken: 0,
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
        status: 'APPROVED',
        approvedById: adminUser?.id,
        approvedAt: new Date('2026-01-01'),
      },
    })
  }

  if (empRahul) {
    rahulCompAlloc = await prisma.timeOffAllocation.create({
      data: {
        employeeId: empRahul.id,
        timeOffTypeId: compOff.id,
        allocated: 16,
        taken: 0,
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2026-12-31'),
        status: 'APPROVED',
        approvedById: adminUser?.id,
        approvedAt: new Date('2026-01-01'),
      },
    })
  }
  console.log('✅ Phase 6 Allocations seeded')

  // Requests
  if (empVikram && vikramPtoAlloc) {
    await prisma.timeOffRequest.create({
      data: {
        employeeId: empVikram.id,
        timeOffTypeId: paidLeave.id,
        startDate: new Date('2026-09-12'),
        endDate: new Date('2026-09-16'),
        duration: 5,
        status: 'APPROVED',
        description: 'Family vacation in Kerala',
        approvedById: adminUser?.id,
        approvedAt: new Date('2026-09-01'),
      },
    })
  }

  if (empAnanya) {
    await prisma.timeOffRequest.create({
      data: {
        employeeId: empAnanya.id,
        timeOffTypeId: sickLeave.id,
        startDate: dayjs().toDate(),
        endDate: dayjs().add(1, 'day').toDate(),
        duration: 2,
        status: 'PENDING',
        description: 'Viral fever and rest prescribed by doctor',
      },
    })
  }

  if (empRahul) {
    await prisma.timeOffRequest.create({
      data: {
        employeeId: empRahul.id,
        timeOffTypeId: compOff.id,
        startDate: dayjs().toDate(),
        endDate: dayjs().toDate(),
        duration: 4,
        status: 'PENDING',
        description: 'Comp off for weekend support activity',
      },
    })
  }
  console.log('✅ Phase 6 Time off requests seeded')

  // ── 8b. Attendance Records ──
  const seedAttendances = [
    // Today session in progress for EMP-002 (Priya Sharma)
    {
      employeeId: createdEmployees[1].id,
      checkIn: dayjs().hour(9).minute(0).second(0).toDate(),
      checkOut: null,
      workedHours: 0,
      overtime: 0,
      status: 'PRESENT',
      notes: 'Checked in via TopNav widget',
    },
    // Yesterday - EMP-001 (Arjun Pawar) - Normal day
    {
      employeeId: createdEmployees[0].id,
      checkIn: dayjs().subtract(1, 'day').hour(9).minute(0).toDate(),
      checkOut: dayjs().subtract(1, 'day').hour(17).minute(0).toDate(),
      workedHours: 8,
      overtime: 0,
      status: 'PRESENT',
    },
    // Yesterday - EMP-002 (Priya Sharma) - Overtime day
    {
      employeeId: createdEmployees[1].id,
      checkIn: dayjs().subtract(1, 'day').hour(8).minute(55).toDate(),
      checkOut: dayjs().subtract(1, 'day').hour(19).minute(30).toDate(),
      workedHours: 10.58,
      overtime: 2.58,
      status: 'PRESENT',
      notes: 'Quarterly compliance and payroll review preparation',
    },
    // Yesterday - EMP-003 (Rohan Mehta) - Late check-in
    {
      employeeId: createdEmployees[2].id,
      checkIn: dayjs().subtract(1, 'day').hour(9).minute(45).toDate(),
      checkOut: dayjs().subtract(1, 'day').hour(17).minute(15).toDate(),
      workedHours: 7.5,
      overtime: 0,
      status: 'LATE',
      reason: 'Metro signal failure on blue line',
    },
    // Yesterday - EMP-004 (Sneha Kulkarni) - Half day
    {
      employeeId: createdEmployees[3].id,
      checkIn: dayjs().subtract(1, 'day').hour(9).minute(0).toDate(),
      checkOut: dayjs().subtract(1, 'day').hour(13).minute(0).toDate(),
      workedHours: 4,
      overtime: 0,
      status: 'HALF_DAY',
      reason: 'Personal errand in afternoon',
    },
    // Yesterday - EMP-005 (Vikram Nair - Regular employee) - Normal
    {
      employeeId: createdEmployees[4].id,
      checkIn: dayjs().subtract(1, 'day').hour(9).minute(5).toDate(),
      checkOut: dayjs().subtract(1, 'day').hour(17).minute(10).toDate(),
      workedHours: 8.08,
      overtime: 0.08,
      status: 'PRESENT',
    },
    // Yesterday - EMP-006 (Ananya Iyer) - Absent auto-generated
    {
      employeeId: createdEmployees[5].id,
      checkIn: null,
      checkOut: null,
      workedHours: 0,
      overtime: 0,
      status: 'ABSENT',
      notes: `Auto-generated: No check-in recorded for ${dayjs().subtract(1, 'day').format('YYYY-MM-DD')}`,
    },
    // 2 days ago - EMP-005 (Vikram Nair) - Manual edit record with audit log
    {
      employeeId: createdEmployees[4].id,
      checkIn: dayjs().subtract(2, 'day').hour(8).minute(30).toDate(),
      checkOut: dayjs().subtract(2, 'day').hour(18).minute(30).toDate(),
      workedHours: 10,
      overtime: 2,
      status: 'PRESENT',
      isManualEdit: true,
      editedBy: 'Priya Sharma (HR_MANAGER)',
      editNote: 'Corrected punch out failure per swipe card logs',
      notes: `Biometric scanner glitch at turnstile #2\n[${dayjs().subtract(2, 'day').format('YYYY-MM-DD')} 18:45] Edited by Priya Sharma (HR_MANAGER): Corrected punch out failure per swipe card logs`,
    },
    // 2 days ago - EMP-007 (Rahul Desai) - On Leave
    {
      employeeId: createdEmployees[6].id,
      checkIn: null,
      checkOut: null,
      workedHours: 0,
      overtime: 0,
      status: 'ON_LEAVE',
      notes: 'Approved medical consultation leave',
    },
    // 2 days ago - EMP-008 (Kavita Reddy) - Late
    {
      employeeId: createdEmployees[7].id,
      checkIn: dayjs().subtract(2, 'day').hour(9).minute(35).toDate(),
      checkOut: dayjs().subtract(2, 'day').hour(17).minute(5).toDate(),
      workedHours: 7.5,
      overtime: 0,
      status: 'LATE',
      reason: 'Highway traffic bottleneck due to rain',
    },
    // 3 days ago - EMP-005 (Vikram Nair) - Standard day
    {
      employeeId: createdEmployees[4].id,
      checkIn: dayjs().subtract(3, 'day').hour(8).minute(58).toDate(),
      checkOut: dayjs().subtract(3, 'day').hour(17).minute(2).toDate(),
      workedHours: 8.07,
      overtime: 0.07,
      status: 'PRESENT',
    },
    // 3 days ago - EMP-003 (Rohan Mehta) - Overtime
    {
      employeeId: createdEmployees[2].id,
      checkIn: dayjs().subtract(3, 'day').hour(8).minute(45).toDate(),
      checkOut: dayjs().subtract(3, 'day').hour(19).minute(15).toDate(),
      workedHours: 10.5,
      overtime: 2.5,
      status: 'PRESENT',
      notes: 'Tax audit document compilation',
    },
  ]

  for (const att of seedAttendances) {
    await prisma.attendance.create({ data: att })
  }
  console.log('✅ Attendance records seeded')

  // ── 9. Completed Payrun for July 2024 ──
  let julyPayrun = await prisma.payrun.findFirst({ where: { name: 'July 2024 Payroll' } })
  if (!julyPayrun) {
    julyPayrun = await prisma.payrun.create({
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
  } else {
    await prisma.payslip.deleteMany({ where: { payrunId: julyPayrun.id } })
  }

  // For each employee, create a computed payslip
  const contracts = await prisma.contract.findMany({
    where: { status: 'ACTIVE' },
    include: { employee: true }
  })
  const rules = await prisma.salaryRule.findMany({
    where: { structures: { some: { id: structure.id } } },
    orderBy: { sequence: 'asc' }
  })

  const seenEmployees = new Set()
  for (const contract of contracts) {
    if (seenEmployees.has(contract.employeeId)) continue
    seenEmployees.add(contract.employeeId)
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
