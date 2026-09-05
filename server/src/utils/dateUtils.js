const dayjs = require('dayjs')

// Calculate worked hours between two timestamps (returns decimal hours)
const calcWorkedHours = (checkIn, checkOut, breakMinutes = 0) => {
  if (!checkIn || !checkOut) return 0
  const totalMinutes = dayjs(checkOut).diff(dayjs(checkIn), 'minute')
  const netMinutes = Math.max(0, totalMinutes - breakMinutes)
  return Math.round((netMinutes / 60) * 100) / 100
}

// Check if two date ranges overlap
const datesOverlap = (start1, end1, start2, end2) => {
  const s1 = dayjs(start1), e1 = end1 ? dayjs(end1) : dayjs('2099-12-31')
  const s2 = dayjs(start2), e2 = end2 ? dayjs(end2) : dayjs('2099-12-31')
  return s1.isBefore(e2) && s2.isBefore(e1) ||
         s1.isSame(s2) || e1.isSame(e2)
}

// Find working days between two dates (Mon–Fri only)
const workingDaysBetween = (start, end) => {
  let count = 0
  let current = dayjs(start)
  const endDate = dayjs(end)
  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    const day = current.day()
    if (day !== 0 && day !== 6) count++
    current = current.add(1, 'day')
  }
  return count
}

module.exports = { calcWorkedHours, datesOverlap, workingDaysBetween }
