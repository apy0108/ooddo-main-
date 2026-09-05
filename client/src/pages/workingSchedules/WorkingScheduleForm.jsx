import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  Save,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { workingSchedulesApi } from '../../api/workingSchedules.api'

const DAYS = [
  { value: 'MONDAY',    label: 'Monday' },
  { value: 'TUESDAY',   label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY',  label: 'Thursday' },
  { value: 'FRIDAY',    label: 'Friday' },
  { value: 'SATURDAY',  label: 'Saturday' },
  { value: 'SUNDAY',    label: 'Sunday' },
]

const calcLineHours = (line) => {
  const [startH, startM] = (line.startTime || '09:00').split(':').map(Number)
  const [endH, endM]     = (line.endTime || '18:00').split(':').map(Number)
  const totalMins = (endH * 60 + endM) - (startH * 60 + startM)
  const netMins   = Math.max(0, totalMins - (line.breakMinutes || 0))
  return Math.round((netMins / 60) * 100) / 100
}

const defaultLine = () => ({
  _key: Date.now() + Math.random(),
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 60,
})

export default function WorkingScheduleForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [isActive, setIsActive] = useState(true)
  const [lines, setLines] = useState([defaultLine()])

  // Fetch existing schedule for edit
  const { data: scheduleRes, isLoading } = useQuery({
    queryKey: ['working-schedule', id],
    queryFn: () => workingSchedulesApi.getOne(id),
    enabled: isEdit,
  })

  const schedule = scheduleRes?.data

  // Populate form on load
  useEffect(() => {
    if (schedule) {
      setName(schedule.name || '')
      setTimezone(schedule.timezone || 'Asia/Kolkata')
      setIsActive(schedule.isActive ?? true)
      if (schedule.lines && schedule.lines.length > 0) {
        setLines(
          schedule.lines.map((l) => ({
            _key: l.id || Date.now() + Math.random(),
            dayOfWeek: l.dayOfWeek,
            startTime: l.startTime,
            endTime: l.endTime,
            breakMinutes: l.breakMinutes,
          }))
        )
      } else {
        setLines([])
      }
    }
  }, [schedule])

  // Auto-calculate derived values
  const daysPerWeek = useMemo(() => {
    const unique = new Set(lines.map((l) => l.dayOfWeek))
    return unique.size
  }, [lines])

  const totalWeeklyHours = useMemo(() => {
    return lines.reduce((sum, line) => sum + calcLineHours(line), 0)
  }, [lines])

  // ── Line handlers ──
  const addLine = () => {
    setLines((prev) => [...prev, defaultLine()])
  }

  const removeLine = (idx) => {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateLine = (idx, field, value) => {
    setLines((prev) =>
      prev.map((line, i) =>
        i === idx ? { ...line, [field]: field === 'breakMinutes' ? parseInt(value) || 0 : value } : line
      )
    )
  }

  // ── Save mutations ──
  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? workingSchedulesApi.update(id, payload)
        : workingSchedulesApi.create(payload),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Schedule updated successfully' : 'Schedule created successfully')
      queryClient.invalidateQueries({ queryKey: ['working-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['working-schedule', id] })
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      const newId = res?.data?.id || id
      navigate(`/working-schedules/${newId}`)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to save schedule'
      toast.error(msg)
    },
  })

  const handleSave = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Schedule name is required')
      return
    }

    saveMutation.mutate({
      name: name.trim(),
      timezone,
      isActive,
      lines: lines.map((l) => ({
        dayOfWeek: l.dayOfWeek,
        startTime: l.startTime,
        endTime: l.endTime,
        breakMinutes: l.breakMinutes,
      })),
    })
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <Loader2 size={32} className="animate-spin text-[#205493] mb-3" />
        <p className="text-xs font-semibold">Loading schedule...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            to="/working-schedules"
            className="inline-flex items-center gap-1 text-xs text-[#205493] hover:underline font-semibold mb-1"
          >
            <ArrowLeft size={13} />
            <span>Back to list</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEdit ? name || 'Edit Schedule' : 'New Working Schedule'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Top Fields ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Schedule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard 40h Week"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Days per Week
                </label>
                <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                  {daysPerWeek} {daysPerWeek === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Kolkata"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Hours per Week
                </label>
                <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                  {totalWeeklyHours}h
                </div>
              </div>
            </div>
          </div>

          {/* Active toggle (edit mode only) */}
          {isEdit && (
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-500">Active</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  isActive ? 'bg-[#205493]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-500">
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}
        </div>

        {/* ── Weekly Schedule Section ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Weekly Schedule</h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <Plus size={13} />
              <span>Add Day</span>
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-xs">
              No schedule lines defined. Click "+ Add Day" to add working days.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-2.5 px-4">Day</th>
                    <th className="py-2.5 px-4">Start Time</th>
                    <th className="py-2.5 px-4">End Time</th>
                    <th className="py-2.5 px-4">Break</th>
                    <th className="py-2.5 px-4">Hours</th>
                    <th className="py-2.5 px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {lines.map((line, idx) => {
                    const hours = calcLineHours(line)
                    return (
                      <tr key={line._key} className="hover:bg-blue-50/30 transition">
                        <td className="py-2 px-4">
                          <select
                            value={line.dayOfWeek}
                            onChange={(e) => updateLine(idx, 'dayOfWeek', e.target.value)}
                            className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
                          >
                            {DAYS.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="time"
                            value={line.startTime}
                            onChange={(e) => updateLine(idx, 'startTime', e.target.value)}
                            className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="time"
                            value={line.endTime}
                            onChange={(e) => updateLine(idx, 'endTime', e.target.value)}
                            className="px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={line.breakMinutes}
                              onChange={(e) => updateLine(idx, 'breakMinutes', e.target.value)}
                              className="w-16 px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                            />
                            <span className="text-[10px] text-gray-400">min</span>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <span className="font-medium text-gray-800">{hours}h</span>
                        </td>
                        <td className="py-2 px-4">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Total row */}
          {lines.length > 0 && (
            <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs font-bold text-gray-900">
                Total Weekly Hours: {totalWeeklyHours}h
              </span>
            </div>
          )}
        </div>

        {/* ── Form Buttons ── */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/working-schedules')}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save Schedule</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
