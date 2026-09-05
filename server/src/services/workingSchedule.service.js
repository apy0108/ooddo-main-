const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

// ── Helper — calc hours for one line ──────────────────────────
const calcLineHours = (line) => {
  const [startH, startM] = line.startTime.split(':').map(Number)
  const [endH, endM]     = line.endTime.split(':').map(Number)
  const totalMins = (endH * 60 + endM) - (startH * 60 + startM)
  const netMins   = Math.max(0, totalMins - (line.breakMinutes || 0))
  return Math.round((netMins / 60) * 100) / 100
}

// ── Auto-calculate weeklyHours from lines ─────────────────────
const calcWeeklyHours = (lines) => {
  return lines.reduce((sum, line) => {
    return sum + calcLineHours(line)
  }, 0)
}

// ── List all schedules ────────────────────────────────────────
const getAll = async (query = {}) => {
  const { search, isActive } = query
  return prisma.workingSchedule.findMany({
    where: {
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
    },
    include: {
      lines: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      _count: { select: { employees: true, contracts: true } },
    },
    orderBy: { name: 'asc' },
  })
}

// ── Get one schedule by ID ────────────────────────────────────
const getById = async (id) => {
  const schedule = await prisma.workingSchedule.findUnique({
    where: { id },
    include: {
      lines: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      _count: { select: { employees: true, contracts: true } },
    },
  })
  if (!schedule) throw new AppError('Working schedule not found', 404)
  return schedule
}

// ── Create schedule ───────────────────────────────────────────
const create = async (data) => {
  const { name, scheduleType = 'FIXED', timezone, lines = [] } = data

  const existing = await prisma.workingSchedule.findUnique({ where: { name } })
  if (existing) throw new AppError('A schedule with this name already exists', 400)

  const weeklyHours = calcWeeklyHours(lines)

  return prisma.workingSchedule.create({
    data: {
      name,
      scheduleType,
      timezone: timezone || 'Asia/Kolkata',
      weeklyHours,
      lines: {
        create: lines.map((line) => ({
          dayOfWeek:    line.dayOfWeek,
          startTime:    line.startTime,
          endTime:      line.endTime,
          breakMinutes: line.breakMinutes || 0,
          workedHours:  calcLineHours(line),
        })),
      },
    },
    include: {
      lines: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
  })
}

// ── Update schedule ───────────────────────────────────────────
const update = async (id, data) => {
  await getById(id)
  const { name, scheduleType, timezone, isActive, lines } = data

  const weeklyHours = lines ? calcWeeklyHours(lines) : undefined

  // Delete existing lines and recreate if lines provided
  if (lines) {
    await prisma.scheduleLine.deleteMany({ where: { workingScheduleId: id } })
  }

  return prisma.workingSchedule.update({
    where: { id },
    data: {
      ...(name         !== undefined && { name }),
      ...(scheduleType !== undefined && { scheduleType }),
      ...(timezone     !== undefined && { timezone }),
      ...(isActive     !== undefined && { isActive }),
      ...(weeklyHours  !== undefined && { weeklyHours }),
      ...(lines && {
        lines: {
          create: lines.map((line) => ({
            dayOfWeek:    line.dayOfWeek,
            startTime:    line.startTime,
            endTime:      line.endTime,
            breakMinutes: line.breakMinutes || 0,
            workedHours:  calcLineHours(line),
          })),
        },
      }),
    },
    include: {
      lines: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    },
  })
}

// ── Delete schedule ───────────────────────────────────────────
const remove = async (id) => {
  const schedule = await prisma.workingSchedule.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, contracts: true } } },
  })
  if (!schedule) throw new AppError('Schedule not found', 404)
  if (schedule._count.employees > 0 || schedule._count.contracts > 0)
    throw new AppError(
      'Cannot delete a schedule that is assigned to employees or contracts',
      400
    )
  return prisma.workingSchedule.delete({ where: { id } })
}

module.exports = { getAll, getById, create, update, remove }
