import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, Calendar, User, FileText, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import Modal from '../../components/ui/Modal'
import { employeesApi } from '../../api/employees.api'
import attendanceApi from '../../api/attendance.api'
import useAuthStore from '../../store/authStore'

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', desc: 'Normal full shift attendance' },
  { value: 'LATE', label: 'Late', desc: 'Checked in after schedule start grace period' },
  { value: 'HALF_DAY', label: 'Half Day', desc: 'Worked less than half of daily shift' },
  { value: 'ABSENT', label: 'Absent', desc: 'No attendance recorded' },
  { value: 'ON_LEAVE', label: 'On Leave', desc: 'Approved leave absence' },
]

export default function CreateAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedEmployeeId = null,
}) {
  const { user } = useAuthStore()

  // Fetch active employees
  const { data: employeesRes, isLoading: loadingEmployees } = useQuery({
    queryKey: ['activeEmployeesForAttendance'],
    queryFn: () => employeesApi.getAll({ limit: 100, status: 'ACTIVE' }),
    enabled: isOpen,
  })

  const employees = employeesRes?.employees || employeesRes?.data || []

  // Form State
  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || '')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [status, setStatus] = useState('PRESENT')
  const [checkInTime, setCheckInTime] = useState('09:00')
  const [checkOutTime, setCheckOutTime] = useState('17:00')
  const [reason, setReason] = useState('')
  const [editNote, setEditNote] = useState('Manual record creation')
  const [submitting, setSubmitting] = useState(false)

  // Sync preselected employee
  useEffect(() => {
    if (preselectedEmployeeId) {
      setEmployeeId(preselectedEmployeeId)
    } else if (employees.length > 0 && !employeeId) {
      setEmployeeId(employees[0].id)
    }
  }, [preselectedEmployeeId, employees])

  // Selected employee object & schedule
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === employeeId)
  }, [employees, employeeId])

  const isNoPunchStatus = status === 'ABSENT' || status === 'ON_LEAVE'

  // Scheduled hours calculation (defaults to 8 if not found)
  const scheduledHours = useMemo(() => {
    if (!selectedEmployee?.workingSchedule?.lines) return 8
    const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][
      dayjs(date).day()
    ]
    const line = selectedEmployee.workingSchedule.lines.find((l) => l.dayOfWeek === dayName)
    return line && typeof line.workedHours === 'number' ? line.workedHours : 8
  }, [selectedEmployee, date])

  // Live worked hours & overtime calculation
  const { workedHours, overtime } = useMemo(() => {
    if (isNoPunchStatus || !checkInTime || !checkOutTime) {
      return { workedHours: 0, overtime: 0 }
    }

    const startDateTime = dayjs(`${date}T${checkInTime}`)
    const endDateTime = dayjs(`${date}T${checkOutTime}`)
    const diffMs = endDateTime.diff(startDateTime)

    if (diffMs <= 0) {
      return { workedHours: 0, overtime: 0 }
    }

    const worked = Math.round((diffMs / 3600000) * 100) / 100
    const ot = Math.max(0, Math.round((worked - scheduledHours) * 100) / 100)
    return { workedHours: worked, overtime: ot }
  }, [date, checkInTime, checkOutTime, scheduledHours, isNoPunchStatus])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!employeeId) {
      toast.error('Please select an employee')
      return
    }

    if (!isNoPunchStatus) {
      if (!checkInTime) {
        toast.error('Check-in time is required for this status')
        return
      }
      if (checkOutTime) {
        const start = dayjs(`${date}T${checkInTime}`)
        const end = dayjs(`${date}T${checkOutTime}`)
        if (end.isBefore(start) || end.isSame(start)) {
          toast.error('Check-out time must be after check-in time')
          return
        }
      }
    }

    if (!editNote.trim()) {
      toast.error('Please provide an audit note for this manual entry')
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        employeeId,
        date,
        status,
        checkIn: isNoPunchStatus ? null : dayjs(`${date}T${checkInTime}`).toISOString(),
        checkOut:
          isNoPunchStatus || !checkOutTime
            ? null
            : dayjs(`${date}T${checkOutTime}`).toISOString(),
        reason: reason.trim() || null,
        editNote: editNote.trim(),
        notes: `Created manually by ${user?.email || 'HR'} on ${dayjs().format('YYYY-MM-DD HH:mm')}`,
      }

      const res = await attendanceApi.create(payload)
      if (res.success) {
        toast.success('Attendance record created successfully')
        onSuccess?.()
        onClose()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create attendance record')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Attendance Record"
      subtitle="Manually create an attendance entry with audit trail logging"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 font-sans">
        {/* Audit Warning Banner */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Audit Trail Notice</p>
            <p className="mt-0.5 text-amber-700/90 leading-relaxed">
              This entry will be permanently marked as a manual adjustment, tagged with your account credentials and the note provided below.
            </p>
          </div>
        </div>

        {/* Employee Selection & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={!!preselectedEmployeeId || loadingEmployees}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] transition"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeNumber}) —{' '}
                  {emp.department?.name || 'General'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={dayjs().format('YYYY-MM-DD')}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] transition"
            />
          </div>
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Attendance Status <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                  status === opt.value
                    ? 'bg-[#205493] text-white border-[#205493] shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Check In / Out Time Inputs (Disabled if ABSENT / ON_LEAVE) */}
        {!isNoPunchStatus ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Check In Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-[#205493] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Check Out Time
              </label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-[#205493] transition"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 text-center">
            Punches are not applicable for <span className="font-semibold text-gray-700">{status}</span> status. Check-in and check-out will remain blank.
          </div>
        )}

        {/* Live Calculation Preview Banner */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-center text-xs">
          <div>
            <span className="text-[10px] text-blue-600 uppercase font-semibold block">
              Scheduled Shift
            </span>
            <span className="font-bold text-gray-900 text-sm">{scheduledHours} hrs</span>
          </div>
          <div>
            <span className="text-[10px] text-blue-600 uppercase font-semibold block">
              Calculated Worked
            </span>
            <span className="font-bold text-gray-900 text-sm">{workedHours} hrs</span>
          </div>
          <div>
            <span className="text-[10px] text-blue-600 uppercase font-semibold block">
              Calculated Overtime
            </span>
            <span
              className={`font-bold text-sm ${
                overtime > 0 ? 'text-emerald-700' : 'text-gray-600'
              }`}
            >
              {overtime > 0 ? `+${overtime} hrs` : '0 hrs'}
            </span>
          </div>
        </div>

        {/* Reason / Note Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reason / Circumstance (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Swiped at turnstile, metro signal delay, official offsite"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Audit Note <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Document why this manual record is being created..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] transition resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            id="modal-create-attendance-submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#205493] hover:bg-[#184275] rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Creating Record...' : 'Create Record'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
