const dayjs = require('dayjs')
const { autoCreateAbsentRecords } = require('../services/attendance.service')

/**
 * Schedule daily midnight absent checker to run automatically at 00:05 AM every day
 */
const startAttendanceCron = () => {
  const runMidnightAbsentSync = async () => {
    try {
      // Run for yesterday's date (marking unrecorded sessions as ABSENT)
      const yesterday = dayjs().subtract(1, 'day').toDate()
      const result = await autoCreateAbsentRecords(yesterday)
      console.log(
        `[CRON] Midnight Auto-Absent Job completed for ${dayjs(yesterday).format('YYYY-MM-DD')}: ` +
          `${result.createdAbsent} absent records, ${result.createdLeave} leave records created.`
      )
    } catch (err) {
      console.error('[CRON] Error during midnight auto-absent execution:', err)
    }
  }

  const now = dayjs()
  // Next run at tomorrow 00:05
  const nextRun = now.add(1, 'day').startOf('day').add(5, 'minute')
  const delayMs = nextRun.diff(now)

  setTimeout(() => {
    runMidnightAbsentSync()
    // Repeat every 24 hours thereafter
    setInterval(runMidnightAbsentSync, 24 * 60 * 60 * 1000)
  }, delayMs)

  console.log(`🕒 Midnight attendance cron active. Next scheduled sync at: ${nextRun.format('YYYY-MM-DD HH:mm:ss')}`)
}

module.exports = { startAttendanceCron }
