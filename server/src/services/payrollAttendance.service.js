const prisma = require('../config/prisma')
const dayjs = require('dayjs')

/**
 * Calculate total calendar working days in a period
 * Excludes Sundays and alternate Saturdays (or all Saturdays if standard 5-day week)
 * Standard Indian payroll month: ~22 days for Feb 2026, ~23 days for Jan 2026
 */
function getTotalWorkingDays(periodStart, periodEnd) {
  let count = 0
  let cur = dayjs(periodStart).startOf('day')
  const end = dayjs(periodEnd).endOf('day')

  while (cur.isBefore(end)) {
    const dow = cur.day() // 0 = Sunday, 6 = Saturday
    if (dow !== 0) {
      if (dow === 6) {
        // Saturday: check if 2nd or 4th Saturday of the month
        const dayOfMonth = cur.date()
        const weekNum = Math.ceil(dayOfMonth / 7)
        if (weekNum !== 2 && weekNum !== 4) {
          count++
        }
      } else {
        count++
      }
    }
    cur = cur.add(1, 'day')
  }

  return count > 0 ? count : 22
}

/**
 * Get worked days from attendance records for an employee within a period
 */
async function getWorkedDays(employeeId, periodStart, periodEnd) {
  const start = dayjs(periodStart).startOf('day').toDate()
  const end = dayjs(periodEnd).endOf('day').toDate()

  const records = await prisma.attendance.findMany({
    where: {
      employeeId,
      status: { in: ['PRESENT', 'HALF_DAY'] },
      OR: [
        { checkIn: { gte: start, lte: end } },
        { createdAt: { gte: start, lte: end } },
      ],
    },
  })

  let worked = 0
  for (const r of records) {
    if (r.status === 'PRESENT') worked += 1.0
    else if (r.status === 'HALF_DAY') worked += 0.5
  }

  const totalDays = getTotalWorkingDays(periodStart, periodEnd)

  return {
    workedDays: Math.round(worked),
    totalDays,
  }
}

module.exports = {
  getTotalWorkingDays,
  getWorkedDays,
}
