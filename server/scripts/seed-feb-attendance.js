const prisma = require('../src/config/prisma')
const dayjs = require('dayjs')

async function seedFebAttendance() {
  console.log('Seeding February 2026 attendance records...')
  const employees = await prisma.employee.findMany()

  // Generate the 22 working days of Feb 2026
  const dates = []
  let cur = dayjs('2026-02-01')
  const end = dayjs('2026-02-28')

  while (!cur.isAfter(end)) {
    const dow = cur.day() // 0 = Sun, 6 = Sat
    if (dow !== 0) {
      if (dow === 6) {
        const dom = cur.date()
        const weekNum = Math.ceil(dom / 7)
        if (weekNum !== 2 && weekNum !== 4) {
          dates.push(cur)
        }
      } else {
        dates.push(cur)
      }
    }
    cur = cur.add(1, 'day')
  }

  console.log(`Generated ${dates.length} working days in Feb 2026`)

  const records = []
  for (const emp of employees) {
    for (const d of dates) {
      const checkIn = d.hour(9).minute(0).second(0).toDate()
      const checkOut = d.hour(17).minute(0).second(0).toDate()
      records.push({
        employeeId: emp.id,
        checkIn,
        checkOut,
        workedHours: 7,
        overtime: 0,
        status: 'PRESENT',
        isManualEdit: false,
        createdAt: checkIn,
        updatedAt: checkOut,
      })
    }
  }

  await prisma.attendance.createMany({ data: records })
  console.log(`✅ Seeded ${records.length} attendance records for Feb 2026`)
  process.exit(0)
}

seedFebAttendance().catch(err => {
  console.error(err)
  process.exit(1)
})
