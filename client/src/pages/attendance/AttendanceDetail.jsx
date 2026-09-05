import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Building2,
  Briefcase,
  AlertTriangle,
  FileEdit,
  Save,
  X,
  History,
  CheckCircle2,
  CalendarClock,
  Sparkles,
} from 'lucide-react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import attendanceApi from '../../api/attendance.api'
import useAuthStore from '../../store/authStore'
import { getInitials } from '../../utils/formatters'

const STATUS_BADGES = {
  PRESENT: {
    label: 'Present',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  LATE: {
    label: 'Late',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  HALF_DAY: {
    label: 'Half Day',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  ABSENT: {
    label: 'Absent',
    cls: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  ON_LEAVE: {
    label: 'On Leave',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  HOLIDAY: {
    label: 'Holiday',
    cls: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
  },
}

export default function AttendanceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Rule A2: Only HR_MANAGER, HR_PAYROLL_MANAGER, and ADMIN can manually edit
  const canEdit = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(user?.role)

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    status: '',
    checkInTime: '',
    checkOutTime: '',
    reason: '',
    editNote: '',
  })

  // Fetch Attendance Record
  const { data: recordRes, isLoading, error } = useQuery({
    queryKey: ['attendanceDetail', id],
    queryFn: () => attendanceApi.getOne(id),
  })

  const record = recordRes?.data

  // Initialize edit form when record is loaded
  useEffect(() => {
    if (record) {
      setFormData({
        status: record.status || 'PRESENT',
        checkInTime: record.checkIn ? dayjs(record.checkIn).format('HH:mm') : '',
        checkOutTime: record.checkOut ? dayjs(record.checkOut).format('HH:mm') : '',
        reason: record.reason || '',
        editNote: '',
      })
    }
  }, [record, isEditing])

  const recordDateStr = useMemo(() => {
    if (!record) return ''
    return dayjs(record.checkIn || record.createdAt).format('YYYY-MM-DD')
  }, [record])

  const scheduledHours = record?.scheduledHours || 8
  const isNoPunchStatus = formData.status === 'ABSENT' || formData.status === 'ON_LEAVE'

  // Live recalculation during edit mode
  const { liveWorkedHours, liveOvertime } = useMemo(() => {
    if (!isEditing || isNoPunchStatus || !formData.checkInTime || !formData.checkOutTime) {
      return { liveWorkedHours: 0, liveOvertime: 0 }
    }

    const start = dayjs(`${recordDateStr}T${formData.checkInTime}`)
    const end = dayjs(`${recordDateStr}T${formData.checkOutTime}`)
    const diff = end.diff(start)
    if (diff <= 0) return { liveWorkedHours: 0, liveOvertime: 0 }

    const worked = Math.round((diff / 3600000) * 100) / 100
    const ot = Math.max(0, Math.round((worked - scheduledHours) * 100) / 100)
    return { liveWorkedHours: worked, liveOvertime: ot }
  }, [isEditing, isNoPunchStatus, formData.checkInTime, formData.checkOutTime, recordDateStr, scheduledHours])

  // Save manual edit mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => attendanceApi.update(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['attendanceDetail', id])
      queryClient.invalidateQueries(['attendanceList'])
      setIsEditing(false)
      toast.success('Attendance record updated with audit note!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update attendance record')
    },
  })

  const handleSave = (e) => {
    e.preventDefault()

    if (!formData.editNote.trim()) {
      toast.error('Audit note is required for manual adjustments')
      return
    }

    if (!isNoPunchStatus) {
      if (formData.checkInTime && formData.checkOutTime) {
        const start = dayjs(`${recordDateStr}T${formData.checkInTime}`)
        const end = dayjs(`${recordDateStr}T${formData.checkOutTime}`)
        if (end.isBefore(start) || end.isSame(start)) {
          toast.error('Check-out time must be after check-in time')
          return
        }
      }
    }

    const payload = {
      status: formData.status,
      checkIn: isNoPunchStatus
        ? null
        : formData.checkInTime
        ? dayjs(`${recordDateStr}T${formData.checkInTime}`).toISOString()
        : null,
      checkOut:
        isNoPunchStatus || !formData.checkOutTime
          ? null
          : dayjs(`${recordDateStr}T${formData.checkOutTime}`).toISOString(),
      reason: formData.reason.trim() || null,
      editNote: formData.editNote.trim(),
    }

    updateMutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center font-sans">
        <Clock className="w-8 h-8 text-[#205493] animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading attendance record details...</p>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="py-20 text-center font-sans max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-sm font-bold text-gray-800">Attendance Record Not Found</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          {error?.response?.data?.message || 'The requested record does not exist or you do not have permission to view it.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/attendance')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back to Attendance</span>
        </button>
      </div>
    )
  }

  const badge = STATUS_BADGES[record.status] || STATUS_BADGES.PRESENT
  const employee = record.employee
  const displayName = `${employee?.firstName} ${employee?.lastName}`
  const initials = getInitials(displayName) || 'EM'
  const recordDate = record.checkIn || record.createdAt

  // Split audit notes into individual entries if multiline
  const auditEntries = (record.notes || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <div className="space-y-6 font-sans pb-20 max-w-5xl">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link to="/attendance" className="hover:text-[#205493] flex items-center gap-1">
              <ArrowLeft size={13} />
              <span>Attendance</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">
              {dayjs(recordDate).format('MMM DD, YYYY')} — {displayName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Attendance Details
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <span>{badge.label}</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isEditing && canEdit && (
            <button
              type="button"
              id="edit-attendance-btn"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
            >
              <FileEdit size={14} className="text-[#205493]" />
              <span>EDIT RECORD</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/attendance')}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 rounded-lg transition cursor-pointer"
          >
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* ── Amber Banner for Manual Edit Audit Trail ── */}
      {record.isManualEdit && (
        <div
          id="manual-edit-audit-banner"
          className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/95 border border-amber-200 text-amber-900 shadow-2xs animate-in fade-in duration-200"
        >
          <div className="p-1.5 bg-amber-100/80 rounded-lg text-amber-700 shrink-0 mt-0.5">
            <AlertTriangle size={18} />
          </div>
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px]">
                Manual Adjustment Notice
              </span>
              <span className="text-[11px] text-amber-600">
                • {dayjs(record.updatedAt).format('MMM DD, YYYY [at] hh:mm A')}
              </span>
            </div>
            <p className="mt-1 text-amber-900 leading-relaxed font-medium">
              This attendance record was manually modified by{' '}
              <span className="font-bold underline decoration-amber-300">{record.editedBy || 'HR'}</span>.
            </p>
            {record.editNote && (
              <p className="mt-1 text-amber-800 italic bg-amber-100/50 px-2.5 py-1 rounded border border-amber-200/60 inline-block">
                "{record.editNote}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT MODE FORM ── */}
      {isEditing ? (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Adjust Attendance Record
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Modifications are restricted under Rule A2 and logged into the audit ledger.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Attendance Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493]"
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Check In Time {!isNoPunchStatus && <span className="text-red-500">*</span>}
              </label>
              <input
                type="time"
                disabled={isNoPunchStatus}
                value={formData.checkInTime}
                onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Check Out Time
              </label>
              <input
                type="time"
                disabled={isNoPunchStatus}
                value={formData.checkOutTime}
                onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Live Recalculation Preview */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-center text-xs">
            <div>
              <span className="text-[10px] text-blue-600 uppercase font-semibold block">
                Scheduled Daily
              </span>
              <span className="font-bold text-gray-900 text-sm">{scheduledHours} hrs</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-600 uppercase font-semibold block">
                Calculated Worked
              </span>
              <span className="font-bold text-gray-900 text-sm">{liveWorkedHours} hrs</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-600 uppercase font-semibold block">
                Calculated Overtime
              </span>
              <span
                className={`font-bold text-sm ${
                  liveOvertime > 0 ? 'text-emerald-700' : 'text-gray-600'
                }`}
              >
                {liveOvertime > 0 ? `+${liveOvertime} hrs` : '0 hrs'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reason / Circumstance (Optional)
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Swiped badge error, metro signal delay, onsite customer meeting"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493]"
            />
          </div>

          {/* Mandatory Edit Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reason / Edit Note (Mandatory for Audit Trail) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              id="edit-note-input"
              value={formData.editNote}
              onChange={(e) => setFormData({ ...formData, editNote: e.target.value })}
              placeholder="State the reason for this manual correction..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-attendance-adjustments-btn"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#205493] hover:bg-[#184275] rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Adjustments'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* ── VIEW MODE: 2-COLUMN GRID ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Employee & Schedule Profile */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 space-y-5">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Employee Profile
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#1e4e8c] text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {initials}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">
                    {displayName}
                  </h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {employee?.employeeNumber}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{employee?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Building2 size={14} className="text-gray-400" />
                  <span>Department</span>
                </span>
                <span className="font-semibold text-gray-800">
                  {employee?.department?.name || 'Operations'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-gray-400" />
                  <span>Job Position</span>
                </span>
                <span className="font-semibold text-gray-800">
                  {employee?.jobPosition?.title || 'Staff'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <CalendarClock size={14} className="text-gray-400" />
                  <span>Working Schedule</span>
                </span>
                <span className="font-semibold text-[#205493]">
                  {employee?.workingSchedule?.name || 'Standard 40h Week'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <Link
                to={`/attendance?employeeId=${employee?.id}`}
                className="w-full flex items-center justify-center py-2 text-xs text-[#205493] bg-blue-50/70 hover:bg-blue-100 rounded-lg font-semibold transition"
              >
                View Full Employee Punch History
              </Link>
            </div>
          </div>

          {/* Middle & Right Column: Shift Timings & Hours Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Shift & Punch Records
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-6">
                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">
                    Date
                  </span>
                  <span className="text-xs font-bold text-gray-900 block">
                    {dayjs(recordDate).format('MMM DD, YYYY')}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {dayjs(recordDate).format('dddd')}
                  </span>
                </div>

                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">
                    Check In
                  </span>
                  <span className="text-sm font-bold text-gray-900 block">
                    {record.checkIn ? dayjs(record.checkIn).format('hh:mm A') : '—'}
                  </span>
                  {record.checkIn && (
                    <span className="text-[10px] text-gray-400">
                      {dayjs(record.checkIn).format('HH:mm:ss')}
                    </span>
                  )}
                </div>

                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">
                    Check Out
                  </span>
                  <span className="text-sm font-bold text-gray-900 block">
                    {record.checkOut ? (
                      dayjs(record.checkOut).format('hh:mm A')
                    ) : record.checkIn ? (
                      <span className="text-blue-600 text-xs">In Progress</span>
                    ) : (
                      '—'
                    )}
                  </span>
                  {record.checkOut && (
                    <span className="text-[10px] text-gray-400">
                      {dayjs(record.checkOut).format('HH:mm:ss')}
                    </span>
                  )}
                </div>

                <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">
                    Status
                  </span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              </div>

              {/* Hours Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50/60 rounded-xl border border-gray-200/80 text-center">
                <div>
                  <span className="text-[11px] text-gray-500 uppercase font-semibold block">
                    Scheduled Shift
                  </span>
                  <span className="text-lg font-bold text-gray-800 mt-0.5 block">
                    {scheduledHours} hrs
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-gray-500 uppercase font-semibold block">
                    Worked Hours
                  </span>
                  <span className="text-lg font-bold text-gray-900 mt-0.5 block">
                    {record.workedHours !== null && record.workedHours !== undefined
                      ? `${record.workedHours} hrs`
                      : '0 hrs'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-emerald-700 uppercase font-semibold block">
                    Overtime Hours
                  </span>
                  <span
                    className={`text-lg font-bold mt-0.5 block ${
                      (record.overtime || 0) > 0 ? 'text-emerald-700' : 'text-gray-500'
                    }`}
                  >
                    {(record.overtime || 0) > 0 ? `+${record.overtime} hrs` : '0 hrs'}
                  </span>
                </div>
              </div>

              {/* Reason / Circumstance if recorded */}
              {record.reason && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <span className="font-semibold text-gray-700 block mb-0.5">
                    Recorded Reason:
                  </span>
                  <p className="text-gray-600">{record.reason}</p>
                </div>
              )}
            </div>

            {/* ── Audit Trail & History Log ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <History size={16} className="text-[#205493]" />
                  <span>Audit Trail & Activity Log</span>
                </div>
                <span className="text-[11px] text-gray-400">
                  {auditEntries.length} log entries
                </span>
              </div>

              {auditEntries.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 text-center">
                  No manual modifications or special audit logs attached to this record.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50/90 rounded-xl border border-gray-200/80 text-xs text-gray-700 font-mono flex items-start gap-2.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#205493] mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{entry}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
