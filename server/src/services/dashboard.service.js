const prisma = require('../config/prisma')

/**
 * Helper — get default period (most recent month with payslips, or current month)
 */
async function getDefaultPeriod() {
  const latest = await prisma.payslip.findFirst({
    orderBy: { periodStart: 'desc' },
    select: { periodStart: true },
  })
  if (!latest) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  const d = new Date(latest.periodStart)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Helper — build period date range from period string (e.g. "2026-09")
 */
function getPeriodRange(period) {
  if (!period) {
    const now = new Date()
    period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  const [year, month] = period.split('-').map(Number)
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59, 999) // last day of month
  return { start, end, year, month }
}

/**
 * Helper — build employee filter based on filters
 */
async function getFilteredEmployeeIds(filters = {}) {
  const where = {}
  if (filters.departmentId) where.departmentId = filters.departmentId
  if (filters.employeeType) where.workLocation = filters.employeeType
  if (filters.company) where.company = filters.company

  const employees = await prisma.employee.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    select: { id: true },
  })
  return employees.map((e) => e.id)
}

/**
 * Function A — getSummaryCards(filters)
 */
async function getSummaryCards(filters = {}) {
  if (!filters.period) {
    filters.period = await getDefaultPeriod()
  }

  const { start, end } = getPeriodRange(filters.period)
  const employeeIds = await getFilteredEmployeeIds(filters)

  const employeeFilter =
    employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {}

  // Card 1: Total Net Salary Paid (includes PAID or DONE)
  const totalNetPaid = await prisma.payslip.aggregate({
    where: {
      ...employeeFilter,
      status: { in: ['PAID', 'DONE'] },
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
    _sum: { net: true },
  })

  // Previous month total (for % change)
  const prevStart = new Date(start)
  prevStart.setMonth(prevStart.getMonth() - 1)
  const prevLastDay = new Date(
    prevStart.getFullYear(),
    prevStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )

  const prevNetPaid = await prisma.payslip.aggregate({
    where: {
      ...employeeFilter,
      status: { in: ['PAID', 'DONE'] },
      periodStart: { gte: prevStart },
      periodEnd: { lte: prevLastDay },
    },
    _sum: { net: true },
  })

  const currentNet = totalNetPaid._sum.net || 0
  const previousNet = prevNetPaid._sum.net || 0
  const percentChange =
    previousNet > 0
      ? Number(((currentNet - previousNet) / previousNet * 100).toFixed(1))
      : 0

  // Card 2: Payslips Generated
  const payslipCounts = await prisma.payslip.groupBy({
    by: ['status'],
    where: {
      ...employeeFilter,
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
    _count: true,
  })

  const totalPayslips = payslipCounts.reduce((s, g) => s + g._count, 0)
  const paidCount =
    (payslipCounts.find((g) => g.status === 'PAID')?._count || 0) +
    (payslipCounts.find((g) => g.status === 'DONE')?._count || 0)
  const pendingCount = totalPayslips - paidCount

  // Card 3: Average Salary per Employee
  const avgSalary =
    totalPayslips > 0 ? Math.round(currentNet / (paidCount || 1)) : 0

  // Card 4: Approved Time Off Days
  const timeOffTotal = await prisma.timeOffRequest.aggregate({
    where: {
      ...employeeFilter,
      status: 'APPROVED',
      startDate: { gte: start },
      endDate: { lte: end },
    },
    _sum: { duration: true },
  })

  // Card 5: Attendance Health %
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      ...employeeFilter,
      OR: [
        { checkIn: { gte: start, lte: end } },
        { AND: [{ checkIn: null }, { createdAt: { gte: start, lte: end } }] },
      ],
    },
    select: { status: true },
  })
  const totalRecords = attendanceRecords.length
  const presentRecords = attendanceRecords.filter((r) =>
    ['PRESENT', 'HALF_DAY'].includes(r.status)
  ).length
  const attendanceHealth =
    totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0

  return {
    totalNetPaid: currentNet,
    percentChange,
    totalPayslips,
    paidCount,
    pendingCount,
    avgSalary,
    approvedTimeOff: timeOffTotal._sum.duration || 0,
    attendanceHealth,
  }
}

/**
 * Function B — getSalaryByDepartment(filters)
 */
