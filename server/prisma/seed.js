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

  // ── 5. Salary Structure + Rules (Phase 7) ──
  const regularSalary = await prisma.salaryStructure.upsert({
    where: { code: 'REG' },
    update: {},
    create: {
      name: 'Regular Salary',
      code: 'REG',
      description: 'Standard monthly salary structure for full-time employees.',
      active: true,
    },
  })

  const regularRules = [
    {
      name: 'Basic Salary',
      code: 'BASIC',
      category: 'BASIC',
      amountType: 'CONTRACT_WAGE',
      amount: null,
      percentage: null,
      percentageBase: null,
      sequence: 1,
    },
    {
      name: 'House Rent Allowance',
      code: 'HRA',
      category: 'ALLOWANCE',
      amountType: 'PERCENTAGE',
      amount: null,
      percentage: 40,
      percentageBase: 'BASIC',
      sequence: 2,
    },
    {
      name: 'Standard Allowance',
      code: 'STI',
      category: 'ALLOWANCE',
      amountType: 'FIXED',
      amount: 10000,
      percentage: null,
      percentageBase: null,
      sequence: 3,
    },
    {
      name: 'Gross Salary',
      code: 'GROS',
      category: 'GROSS',
      amountType: 'COMPUTED',
      amount: null,
      percentage: null,
      percentageBase: null,
      sequence: 4,
    },
    {
      name: 'Provident Fund',
      code: 'PF',
      category: 'DEDUCTION',
      amountType: 'PERCENTAGE',
      amount: null,
      percentage: 12,
      percentageBase: 'BASIC',
      sequence: 5,
    },
    {
      name: 'Professional Tax',
      code: 'PT',
      category: 'DEDUCTION',
      amountType: 'FIXED',
      amount: 200,
      percentage: null,
      percentageBase: null,
      sequence: 6,
    },
    {
      name: 'Net Salary',
      code: 'NET',
      category: 'NET',
      amountType: 'COMPUTED',
      amount: null,
      percentage: null,
      percentageBase: null,
      sequence: 7,
    },
  ]

  for (const rule of regularRules) {
    await prisma.salaryRule.upsert({
      where: { structureId_code: { structureId: regularSalary.id, code: rule.code } },
      update: {},
      create: { ...rule, structureId: regularSalary.id, active: true },
    })
  }

  const hourlyWage = await prisma.salaryStructure.upsert({
    where: { code: 'HLY' },
    update: {},
    create: {
      name: 'Hourly Wage',
      code: 'HLY',
      description: 'Salary structure for hourly or part-time workers.',
      active: true,
    },
  })

  const hourlyRules = [
    {
      name: 'Basic Earnings',
      code: 'BASIC',
      category: 'BASIC',
      amountType: 'CONTRACT_WAGE',
      sequence: 1,
    },
    {
      name: 'Gross Salary',
      code: 'GROS',
      category: 'GROSS',
      amountType: 'COMPUTED',
      sequence: 2,
    },
    {
      name: 'Professional Tax',
      code: 'PT',
      category: 'DEDUCTION',
      amountType: 'FIXED',
      amount: 200,
      sequence: 3,
    },
    {
      name: 'Net Salary',
      code: 'NET',
      category: 'NET',
      amountType: 'COMPUTED',
      sequence: 4,
    },
  ]

  for (const rule of hourlyRules) {
    await prisma.salaryRule.upsert({
      where: { structureId_code: { structureId: hourlyWage.id, code: rule.code } },
      update: {},
      create: { ...rule, structureId: hourlyWage.id, active: true },
    })
  }

  const structure = regularSalary
  console.log('✅ Salary structures and rules seeded (Regular Salary & Hourly Wage)')

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
      email: 'aniketyerawar0108@gmail.com',
      role: 'EMPLOYEE',
      firstName: 'Vikram',
      lastName: 'Nair',
      dept: eng, pos: swEng, schedule: std40,
      wage: 6000, num: 'EMP-005', hire: '2023-01-10',
      type: 'FULL_TIME', bank: 'ACC-005-VN', bankName: 'HDFC Bank'
    },
    {
      email: 'bhosalesamarth2775@gmail.com',
      role: 'EMPLOYEE',
      firstName: 'Ananya',
      lastName: 'Iyer',
      dept: eng, pos: srSwEng, schedule: ext45,
      wage: 7200, num: 'EMP-006', hire: '2022-09-01',
      type: 'FULL_TIME', bank: 'ACC-006-AI', bankName: 'Kotak Bank'
    },
    {
      email: 'aniketyerawar2003@gmail.com',
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
    let user = await prisma.user.findUnique({ where: { email: e.email } })
    if (!user) {
      const existingEmp = await prisma.employee.findUnique({
        where: { employeeNumber: e.num },
        include: { user: true }
      })
      if (existingEmp && existingEmp.user) {
        user = await prisma.user.update({
          where: { id: existingEmp.user.id },
          data: { email: e.email }
        })
      } else {
        user = await prisma.user.create({
          data: {
            email: e.email,
            passwordHash: e.email === 'apy0108@gmail.com' ? HASH_ADMIN : HASH_DEFAULT,
            role: e.role
          }
        })
      }
    }

    const employee = await prisma.employee.upsert({
      where: { employeeNumber: e.num },
      update: {
        email: e.email,
        bankAccountNo: e.bank,
        bankAccountNumber: e.bank,
        bankName: e.bankName,
      },
      create: {
        employeeNumber: e.num,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        hireDate: new Date(e.hire),
        status: 'ACTIVE',
        bankAccountNumber: e.bank,
        bankAccountNo: e.bank,
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

  // ── 9. Phase 8 Seed Payruns (January 2026 PAID and February 2026 DRAFT) ──
  const regSalary = regularSalary || await prisma.salaryStructure.findFirst({
    where: { code: 'REG' }
  });
  const admin = adminUser || await prisma.user.findFirst({
    where: { email: 'apy0108@gmail.com' }
  });
  const allEmployees = await prisma.employee.findMany({
    where: { user: { role: 'EMPLOYEE' } }
  });

  // Payrun 1 — January 2026 (PAID)
  const jan2026 = await prisma.payrun.upsert({
    where: { id: 'seed-payrun-jan-2026' },
    update: {},
    create: {
      id: 'seed-payrun-jan-2026',
      name: 'January 2026',
      salaryStructureId: regSalary.id,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      status: 'PAID',
      createdById: admin.id,
    },
  });

  // Create PAID payslips for January 2026 for all employees
  for (const emp of allEmployees) {
    const contract = await prisma.contract.findFirst({
      where: { employeeId: emp.id, status: 'ACTIVE' }
    });
    if (!contract) continue;
    const basic = contract.wage;
    const hra = Math.round(basic * 0.4);
    const sti = 10000;
    const gross = basic + hra + sti;
    const pf = Math.round(basic * 0.12);
    const pt = 200;
    const net = gross - pf - pt;

    const payslip = await prisma.payslip.upsert({
      where: { id: `seed-ps-jan-${emp.id}` },
      update: {},
      create: {
        id: `seed-ps-jan-${emp.id}`,
        payrunId: jan2026.id,
        employeeId: emp.id,
        salaryStructureId: regSalary.id,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        workedDays: 23,
        totalDays: 23,
        basic, gross, deductions: pf + pt, net,
        status: 'PAID',
        warnings: (emp.bankAccountNo || emp.bankAccountNumber) ? [] : ['A/C missing'],
      },
    });

    // Create lines
    await prisma.payslipLine.deleteMany({ where: { payslipId: payslip.id } });
    await prisma.payslipLine.createMany({
      skipDuplicates: true,
      data: [
        { payslipId: payslip.id, ruleName: 'Basic Salary',          ruleCode: 'BASIC', category: 'BASIC',     amount: basic,  sequence: 1  },
        { payslipId: payslip.id, ruleName: 'House Rent Allowance',  ruleCode: 'HRA',   category: 'ALLOWANCE', amount: hra,    sequence: 10 },
        { payslipId: payslip.id, ruleName: 'Standard Allowance',    ruleCode: 'STI',   category: 'ALLOWANCE', amount: sti,    sequence: 20 },
        { payslipId: payslip.id, ruleName: 'Gross Salary',          ruleCode: 'GROS',  category: 'GROSS',     amount: gross,  sequence: 30 },
        { payslipId: payslip.id, ruleName: 'Provident Fund',        ruleCode: 'PF',    category: 'DEDUCTION', amount: -pf,    sequence: 40 },
        { payslipId: payslip.id, ruleName: 'Professional Tax',      ruleCode: 'PT',    category: 'DEDUCTION', amount: -pt,    sequence: 50 },
        { payslipId: payslip.id, ruleName: 'Net Salary',            ruleCode: 'NET',   category: 'NET',       amount: net,    sequence: 60 },
      ],
    });
  }

  // Payrun 2 — February 2026 (DRAFT — HR will compute this during testing)
  const feb2026 = await prisma.payrun.upsert({
    where: { id: 'seed-payrun-feb-2026' },
    update: {},
    create: {
      id: 'seed-payrun-feb-2026',
      name: 'February 2026',
      salaryStructureId: regSalary.id,
      periodStart: new Date('2026-02-01'),
      periodEnd: new Date('2026-02-28'),
      status: 'DRAFT',
      createdById: admin.id,
    },
  });

  // Create DRAFT payslips for February 2026 (not yet computed)
  for (const emp of allEmployees) {
    await prisma.payslip.upsert({
      where: { id: `seed-ps-feb-${emp.id}` },
      update: {},
      create: {
        id: `seed-ps-feb-${emp.id}`,
        payrunId: feb2026.id,
        employeeId: emp.id,
        salaryStructureId: regSalary.id,
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-28'),
        workedDays: 0,
        totalDays: 0,
        basic: 0, gross: 0, deductions: 0, net: 0,
        status: 'DRAFT',
        warnings: [],
      },
    });
  }

  // Update any unlinked contracts to Regular Salary
  await prisma.contract.updateMany({
    where: { salaryStructureId: null },
    data: { salaryStructureId: regSalary.id },
  });
  console.log('✅ January 2026 and February 2026 payruns seeded');

  // ═══════════════════════════════════════════════════
  // DEMO DATA EXPANSION — 150-200 additional entries
  // ═══════════════════════════════════════════════════
  console.log('\n🌱 Seeding demo data expansion...')

  // Re-query everything fresh (avoid variable name conflicts)
  const demoAdmin = await prisma.user.findFirst({
    where: { email: 'apy0108@gmail.com' }
  })
  const demoRegSalary = await prisma.salaryStructure.findFirst({
    where: { code: 'REG' }
  })
  const demoAllEmps = await prisma.employee.findMany({
    include: { user: true },
    orderBy: { employeeNumber: 'asc' }
  })
  const demoEmpRole = demoAllEmps.filter(e => e.user?.role === 'EMPLOYEE')
  const demoPto  = await prisma.timeOffType.findFirst({ where: { name: 'Paid Time Off' } })
  const demoSick = await prisma.timeOffType.findFirst({ where: { name: 'Sick Leave' } })
  const demoComp = await prisma.timeOffType.findFirst({ where: { name: 'Comp Off' } })

  // ─── PAYRUNS: March through August 2026 (PAID) ───────
  const demoMonths = [
    { id: 'seed-payrun-mar-2026', name: 'March 2026',   start: '2026-03-01', end: '2026-03-31', days: 23 },
    { id: 'seed-payrun-apr-2026', name: 'April 2026',   start: '2026-04-01', end: '2026-04-30', days: 22 },
    { id: 'seed-payrun-may-2026', name: 'May 2026',     start: '2026-05-01', end: '2026-05-31', days: 21 },
    { id: 'seed-payrun-jun-2026', name: 'June 2026',    start: '2026-06-01', end: '2026-06-30', days: 20 },
    { id: 'seed-payrun-jul-2026', name: 'July 2026',    start: '2026-07-01', end: '2026-07-31', days: 23 },
    { id: 'seed-payrun-aug-2026', name: 'August 2026',  start: '2026-08-01', end: '2026-08-31', days: 21 },
  ]

  for (const m of demoMonths) {
    const demoPayrun = await prisma.payrun.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id:                m.id,
        name:              m.name,
        salaryStructureId: demoRegSalary.id,
        periodStart:       new Date(m.start),
        periodEnd:         new Date(m.end),
        status:            'PAID',
        createdById:       demoAdmin.id,
      },
    })

    for (const emp of demoEmpRole) {
      const contract = await prisma.contract.findFirst({
        where: { employeeId: emp.id, status: 'ACTIVE' }
      })
      if (!contract) continue

      const basic = contract.wage
      const hra   = Math.round(basic * 0.4)
      const sti   = 10000
      const gross = basic + hra + sti
      const pf    = Math.round(basic * 0.12)
      const pt    = 200
      const net   = gross - pf - pt

      const psId = `seed-ps-${m.id.replace('seed-payrun-', '')}-${emp.id}`

      const demoPs = await prisma.payslip.upsert({
        where:  { id: psId },
        update: {},
        create: {
          id:                psId,
          payrunId:          demoPayrun.id,
          employeeId:        emp.id,
          salaryStructureId: demoRegSalary.id,
          periodStart:       new Date(m.start),
          periodEnd:         new Date(m.end),
          workedDays:        m.days,
          totalDays:         m.days,
          basic,
          gross,
          deductions:        pf + pt,
          net,
          status:            'PAID',
          warnings:          (emp.bankAccountNo || emp.bankAccountNumber) ? [] : ['A/C missing'],
        },
      })

      const lineCount = await prisma.payslipLine.count({ where: { payslipId: demoPs.id } })
      if (lineCount === 0) {
        await prisma.payslipLine.createMany({
          skipDuplicates: true,
          data: [
            { payslipId: demoPs.id, ruleName: 'Basic Salary',         ruleCode: 'BASIC', category: 'BASIC',     amount: basic,  sequence: 1  },
            { payslipId: demoPs.id, ruleName: 'House Rent Allowance', ruleCode: 'HRA',   category: 'ALLOWANCE', amount: hra,    sequence: 10 },
            { payslipId: demoPs.id, ruleName: 'Standard Allowance',   ruleCode: 'STI',   category: 'ALLOWANCE', amount: sti,    sequence: 20 },
            { payslipId: demoPs.id, ruleName: 'Gross Salary',         ruleCode: 'GROS',  category: 'GROSS',     amount: gross,  sequence: 30 },
            { payslipId: demoPs.id, ruleName: 'Provident Fund',       ruleCode: 'PF',    category: 'DEDUCTION', amount: -pf,    sequence: 40 },
            { payslipId: demoPs.id, ruleName: 'Professional Tax',     ruleCode: 'PT',    category: 'DEDUCTION', amount: -pt,    sequence: 50 },
            { payslipId: demoPs.id, ruleName: 'Net Salary',           ruleCode: 'NET',   category: 'NET',       amount: net,    sequence: 60 },
          ],
        })
      }
    }
    console.log(`  ✅ ${m.name} payrun + payslips created`)
  }

  // ─── SEPTEMBER 2026 PAYRUN (DRAFT) ───────────────────
  const demoSepRun = await prisma.payrun.upsert({
    where:  { id: 'seed-payrun-sep-2026' },
    update: {},
    create: {
      id:                'seed-payrun-sep-2026',
      name:              'September 2026',
      salaryStructureId: demoRegSalary.id,
      periodStart:       new Date('2026-09-01'),
      periodEnd:         new Date('2026-09-30'),
      status:            'DRAFT',
      createdById:       demoAdmin.id,
    },
  })
  for (const emp of demoEmpRole) {
    await prisma.payslip.upsert({
      where:  { id: `seed-ps-sep-2026-${emp.id}` },
      update: {},
      create: {
        id:                `seed-ps-sep-2026-${emp.id}`,
        payrunId:          demoSepRun.id,
        employeeId:        emp.id,
        salaryStructureId: demoRegSalary.id,
        periodStart:       new Date('2026-09-01'),
        periodEnd:         new Date('2026-09-30'),
        workedDays:        0,
        totalDays:         0,
        basic: 0, gross: 0, deductions: 0, net: 0,
        status:            'DRAFT',
        warnings:          [],
      },
    })
  }
  console.log('  ✅ September 2026 DRAFT payrun seeded')

  // ─── TIME OFF ALLOCATIONS (use exact schema field names) ─
  // Schema field: typeId (NOT timeOffTypeId), approverId (NOT approvedById)
  // No validFrom/validTo — use validity string field

  for (const emp of demoAllEmps) {
    const existsPto = await prisma.timeOffAllocation.findFirst({
      where: { employeeId: emp.id, typeId: demoPto.id }
    })
    if (!existsPto) {
      await prisma.timeOffAllocation.create({
        data: {
          employeeId:  emp.id,
          typeId:      demoPto.id,
          allocated:   21,
          taken:       0,
          validity:    '2026',
          status:      'APPROVED',
          approverId:  demoAdmin.id,
        }
      })
    }
  }

  for (const emp of demoEmpRole) {
    const existsComp = await prisma.timeOffAllocation.findFirst({
      where: { employeeId: emp.id, typeId: demoComp.id }
    })
    if (!existsComp) {
      await prisma.timeOffAllocation.create({
        data: {
          employeeId:  emp.id,
          typeId:      demoComp.id,
          allocated:   16,
          taken:       0,
          validity:    '2026',
          status:      'APPROVED',
          approverId:  demoAdmin.id,
        }
      })
    }
  }
  console.log('  ✅ Time off allocations seeded')

  // ─── TIME OFF REQUESTS (use schema field names) ────────
  // Schema field: typeId, reason (NOT description), approverId (NOT approvedById)

  const demoRequests = [
    { idx: 0, type: demoPto,  start: '2026-03-10', end: '2026-03-12', dur: 3, status: 'APPROVED', reason: 'Family function in Pune' },
    { idx: 1, type: demoPto,  start: '2026-04-14', end: '2026-04-18', dur: 5, status: 'APPROVED', reason: 'Annual vacation to Goa' },
    { idx: 2, type: demoSick, start: '2026-05-06', end: '2026-05-07', dur: 2, status: 'APPROVED', reason: 'Fever and body ache' },
    { idx: 3, type: demoPto,  start: '2026-06-02', end: '2026-06-03', dur: 2, status: 'APPROVED', reason: 'Personal work' },
    { idx: 4, type: demoSick, start: '2026-07-21', end: '2026-07-21', dur: 1, status: 'APPROVED', reason: 'Doctor consultation' },
    { idx: 5, type: demoSick, start: '2026-08-11', end: '2026-08-11', dur: 1, status: 'APPROVED', reason: 'Medical appointment' },
    { idx: 6, type: demoPto,  start: '2026-03-25', end: '2026-03-27', dur: 3, status: 'APPROVED', reason: 'Sisters wedding ceremony' },
    { idx: 7, type: demoPto,  start: '2026-05-18', end: '2026-05-22', dur: 5, status: 'APPROVED', reason: 'International trip' },
    { idx: 8, type: demoSick, start: '2026-06-15', end: '2026-06-15', dur: 1, status: 'APPROVED', reason: 'Migraine' },
    { idx: 9, type: demoSick, start: '2026-07-03', end: '2026-07-04', dur: 2, status: 'APPROVED', reason: 'Viral infection' },
    { idx: 10, type: demoPto, start: '2026-08-04', end: '2026-08-08', dur: 5, status: 'REFUSED',  reason: 'Holiday travel',          refuseReason: 'Team bandwidth constraint' },
    { idx: 11, type: demoPto, start: '2026-07-14', end: '2026-07-18', dur: 5, status: 'REFUSED',  reason: 'Personal vacation',        refuseReason: 'Critical project deadline' },
    { idx: 0,  type: demoPto, start: '2026-09-22', end: '2026-09-24', dur: 3, status: 'PENDING',  reason: 'Navratri celebration' },
    { idx: 1,  type: demoSick,start: '2026-09-08', end: '2026-09-08', dur: 1, status: 'PENDING',  reason: 'Dental procedure' },
    { idx: 2,  type: demoPto, start: '2026-09-29', end: '2026-09-30', dur: 2, status: 'PENDING',  reason: 'Personal travel' },
    { idx: 3,  type: demoSick,start: '2026-09-15', end: '2026-09-15', dur: 1, status: 'PENDING',  reason: 'Health checkup' },
    { idx: 4,  type: demoPto, start: '2026-10-06', end: '2026-10-10', dur: 5, status: 'PENDING',  reason: 'Diwali holiday extension' },
    { idx: 5,  type: demoSick,start: '2026-09-10', end: '2026-09-11', dur: 2, status: 'PENDING',  reason: 'Migraine and rest' },
  ]

  for (const r of demoRequests) {
    const emp = demoEmpRole[r.idx]
    if (!emp) continue

    const alreadyExists = await prisma.timeOffRequest.findFirst({
      where: {
        employeeId: emp.id,
        typeId:     r.type.id,
        startDate:  new Date(r.start),
      }
    })
    if (alreadyExists) continue

    await prisma.timeOffRequest.create({
      data: {
        employeeId:  emp.id,
        typeId:      r.type.id,
        startDate:   new Date(r.start),
        endDate:     new Date(r.end),
        duration:    r.dur,
        status:      r.status,
        reason:      r.reason,
        approverId:  r.status !== 'PENDING' ? demoAdmin.id : null,
        refuseReason: r.refuseReason || null,
      }
    })
  }
  console.log('  ✅ Time off requests seeded (approved/refused/pending)')

  // ─── EXTRA ATTENDANCE: August 2026 ───────────────────
  // Attendance has NO date field — only checkIn/checkOut
  // Duplicate check: findFirst where checkIn is within same calendar day

  const augStart = dayjs('2026-08-01')
  const augEnd   = dayjs('2026-09-01')
  const augPattern = ['PRESENT','PRESENT','PRESENT','PRESENT','PRESENT',
                      'LATE','PRESENT','PRESENT','PRESENT','PRESENT',
                      'PRESENT','ABSENT','PRESENT','PRESENT','PRESENT',
                      'PRESENT','PRESENT','LATE','PRESENT','PRESENT',
                      'PRESENT']

  let patIdx = 0
  let augDay = augStart
  while (augDay.isBefore(augEnd)) {
    const dow = augDay.day()
    if (dow !== 0 && dow !== 6) {
      const status = augPattern[patIdx % augPattern.length]
      patIdx++
      const checkInHour = status === 'LATE' ? 10 : 9

      for (const emp of demoEmpRole.slice(0, 10)) {
        const exists = await prisma.attendance.findFirst({
          where: {
            employeeId: emp.id,
            checkIn: {
              gte: augDay.startOf('day').toDate(),
              lt:  augDay.add(1, 'day').startOf('day').toDate(),
            }
          }
        })
        if (exists) continue

        if (status !== 'ABSENT') {
          await prisma.attendance.create({
            data: {
              employeeId:  emp.id,
              checkIn:     augDay.hour(checkInHour).minute(0).second(0).toDate(),
              checkOut:    augDay.hour(17).minute(30).second(0).toDate(),
              workedHours: status === 'LATE' ? 6.5 : 7.5,
              overtime:    0,
              status,
            }
          })
        }
      }
    }
    augDay = augDay.add(1, 'day')
  }
  console.log('  ✅ August 2026 attendance seeded for 10 employees')

  console.log('\n📊 DEMO DATA ADDED:')
  console.log('   6 PAID payruns  (Mar – Aug 2026)')
  console.log('   1 DRAFT payrun  (Sep 2026)')
  console.log('   ~180 payslips   (6 months × ~30 employees)')
  console.log('   ~34 PTO allocations (all employees)')
  console.log('   ~30 Comp Off allocations (EMPLOYEE role)')
  console.log('   18 time off requests (APPROVED / REFUSED / PENDING)')
  console.log('   Aug 2026 attendance for 10 employees')

  // ═══════════════════════════════════════════════════
  // BULK 161 EMPLOYEES — brings total from 39 to 200
  // ═══════════════════════════════════════════════════
  console.log('\n🌱 Seeding 161 additional employees...')

  // Re-fetch references (new variables to avoid conflicts)
  const bEng  = await prisma.department.findFirst({ where: { name: 'Engineering' } })
  const bHR   = await prisma.department.findFirst({ where: { name: 'Human Resources' } })
  const bFin  = await prisma.department.findFirst({ where: { name: 'Finance' } })
  const bSal  = await prisma.department.findFirst({ where: { name: 'Sales' } })
  const bOps  = await prisma.department.findFirst({ where: { name: 'Operations' } })
  const bSwE  = await prisma.jobPosition.findFirst({ where: { title: 'Software Engineer' } })
  const bSrE  = await prisma.jobPosition.findFirst({ where: { title: 'Senior Software Engineer' } })
  const bHRM  = await prisma.jobPosition.findFirst({ where: { title: 'HR Manager' } })
  const bPay  = await prisma.jobPosition.findFirst({ where: { title: 'Payroll Specialist' } })
  const bFiA  = await prisma.jobPosition.findFirst({ where: { title: 'Financial Analyst' } })
  const bSlR  = await prisma.jobPosition.findFirst({ where: { title: 'Sales Representative' } })
  const bOpM  = await prisma.jobPosition.findFirst({ where: { title: 'Operations Manager' } })
  const bSch  = await prisma.workingSchedule.findFirst({ where: { name: 'Standard 40h Week' } })
  const bSchX = await prisma.workingSchedule.findFirst({ where: { name: 'Extended 45h Week' } })
  const bStr  = await prisma.salaryStructure.findFirst({ where: { code: 'REG' } })
  const bHash = require('bcryptjs').hashSync('Password@123', 10)

  const bulkEmployees = [
    // ── ENGINEERING — Software Engineers (35) ──────────
    { n:'040', fn:'Aarav',       ln:'Singh',      d:bEng, p:bSwE, s:bSch,  w:62000, h:'2023-06-15' },
    { n:'041', fn:'Kartik',      ln:'Sharma',     d:bEng, p:bSwE, s:bSch,  w:68000, h:'2023-08-01' },
    { n:'042', fn:'Nikhil',      ln:'Verma',      d:bEng, p:bSwE, s:bSch,  w:71000, h:'2023-02-20' },
    { n:'043', fn:'Rishi',       ln:'Gupta',      d:bEng, p:bSwE, s:bSch,  w:65000, h:'2024-01-10' },
    { n:'044', fn:'Tarun',       ln:'Mehta',      d:bEng, p:bSwE, s:bSch,  w:58000, h:'2024-03-05' },
    { n:'045', fn:'Vikrant',     ln:'Rao',        d:bEng, p:bSwE, s:bSch,  w:73000, h:'2022-11-15' },
    { n:'046', fn:'Yash',        ln:'Kumar',      d:bEng, p:bSwE, s:bSch,  w:60000, h:'2023-07-22' },
    { n:'047', fn:'Harsh',       ln:'Joshi',      d:bEng, p:bSwE, s:bSch,  w:72000, h:'2023-05-18' },
    { n:'048', fn:'Ishan',       ln:'Reddy',      d:bEng, p:bSwE, s:bSch,  w:69000, h:'2022-09-10' },
    { n:'049', fn:'Jayesh',      ln:'Nair',       d:bEng, p:bSwE, s:bSch,  w:64000, h:'2024-02-14' },
    { n:'050', fn:'Kiran',       ln:'Desai',      d:bEng, p:bSwE, s:bSch,  w:70000, h:'2023-10-01' },
    { n:'051', fn:'Lakshay',     ln:'Pillai',     d:bEng, p:bSwE, s:bSch,  w:66000, h:'2024-04-07' },
    { n:'052', fn:'Mihir',       ln:'Tiwari',     d:bEng, p:bSwE, s:bSch,  w:63000, h:'2023-12-12' },
    { n:'053', fn:'Navin',       ln:'Pandey',     d:bEng, p:bSwE, s:bSch,  w:74000, h:'2022-07-19' },
    { n:'054', fn:'Om',          ln:'Mishra',     d:bEng, p:bSwE, s:bSch,  w:61000, h:'2024-06-03' },
    { n:'055', fn:'Parth',       ln:'Dubey',      d:bEng, p:bSwE, s:bSch,  w:75000, h:'2023-03-28' },
    { n:'056', fn:'Rishabh',     ln:'Shukla',     d:bEng, p:bSwE, s:bSch,  w:77000, h:'2022-12-05' },
    { n:'057', fn:'Siddharth',   ln:'Srivastava', d:bEng, p:bSwE, s:bSch,  w:80000, h:'2023-01-17' },
    { n:'058', fn:'Tanmay',      ln:'Agarwal',    d:bEng, p:bSwE, s:bSch,  w:57000, h:'2024-07-21' },
    { n:'059', fn:'Ujjwal',      ln:'Bansal',     d:bEng, p:bSwE, s:bSch,  w:76000, h:'2023-09-09' },
    { n:'060', fn:'Vivaan',      ln:'Goel',       d:bEng, p:bSwE, s:bSch,  w:78000, h:'2022-08-30' },
    { n:'061', fn:'Akshat',      ln:'Kapoor',     d:bEng, p:bSwE, s:bSch,  w:88000, h:'2023-04-14' },
    { n:'062', fn:'Balram',      ln:'Chauhan',    d:bEng, p:bSwE, s:bSch,  w:64000, h:'2024-05-27' },
    { n:'063', fn:'Chirag',      ln:'Thakur',     d:bEng, p:bSwE, s:bSch,  w:67000, h:'2022-10-11' },
    { n:'064', fn:'Darshan',     ln:'Pawar',      d:bEng, p:bSwE, s:bSch,  w:70000, h:'2023-11-24' },
    { n:'065', fn:'Ekant',       ln:'Patil',      d:bEng, p:bSwE, s:bSch,  w:72000, h:'2024-08-06' },
    { n:'066', fn:'Farhan',      ln:'Jadhav',     d:bEng, p:bSwE, s:bSch,  w:69000, h:'2023-06-30' },
    { n:'067', fn:'Ganesh',      ln:'Shinde',     d:bEng, p:bSwE, s:bSch,  w:65000, h:'2022-05-16' },
    { n:'068', fn:'Hemant',      ln:'Kadam',      d:bEng, p:bSwE, s:bSch,  w:73000, h:'2024-09-18' },
    { n:'069', fn:'Ishaan',      ln:'More',       d:bEng, p:bSwE, s:bSch,  w:66000, h:'2023-08-25' },
    { n:'070', fn:'Jatin',       ln:'Gaikwad',    d:bEng, p:bSwE, s:bSch,  w:68000, h:'2024-01-30' },
    { n:'071', fn:'Keshav',      ln:'Kale',       d:bEng, p:bSwE, s:bSch,  w:71000, h:'2022-06-22' },
    { n:'072', fn:'Lalit',       ln:'Bhosale',    d:bEng, p:bSwE, s:bSch,  w:75000, h:'2023-02-08' },
    { n:'073', fn:'Manav',       ln:'Thorat',     d:bEng, p:bSwE, s:bSch,  w:63000, h:'2024-10-14' },
    { n:'074', fn:'Nakul',       ln:'Mane',       d:bEng, p:bSwE, s:bSch,  w:79000, h:'2022-04-03' },
    // ── ENGINEERING — Senior Software Engineers (35) ───
    { n:'075', fn:'Anika',       ln:'Sharma',     d:bEng, p:bSrE, s:bSchX, w:110000, h:'2021-03-15' },
    { n:'076', fn:'Bhavna',      ln:'Gupta',      d:bEng, p:bSrE, s:bSchX, w:125000, h:'2020-08-01' },
    { n:'077', fn:'Chitra',      ln:'Kumar',      d:bEng, p:bSrE, s:bSchX, w:115000, h:'2021-11-20' },
    { n:'078', fn:'Deepika',     ln:'Rao',        d:bEng, p:bSrE, s:bSchX, w:130000, h:'2020-05-10' },
    { n:'079', fn:'Ekta',        ln:'Nair',       d:bEng, p:bSrE, s:bSchX, w:105000, h:'2022-01-07' },
    { n:'080', fn:'Falak',       ln:'Patel',      d:bEng, p:bSrE, s:bSchX, w:118000, h:'2021-07-22' },
    { n:'081', fn:'Geetika',     ln:'Joshi',      d:bEng, p:bSrE, s:bSchX, w:122000, h:'2020-12-14' },
    { n:'082', fn:'Hema',        ln:'Reddy',      d:bEng, p:bSrE, s:bSchX, w:108000, h:'2022-04-18' },
    { n:'083', fn:'Ishita',      ln:'Desai',      d:bEng, p:bSrE, s:bSchX, w:132000, h:'2021-09-05' },
    { n:'084', fn:'Jhanvi',      ln:'Pillai',     d:bEng, p:bSrE, s:bSchX, w:115000, h:'2020-03-27' },
    { n:'085', fn:'Kavya',       ln:'Tiwari',     d:bEng, p:bSrE, s:bSchX, w:140000, h:'2021-01-13' },
    { n:'086', fn:'Lata',        ln:'Pandey',     d:bEng, p:bSrE, s:bSchX, w: 98000, h:'2022-06-30' },
    { n:'087', fn:'Manya',       ln:'Mishra',     d:bEng, p:bSrE, s:bSchX, w:145000, h:'2020-10-09' },
    { n:'088', fn:'Nandini',     ln:'Dubey',      d:bEng, p:bSrE, s:bSchX, w:105000, h:'2021-05-24' },
    { n:'089', fn:'Ojasvi',      ln:'Tripathi',   d:bEng, p:bSrE, s:bSchX, w:112000, h:'2022-08-17' },
    { n:'090', fn:'Palak',       ln:'Shukla',     d:bEng, p:bSrE, s:bSchX, w:120000, h:'2020-07-02' },
    { n:'091', fn:'Ridhi',       ln:'Agarwal',    d:bEng, p:bSrE, s:bSchX, w:150000, h:'2021-02-11' },
    { n:'092', fn:'Sakshi',      ln:'Bansal',     d:bEng, p:bSrE, s:bSchX, w:128000, h:'2020-11-28' },
    { n:'093', fn:'Tanya',       ln:'Goel',       d:bEng, p:bSrE, s:bSchX, w:142000, h:'2022-03-06' },
    { n:'094', fn:'Urmi',        ln:'Khanna',     d:bEng, p:bSrE, s:bSchX, w: 95000, h:'2021-08-19' },
    { n:'095', fn:'Vaidehi',     ln:'Sethi',      d:bEng, p:bSrE, s:bSchX, w:165000, h:'2020-04-23' },
    { n:'096', fn:'Yamini',      ln:'Kapoor',     d:bEng, p:bSrE, s:bSchX, w:175000, h:'2021-10-07' },
    { n:'097', fn:'Zara',        ln:'Chauhan',    d:bEng, p:bSrE, s:bSchX, w:108000, h:'2022-09-14' },
    { n:'098', fn:'Amol',        ln:'Thakur',     d:bEng, p:bSrE, s:bSchX, w:155000, h:'2020-06-18' },
    { n:'099', fn:'Bhavin',      ln:'Pawar',      d:bEng, p:bSrE, s:bSchX, w:133000, h:'2021-12-01' },
    { n:'100', fn:'Chetan',      ln:'Patil',      d:bEng, p:bSrE, s:bSchX, w:148000, h:'2020-02-14' },
    { n:'101', fn:'Deepak',      ln:'Jadhav',     d:bEng, p:bSrE, s:bSchX, w:158000, h:'2021-04-28' },
    { n:'102', fn:'Eknath',      ln:'Shinde',     d:bEng, p:bSrE, s:bSchX, w:168000, h:'2020-09-10' },
    { n:'103', fn:'Fatima',      ln:'Kadam',      d:bEng, p:bSrE, s:bSchX, w:178000, h:'2021-06-15' },
    { n:'104', fn:'Harshali',    ln:'Gaikwad',    d:bEng, p:bSrE, s:bSchX, w:135000, h:'2022-02-22' },
    { n:'105', fn:'Indrani',     ln:'Kale',       d:bEng, p:bSrE, s:bSchX, w:115000, h:'2020-08-06' },
    { n:'106', fn:'Jayant',      ln:'Bhosale',    d:bEng, p:bSrE, s:bSchX, w:143000, h:'2021-11-11' },
    { n:'107', fn:'Ketaki',      ln:'Thorat',     d:bEng, p:bSrE, s:bSchX, w:125000, h:'2022-05-19' },
    { n:'108', fn:'Lalita',      ln:'Mane',       d:bEng, p:bSrE, s:bSchX, w:138000, h:'2020-01-30' },
    { n:'109', fn:'Madhuri',     ln:'Chavan',     d:bEng, p:bSrE, s:bSchX, w:162000, h:'2021-03-08' },
    // ── SALES — Sales Representatives (40) ────────────
    { n:'110', fn:'Jabir',       ln:'Wagh',       d:bSal, p:bSlR, s:bSch,  w:52000, h:'2023-07-10' },
    { n:'111', fn:'Kalpesh',     ln:'Deshpande',  d:bSal, p:bSlR, s:bSch,  w:48000, h:'2024-02-15' },
    { n:'112', fn:'Laxman',      ln:'Kulkarni',   d:bSal, p:bSlR, s:bSch,  w:55000, h:'2023-04-22' },
    { n:'113', fn:'Mahesh',      ln:'Sathe',      d:bSal, p:bSlR, s:bSch,  w:51000, h:'2024-06-11' },
    { n:'114', fn:'Neeraj',      ln:'Bhatt',      d:bSal, p:bSlR, s:bSch,  w:58000, h:'2022-11-03' },
    { n:'115', fn:'Omkar',       ln:'Singh',      d:bSal, p:bSlR, s:bSch,  w:54000, h:'2023-09-19' },
    { n:'116', fn:'Pranav',      ln:'Verma',      d:bSal, p:bSlR, s:bSch,  w:57000, h:'2024-01-28' },
    { n:'117', fn:'Rohit',       ln:'Gupta',      d:bSal, p:bSlR, s:bSch,  w:62000, h:'2022-08-14' },
    { n:'118', fn:'Suresh',      ln:'Mehta',      d:bSal, p:bSlR, s:bSch,  w:47000, h:'2023-12-05' },
    { n:'119', fn:'Tejas',       ln:'Shah',       d:bSal, p:bSlR, s:bSch,  w:60000, h:'2024-04-17' },
    { n:'120', fn:'Uday',        ln:'Rao',        d:bSal, p:bSlR, s:bSch,  w:53000, h:'2023-02-26' },
    { n:'121', fn:'Vicky',       ln:'Pillai',     d:bSal, p:bSlR, s:bSch,  w:61000, h:'2022-10-08' },
    { n:'122', fn:'Waseem',      ln:'Tiwari',     d:bSal, p:bSlR, s:bSch,  w:49000, h:'2024-07-30' },
    { n:'123', fn:'Alok',        ln:'Pandey',     d:bSal, p:bSlR, s:bSch,  w:65000, h:'2023-05-13' },
    { n:'124', fn:'Brijesh',     ln:'Mishra',     d:bSal, p:bSlR, s:bSch,  w:52000, h:'2022-07-24' },
    { n:'125', fn:'Chandrakant', ln:'Dubey',      d:bSal, p:bSlR, s:bSch,  w:70000, h:'2023-11-06' },
    { n:'126', fn:'Daksha',      ln:'Tripathi',   d:bSal, p:bSlR, s:bSch,  w:53000, h:'2024-03-21' },
    { n:'127', fn:'Eldho',       ln:'Shukla',     d:bSal, p:bSlR, s:bSch,  w:67000, h:'2023-06-14' },
    { n:'128', fn:'Fardeen',     ln:'Srivastava', d:bSal, p:bSlR, s:bSch,  w:55000, h:'2022-09-27' },
    { n:'129', fn:'Girija',      ln:'Agarwal',    d:bSal, p:bSlR, s:bSch,  w:71000, h:'2024-08-09' },
    { n:'130', fn:'Hina',        ln:'Bansal',     d:bSal, p:bSlR, s:bSch,  w:48000, h:'2023-03-02' },
    { n:'131', fn:'Imran',       ln:'Goel',       d:bSal, p:bSlR, s:bSch,  w:64000, h:'2022-06-16' },
    { n:'132', fn:'Jitendra',    ln:'Khanna',     d:bSal, p:bSlR, s:bSch,  w:58000, h:'2024-05-04' },
    { n:'133', fn:'Komal',       ln:'Sethi',      d:bSal, p:bSlR, s:bSch,  w:72000, h:'2023-08-23' },
    { n:'134', fn:'Madan',       ln:'Malhotra',   d:bSal, p:bSlR, s:bSch,  w:54000, h:'2022-04-11' },
    { n:'135', fn:'Namrata',     ln:'Kapoor',     d:bSal, p:bSlR, s:bSch,  w:66000, h:'2024-09-26' },
    { n:'136', fn:'Onkar',       ln:'Chauhan',    d:bSal, p:bSlR, s:bSch,  w:59000, h:'2023-01-18' },
    { n:'137', fn:'Paresh',      ln:'Thakur',     d:bSal, p:bSlR, s:bSch,  w:73000, h:'2022-03-07' },
    { n:'138', fn:'Sarla',       ln:'Patil',      d:bSal, p:bSlR, s:bSch,  w:68000, h:'2024-10-20' },
    { n:'139', fn:'Truptesh',    ln:'Jadhav',     d:bSal, p:bSlR, s:bSch,  w:62000, h:'2023-10-31' },
    { n:'140', fn:'Ulka',        ln:'Shinde',     d:bSal, p:bSlR, s:bSch,  w:75000, h:'2022-12-19' },
    { n:'141', fn:'Vandana',     ln:'Kadam',      d:bSal, p:bSlR, s:bSch,  w:51000, h:'2024-11-08' },
    { n:'142', fn:'Wasim',       ln:'More',       d:bSal, p:bSlR, s:bSch,  w:69000, h:'2023-07-16' },
    { n:'143', fn:'Yogita',      ln:'Gaikwad',    d:bSal, p:bSlR, s:bSch,  w:58000, h:'2022-02-03' },
    { n:'144', fn:'Zaheer',      ln:'Kale',       d:bSal, p:bSlR, s:bSch,  w:63000, h:'2024-01-15' },
    { n:'145', fn:'Amruta',      ln:'Bhosale',    d:bSal, p:bSlR, s:bSch,  w:56000, h:'2023-05-29' },
    { n:'146', fn:'Bharat',      ln:'Thorat',     d:bSal, p:bSlR, s:bSch,  w:74000, h:'2022-07-12' },
    { n:'147', fn:'Chanda',      ln:'Mane',       d:bSal, p:bSlR, s:bSch,  w:50000, h:'2024-06-25' },
    { n:'148', fn:'Digvijay',    ln:'Chavan',     d:bSal, p:bSlR, s:bSch,  w:67000, h:'2023-03-14' },
    { n:'149', fn:'Eshan',       ln:'Wagh',       d:bSal, p:bSlR, s:bSch,  w:53000, h:'2022-05-28' },
    // ── OPERATIONS — Operations Manager (20) ──────────
    { n:'150', fn:'Amar',        ln:'Deshpande',  d:bOps, p:bOpM, s:bSch,  w: 85000, h:'2021-06-10' },
    { n:'151', fn:'Bhupesh',     ln:'Kulkarni',   d:bOps, p:bOpM, s:bSch,  w: 92000, h:'2020-09-22' },
    { n:'152', fn:'Chandni',     ln:'Sathe',      d:bOps, p:bOpM, s:bSch,  w: 88000, h:'2022-01-14' },
    { n:'153', fn:'Devika',      ln:'Bhatt',      d:bOps, p:bOpM, s:bSch,  w: 95000, h:'2021-04-07' },
    { n:'154', fn:'Esha',        ln:'Singh',      d:bOps, p:bOpM, s:bSch,  w: 81000, h:'2020-11-29' },
    { n:'155', fn:'Firoz',       ln:'Verma',      d:bOps, p:bOpM, s:bSch,  w: 98000, h:'2022-03-18' },
    { n:'156', fn:'Geeta',       ln:'Gupta',      d:bOps, p:bOpM, s:bSch,  w: 87000, h:'2021-08-05' },
    { n:'157', fn:'Hemraj',      ln:'Mehta',      d:bOps, p:bOpM, s:bSch,  w:102000, h:'2020-06-17' },
    { n:'158', fn:'Indu',        ln:'Shah',       d:bOps, p:bOpM, s:bSch,  w: 89000, h:'2022-07-31' },
    { n:'159', fn:'Javed',       ln:'Rao',        d:bOps, p:bOpM, s:bSch,  w:110000, h:'2021-02-23' },
    { n:'160', fn:'Krishnapriya',ln:'Pillai',     d:bOps, p:bOpM, s:bSch,  w: 83000, h:'2020-04-09' },
    { n:'161', fn:'Laxmibai',    ln:'Tiwari',     d:bOps, p:bOpM, s:bSch,  w: 96000, h:'2022-10-21' },
    { n:'162', fn:'Mandar',      ln:'Pandey',     d:bOps, p:bOpM, s:bSch,  w:104000, h:'2021-12-14' },
    { n:'163', fn:'Nandkumar',   ln:'Mishra',     d:bOps, p:bOpM, s:bSch,  w: 91000, h:'2020-08-26' },
    { n:'164', fn:'Omvati',      ln:'Dubey',      d:bOps, p:bOpM, s:bSch,  w:108000, h:'2022-05-08' },
    { n:'165', fn:'Padmini',     ln:'Tripathi',   d:bOps, p:bOpM, s:bSch,  w: 85000, h:'2021-10-30' },
    { n:'166', fn:'Raghav',      ln:'Shukla',     d:bOps, p:bOpM, s:bSch,  w:115000, h:'2020-03-15' },
    { n:'167', fn:'Sadhna',      ln:'Srivastava', d:bOps, p:bOpM, s:bSch,  w: 90000, h:'2022-08-27' },
    { n:'168', fn:'Tukaram',     ln:'Agarwal',    d:bOps, p:bOpM, s:bSch,  w:120000, h:'2021-05-19' },
    { n:'169', fn:'Uma',         ln:'Bansal',     d:bOps, p:bOpM, s:bSch,  w: 88000, h:'2020-01-11' },
    // ── FINANCE — Financial Analysts + Payroll (15) ───
    { n:'170', fn:'Vasudev',     ln:'Goel',       d:bFin, p:bFiA, s:bSch,  w: 75000, h:'2022-04-20' },
    { n:'171', fn:'Wasudha',     ln:'Khanna',     d:bFin, p:bFiA, s:bSch,  w: 82000, h:'2021-07-13' },
    { n:'172', fn:'Yashwant',    ln:'Sethi',      d:bFin, p:bFiA, s:bSch,  w: 90000, h:'2020-10-25' },
    { n:'173', fn:'Zeena',       ln:'Bhat',       d:bFin, p:bFiA, s:bSch,  w: 85000, h:'2022-06-08' },
    { n:'174', fn:'Ajinkya',     ln:'Malhotra',   d:bFin, p:bFiA, s:bSch,  w: 95000, h:'2021-03-01' },
    { n:'175', fn:'Bhakti',      ln:'Kapoor',     d:bFin, p:bFiA, s:bSch,  w: 72000, h:'2023-01-24' },
    { n:'176', fn:'Chandan',     ln:'Chauhan',    d:bFin, p:bFiA, s:bSch,  w: 88000, h:'2020-07-16' },
    { n:'177', fn:'Divyesh',     ln:'Thakur',     d:bFin, p:bFiA, s:bSch,  w: 80000, h:'2022-11-09' },
    { n:'178', fn:'Ekanta',      ln:'Pawar',      d:bFin, p:bFiA, s:bSch,  w: 78000, h:'2021-09-27' },
    { n:'179', fn:'Falguni',     ln:'Patil',      d:bFin, p:bPay, s:bSch,  w: 68000, h:'2023-04-12' },
    { n:'180', fn:'Gaurang',     ln:'Jadhav',     d:bFin, p:bPay, s:bSch,  w: 75000, h:'2022-02-28' },
    { n:'181', fn:'Hansa',       ln:'Shinde',     d:bFin, p:bPay, s:bSch,  w: 70000, h:'2021-11-15' },
    { n:'182', fn:'Ila',         ln:'Kadam',      d:bFin, p:bPay, s:bSch,  w: 73000, h:'2023-08-01' },
    { n:'183', fn:'Jigar',       ln:'More',       d:bFin, p:bPay, s:bSch,  w: 65000, h:'2022-09-14' },
    { n:'184', fn:'Kamala',      ln:'Gaikwad',    d:bFin, p:bPay, s:bSch,  w: 80000, h:'2021-06-30' },
    // ── HR — HR Managers (16) ──────────────────────────
    { n:'185', fn:'Leelavathi',  ln:'Kale',       d:bHR,  p:bHRM, s:bSch,  w: 95000, h:'2021-02-10' },
    { n:'186', fn:'Mukund',      ln:'Bhosale',    d:bHR,  p:bHRM, s:bSch,  w:102000, h:'2020-05-23' },
    { n:'187', fn:'Nirmal',      ln:'Thorat',     d:bHR,  p:bHRM, s:bSch,  w: 92000, h:'2022-03-07' },
    { n:'188', fn:'Oja',         ln:'Mane',       d:bHR,  p:bHRM, s:bSch,  w: 85000, h:'2021-08-19' },
    { n:'189', fn:'Prakashrao',  ln:'Chavan',     d:bHR,  p:bHRM, s:bSch,  w:110000, h:'2020-11-04' },
    { n:'190', fn:'Qaynat',      ln:'Wagh',       d:bHR,  p:bHRM, s:bSch,  w: 88000, h:'2022-07-16' },
    { n:'191', fn:'Radhakrishna',ln:'Deshpande',  d:bHR,  p:bHRM, s:bSch,  w:105000, h:'2021-04-01' },
    { n:'192', fn:'Saraswati',   ln:'Kulkarni',   d:bHR,  p:bHRM, s:bSch,  w: 92000, h:'2020-09-13' },
    { n:'193', fn:'Tansen',      ln:'Sathe',      d:bHR,  p:bHRM, s:bSch,  w: 98000, h:'2022-06-28' },
    { n:'194', fn:'Urvashi',     ln:'Bhatt',      d:bHR,  p:bHRM, s:bSch,  w: 82000, h:'2021-12-22' },
    { n:'195', fn:'Vasudha',     ln:'Singh',      d:bHR,  p:bHRM, s:bSch,  w:115000, h:'2020-03-06' },
    { n:'196', fn:'Waman',       ln:'Verma',      d:bHR,  p:bHRM, s:bSch,  w: 90000, h:'2022-10-18' },
    { n:'197', fn:'Yatin',       ln:'Gupta',      d:bHR,  p:bHRM, s:bSch,  w: 95000, h:'2021-07-07' },
    { n:'198', fn:'Zoya',        ln:'Mehta',      d:bHR,  p:bHRM, s:bSch,  w: 85000, h:'2022-01-25' },
    { n:'199', fn:'Amrish',      ln:'Shah',       d:bHR,  p:bHRM, s:bSch,  w:120000, h:'2020-08-10' },
    { n:'200', fn:'Bhagyashri',  ln:'Rao',        d:bHR,  p:bHRM, s:bSch,  w: 98000, h:'2021-11-14' },
  ]

  let bContractIdx = 39
  for (const e of bulkEmployees) {
    const empNum = `EMP-${e.n}`
    const email  = `${e.fn.toLowerCase()}.${e.ln.toLowerCase()}@company.com`
    const initials = `${e.fn[0]}${e.ln[0]}`
    const bankAcc  = `ACC-${e.n}-${initials}`

    // Create user if not exists
    let bUser = await prisma.user.findUnique({ where: { email } })
    if (!bUser) {
      bUser = await prisma.user.create({
        data: {
          email,
          passwordHash: bHash,
          role: 'EMPLOYEE',
          isActive: true,
        }
      })
    }

    // Upsert employee
    const bEmp = await prisma.employee.upsert({
      where: { employeeNumber: empNum },
      update: {},
      create: {
        employeeNumber:    empNum,
        firstName:         e.fn,
        lastName:          e.ln,
        email,
        hireDate:          new Date(e.h),
        status:            'ACTIVE',
        bankAccountNumber: bankAcc,
        bankAccountNo:     bankAcc,
        bankName:          ['HDFC Bank','SBI','ICICI Bank','Axis Bank','Kotak Bank'][bContractIdx % 5],
        userId:            bUser.id,
        departmentId:      e.d.id,
        jobPositionId:     e.p.id,
        workingScheduleId: e.s.id,
      },
    })

    // Upsert contract
    bContractIdx++
    const bRef = `CON/2026/${String(bContractIdx).padStart(3, '0')}`
    await prisma.contract.upsert({
      where: { contractRef: bRef },
      update: {},
      create: {
        contractRef:       bRef,
        employeeId:        bEmp.id,
        startDate:         new Date('2024-01-01'),
        contractType:      'FULL_TIME',
        status:            'ACTIVE',
        wage:              e.w,
        wageType:          'MONTHLY',
        departmentId:      e.d.id,
        jobPositionId:     e.p.id,
        workingScheduleId: e.s.id,
        salaryStructureId: bStr.id,
      },
    })

    process.stdout.write('.')
  }
  console.log(`\n✅ 161 employees added (EMP-040 to EMP-200)`)

  // ═══════════════════════════════════════════════════
  // END BULK EMPLOYEES
  // ═══════════════════════════════════════════════════

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
