import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Clock,
  ArrowLeft,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock3,
  CalendarX,
  FileEdit,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import dayjs from 'dayjs'
import attendanceApi from '../../api/attendance.api'
import { employeesApi } from '../../api/employees.api'
import useAuthStore from '../../store/authStore'
import CreateAttendanceModal from './CreateAttendanceModal'
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

export default function AttendanceList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()

  const employeeId = searchParams.get('employeeId')
  const isEmployeeOnly = user?.role === 'EMPLOYEE'
  const canCreate = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(
    user?.role
  )

  // Filters state
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateQuickFilter, setDateQuickFilter] = useState('ALL') // ALL, TODAY, WEEK, MONTH
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  // Calculate start/end date based on quick filter
  const dateParams = useMemo(() => {
    if (dateQuickFilter === 'TODAY') {
      const todayStr = dayjs().format('YYYY-MM-DD')
      return { date: todayStr }
    }
    if (dateQuickFilter === 'WEEK') {
      return {
        startDate: dayjs().startOf('week').format('YYYY-MM-DD'),
        endDate: dayjs().endOf('week').format('YYYY-MM-DD'),
      }
    }
    if (dateQuickFilter === 'MONTH') {
      return {
        startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
        endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
      }
    }
    return {}
  }, [dateQuickFilter])

  // Fetch Attendance Records
  const {
    data: attendanceRes,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'attendanceList',
      {
        employeeId,
        status: statusFilter,
        search: debouncedSearch,
        dateQuickFilter,
        page,
      },
    ],
    queryFn: () =>
      attendanceApi.getAll({
        page,
        limit: 25,
        ...(employeeId && { employeeId }),
        ...(statusFilter && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...dateParams,
      }),
  })

  // Fetch employee info for Mode 2 header
  const { data: employeeRes } = useQuery({
    queryKey: ['employeeDetailForAttendance', employeeId],
    queryFn: () => employeesApi.getOne(employeeId),
    enabled: !!employeeId,
  })

  const records = attendanceRes?.data || []
  const meta = attendanceRes?.meta || { total: 0, totalPages: 1 }
  const employee = employeeRes?.data

  // Calculate summary metrics from records
  const metrics = useMemo(() => {
    const total = meta.total || records.length
    let present = 0
    let late = 0
    let halfDay = 0
    let absent = 0
    let totalOvertime = 0

    records.forEach((r) => {
      if (r.status === 'PRESENT') present++
      else if (r.status === 'LATE') late++
      else if (r.status === 'HALF_DAY') halfDay++
      else if (r.status === 'ABSENT') absent++
      if (r.overtime > 0) totalOvertime += r.overtime
    })

    return {
      total,
      present,
      late,
      halfDay,
      absent,
      totalOvertime: Math.round(totalOvertime * 100) / 100,
    }
  }, [records, meta.total])

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {employeeId && (
            <Link
              to={`/employees/${employeeId}`}
              className="inline-flex items-center gap-1.5 text-xs text-[#205493] hover:underline font-semibold mb-1"
            >
              <ArrowLeft size={13} />
              <span>Back to Employee Profile</span>
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span>
              {employeeId && employee
                ? `Attendance — ${employee.firstName} ${employee.lastName} (${employee.employeeNumber})`
                : isEmployeeOnly
                ? 'My Attendance Records'
                : 'Attendance Overview'}
            </span>
            {isFetching && <RefreshCw size={16} className="animate-spin text-gray-400" />}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {employeeId
              ? `Viewing comprehensive punch history and time logs for ${employee?.firstName || 'employee'}`
              : isEmployeeOnly
              ? 'Review your daily shifts, punch timings, worked hours, and overtime.'
              : 'Monitor employee attendance, check-ins, daily work hours, and overtime records.'}
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="new-attendance-btn"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer shrink-0"
            >
              <Plus size={15} />
              <span>NEW</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Total Logs
          </span>
          <p className="text-xl font-bold text-gray-900 mt-1">{meta.total}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Present
          </span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{metrics.present}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
            Late Check-In
          </span>
          <p className="text-xl font-bold text-amber-700 mt-1">{metrics.late}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
            Half Day
          </span>
          <p className="text-xl font-bold text-purple-700 mt-1">{metrics.halfDay}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
            Absent
          </span>
          <p className="text-xl font-bold text-rose-700 mt-1">{metrics.absent}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#205493] uppercase tracking-wider block">
            Overtime Hours
          </span>
          <p className="text-xl font-bold text-[#205493] mt-1">{metrics.totalOvertime} hrs</p>
        </div>
      </div>

      {/* ── Toolbar / Filters ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs">
        {/* Left: Quick Date Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'ALL', label: 'All Dates' },
            { id: 'TODAY', label: 'Today' },
            { id: 'WEEK', label: 'This Week' },
            { id: 'MONTH', label: 'This Month' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => {
                setDateQuickFilter(tab.id)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                dateQuickFilter === tab.id
                  ? 'bg-[#205493] text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Search & Status Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search box */}
          {!isEmployeeOnly && !employeeId && (
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee or ID..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] transition"
              />
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:bg-white focus:border-[#205493] transition"
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>

            <button
              type="button"
              onClick={() => refetch()}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table / Records List ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw size={24} className="animate-spin text-[#205493] mx-auto mb-2" />
            <p className="text-xs text-gray-500">Loading attendance records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <Clock size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">No attendance records found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No matching attendance logs found for the selected filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
                  <th className="py-3 px-4">Date</th>
                  {!employeeId && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Worked Hours</th>
                  <th className="py-3 px-4">Overtime</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Audit / Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {records.map((rec) => {
                  const recordDate = rec.checkIn || rec.createdAt
                  const badge = STATUS_BADGES[rec.status] || STATUS_BADGES.PRESENT
                  const hasAudit = rec.isManualEdit

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => navigate(`/attendance/${rec.id}`)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {dayjs(recordDate).format('ddd, MMM DD, YYYY')}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {dayjs(recordDate).format('YYYY-MM-DD')}
                        </span>
                      </td>

                      {/* Employee (if in global mode) */}
                      {!employeeId && (
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#1e4e8c] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                              {getInitials(
                                `${rec.employee?.firstName} ${rec.employee?.lastName}`
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 group-hover:text-[#205493] transition-colors leading-tight">
                                {rec.employee?.firstName} {rec.employee?.lastName}
                              </p>
                              <span className="text-[11px] text-gray-400">
                                {rec.employee?.employeeNumber} •{' '}
                                {rec.employee?.department?.name || 'Operations'}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Check In */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {rec.checkIn ? (
                          <span className="font-medium text-gray-800">
                            {dayjs(rec.checkIn).format('hh:mm A')}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Check Out */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {rec.checkOut ? (
                          <span className="font-medium text-gray-800">
                            {dayjs(rec.checkOut).format('hh:mm A')}
                          </span>
                        ) : rec.checkIn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            <span>In Progress</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Worked Hours */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">
                          {rec.workedHours !== null && rec.workedHours !== undefined
                            ? `${rec.workedHours} hrs`
                            : '—'}
                        </span>
                      </td>

                      {/* Overtime */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(rec.overtime || 0) > 0 ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                            +{rec.overtime} hrs
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">0 hrs</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Audit / Notes */}
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <div className="flex items-center gap-1.5">
                          {hasAudit && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px] shrink-0"
                              title={`Edited by: ${rec.editedBy || 'HR'}`}
                            >
                              <FileEdit size={11} />
                              <span>Manual</span>
                            </span>
                          )}
                          <span className="text-gray-500 text-[11px] truncate">
                            {rec.reason || rec.notes || (hasAudit ? rec.editNote : '—')}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/attendance/${rec.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold text-[#205493] hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Bar ── */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500">
              Showing page <span className="font-semibold text-gray-800">{meta.page}</span> of{' '}
              <span className="font-semibold text-gray-800">{meta.totalPages}</span> ({meta.total}{' '}
              records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Attendance Modal ── */}
      <CreateAttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedEmployeeId={employeeId}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