async function getSalaryByDepartment(filters = {}) {
  if (!filters.period) {
    filters.period = await getDefaultPeriod()
  }

  const { start, end } = getPeriodRange(filters.period)
  const employeeIds = await getFilteredEmployeeIds(filters)
  const employeeFilter =
    employeeIds.length > 0 ? { id: { in: employeeIds } } : undefined

  // Get employees with their departments
  const employees = await prisma.employee.findMany({
    where: employeeFilter,
    include: { department: { select: { name: true } } },
  })

  // Get payslips for those employees in period
  const payslips = await prisma.payslip.findMany({
    where: {
      ...(employeeIds.length > 0 && { employeeId: { in: employeeIds } }),
      status: { in: ['DONE', 'PAID', 'COMPUTED'] },
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
    select: { employeeId: true, net: true },
  })

  // Group by department
  const deptMap = {}
  for (const emp of employees) {
    const deptName = emp.department?.name || 'Unassigned'
    if (!deptMap[deptName]) deptMap[deptName] = 0
    const empPayslips = payslips.filter((p) => p.employeeId === emp.id)
    deptMap[deptName] += empPayslips.reduce((s, p) => s + (p.net || 0), 0)
  }

  return Object.entries(deptMap).map(([department, totalSalary]) => ({
    department,
    totalSalary,
  }))
}

/**
 * Function C — getSalaryTrend(filters)
 */
async function getSalaryTrend(filters = {}) {
  if (!filters.period) {
    filters.period = await getDefaultPeriod()
  }

  const employeeIds = await getFilteredEmployeeIds(filters)
  const employeeFilter =
    employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {}

  const { year, month } = getPeriodRange(filters.period)
  const months = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1)
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

    const result = await prisma.payslip.aggregate({
      where: {
        ...employeeFilter,
        status: { in: ['DONE', 'PAID'] },
        periodStart: { gte: mStart },
        periodEnd: { lte: mEnd },
      },
      _sum: { net: true },
    })

    months.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      totalNet: result._sum.net || 0,
    })
  }
  return months
}

/**
 * Function D — getPayslipStatusSplit(filters)
 */
async function getPayslipStatusSplit(filters = {}) {
  if (!filters.period) {
    filters.period = await getDefaultPeriod()
  }

  const { start, end } = getPeriodRange(filters.period)
  const employeeIds = await getFilteredEmployeeIds(filters)
  const employeeFilter =
    employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {}

  const payslips = await prisma.payslip.findMany({
    where: {
      ...employeeFilter,
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
    select: { status: true, warnings: true },
  })

  const statusCounts = {
    PAID: payslips.filter((p) => p.status === 'PAID').length,
    DONE: payslips.filter((p) => p.status === 'DONE').length,
    PENDING: payslips.filter((p) => ['DRAFT', 'COMPUTED'].includes(p.status)).length,
    WARNING: payslips.filter((p) => p.warnings && p.warnings.length > 0).length,
  }

  // Alerts
  const now = new Date()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const missingBank = await prisma.employee.count({
    where: {
      ...(employeeIds.length > 0 && { id: { in: employeeIds } }),
      OR: [{ bankAccountNo: null }, { bankAccountNo: '' }],
    },
  })

  const duplicateWarnings = payslips.filter((p) =>
    Array.isArray(p.warnings) && p.warnings.some((w) => w.toLowerCase().includes('duplicate'))
  ).length

  const draftsNotValidated = await prisma.payrun.count({
    where: { status: { in: ['DRAFT', 'COMPUTED'] } },
  })

  const expiringContracts = await prisma.contract.count({
    where: {
      ...employeeFilter,
      status: 'ACTIVE',
      endDate: { gte: now, lte: monthEnd },
    },
  })

  return {
    statusCounts,
    alerts: {
      missingBank,
      duplicateWarnings,
      draftsNotValidated,
      expiringContracts,
    },
  }
}

/**
 * Function E — getAttendanceOverview(filters)
 */
async function getAttendanceOverview(filters = {}) {
  if (!filters.period) {
    filters.period = await getDefaultPeriod()
  }

  const { start, end } = getPeriodRange(filters.period)
  const employeeIds = await getFilteredEmployeeIds(filters)
  const employeeFilter =
    employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {}

  const records = await prisma.attendance.findMany({
    where: {
      ...employeeFilter,
      OR: [
        { checkIn: { gte: start, lte: end } },
        { AND: [{ checkIn: null }, { createdAt: { gte: start, lte: end } }] },
      ],
    },
    select: { status: true, checkOut: true, notes: true, isManualEdit: true, editNote: true },
  })

  const present = records.filter((r) => r.status === 'PRESENT').length
  const late = records.filter((r) => r.status === 'LATE').length
  const absent = records.filter((r) => r.status === 'ABSENT').length

  // Missing checkouts = checked in but no checkout
  const missingCheckouts = await prisma.attendance.count({
    where: {
      ...employeeFilter,
      checkIn: { gte: start, lte: end },
      checkOut: null,
      status: { not: 'ABSENT' },
    },
  })

  // Manual edits = records edited by HR
  const manualEdits = records.filter(
    (r) =>
      r.isManualEdit ||
      (r.notes && r.notes.toLowerCase().includes('edited by')) ||
      (r.editNote && r.editNote.length > 0)
  ).length

  const total = records.length
  const coverage = total > 0 ? Math.round(((present + late) / total) * 100) : 0

  return {
    chartData: [
      { label: 'Present', count: present, fill: '#22C55E' },
      { label: 'Late', count: late, fill: '#F97316' },
      { label: 'Absent', count: absent, fill: '#EF4444' },
    ],
    stats: { missingCheckouts, manualEdits, coverage },
  }
}

/**
 * Function F — getTimeOffOverview(filters)
 */
async function getTimeOffOverview(filters = {}) {
  if (!filters.period) {
    filters.period = await getDefaultPeriod()
  }

  const { start, end } = getPeriodRange(filters.period)
  const employeeIds = await getFilteredEmployeeIds(filters)
  const employeeFilter =
    employeeIds.length > 0 ? { employeeId: { in: employeeIds } } : {}

  const types = await prisma.timeOffType.findMany({
    where: { active: true },
  })

  const result = []
  for (const type of types) {
    const approved = await prisma.timeOffRequest.aggregate({
      where: {
        ...employeeFilter,
        typeId: type.id,
        status: 'APPROVED',
        startDate: { gte: start },
        endDate: { lte: end },
      },
      _sum: { duration: true },
    })

    const pending = await prisma.timeOffRequest.count({
      where: {
        ...employeeFilter,
        typeId: type.id,
        status: 'PENDING',
      },
    })

    let remainingBalance = null
    if (type.requiresAllocation) {
      const alloc = await prisma.timeOffAllocation.aggregate({
        where: {
          ...employeeFilter,
          typeId: type.id,
          status: 'APPROVED',
        },
        _sum: { allocated: true, taken: true },
      })
      const totalAllocated = alloc._sum.allocated || 0
      const totalTaken = alloc._sum.taken || 0
      remainingBalance = totalAllocated - totalTaken
    }

    result.push({
      typeName: type.name,
      unit: type.unit,
      approvedDays: approved._sum.duration || 0,
      pending,
      remainingBalance,
      requiresAllocation: type.requiresAllocation,
    })
  }
  return result
}

/**
 * Function G — getDepartmentOverview(filters)
 */
async function getDepartmentOverview(filters = {}) {
  if (!filters.period) {
    filters.period = await getDefaultPeriod()
  }

  const { start, end } = getPeriodRange(filters.period)
  const employeeIds = await getFilteredEmployeeIds(filters)

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  })

  const result = []
  for (const dept of departments) {
    const deptEmployees = await prisma.employee.findMany({
      where: {
        ...(employeeIds.length > 0 && { id: { in: employeeIds } }),
        departmentId: dept.id,
      },
      select: { id: true },
    })
    const headcount = deptEmployees.length
    if (headcount === 0) continue

    const deptEmpIds = deptEmployees.map((e) => e.id)
    const salarySum = await prisma.payslip.aggregate({
      where: {
        employeeId: { in: deptEmpIds },
        status: { in: ['DONE', 'PAID'] },
        periodStart: { gte: start },
        periodEnd: { lte: end },
      },
      _sum: { net: true },
    })

    result.push({
      department: dept.name,
      headcount,
      monthlySalary: salarySum._sum.net || 0,
    })
  }
  return result.sort((a, b) => b.headcount - a.headcount)
}

/**
 * Function H — getFilterOptions()
 */
async function getFilterOptions() {
  // Departments
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // Employee Types (workLocation values in DB)
  const workLocations = await prisma.employee.findMany({
    where: { workLocation: { not: null } },
    select: { workLocation: true },
    distinct: ['workLocation'],
  })
  const employeeTypes = workLocations
    .map((e) => e.workLocation)
    .filter(Boolean)

  // Companies (company field on Employee)
  const companies = await prisma.employee.findMany({
    where: { company: { not: null } },
    select: { company: true },
    distinct: ['company'],
  })
  const companyList = companies.map((e) => e.company).filter(Boolean)
  if (companyList.length === 0) companyList.push('PeoplePay360')

  // Available periods (from payslips and payruns in DB)
  const payslipPeriods = await prisma.payslip.findMany({
    select: { periodStart: true },
    distinct: ['periodStart'],
    orderBy: { periodStart: 'desc' },
  })
  const payrunPeriods = await prisma.payrun.findMany({
    select: { periodStart: true },
    distinct: ['periodStart'],
    orderBy: { periodStart: 'desc' },
  })

  const allPeriodDates = [
    ...payslipPeriods.map((p) => p.periodStart),
    ...payrunPeriods.map((p) => p.periodStart),
  ]

  const periodOptions = allPeriodDates.map((date) => {
    const d = new Date(date)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    }
  })

  // Fallback to current month if no periods
  if (periodOptions.length === 0) {
    const now = new Date()
    periodOptions.push({
      value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      label: now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    })
  }

  // Deduplicate
  const uniquePeriods = [
    ...new Map(periodOptions.map((p) => [p.value, p])).values(),
  ]

  return {
    departments,
    employeeTypes,
    companyList,
    periods: uniquePeriods,
  }
}

module.exports = {
  getSummaryCards,
  getSalaryByDepartment,
  getSalaryTrend,
  getPayslipStatusSplit,
  getAttendanceOverview,
  getTimeOffOverview,
  getDepartmentOverview,
  getFilterOptions,
}
