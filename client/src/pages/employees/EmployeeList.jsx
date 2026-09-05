import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { employeesApi } from '../../api/employees.api'
import CreateEmployeeModal from './CreateEmployeeModal'
import { getInitials } from '../../utils/formatters'

// Avatar background colors based on first letter of first name
const getAvatarColor = (firstName = '') => {
  const char = firstName.trim().charAt(0).toUpperCase()
  if (char >= 'A' && char <= 'D') return 'bg-indigo-600 text-white'
  if (char >= 'E' && char <= 'H') return 'bg-purple-600 text-white'
  if (char >= 'I' && char <= 'L') return 'bg-blue-600 text-white'
  if (char >= 'M' && char <= 'P') return 'bg-emerald-600 text-white'
  if (char >= 'Q' && char <= 'T') return 'bg-amber-600 text-white'
  return 'bg-rose-600 text-white'
}

const statusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':
      return { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Active' }
    case 'ON_LEAVE':
      return { dot: 'bg-amber-500', text: 'text-amber-700', label: 'On Leave' }
    case 'TERMINATED':
      return { dot: 'bg-rose-500', text: 'text-rose-700', label: 'Terminated' }
    default:
      return { dot: 'bg-gray-400', text: 'text-gray-600', label: 'Inactive' }
  }
}

export default function EmployeeList() {
  const navigate = useNavigate()

  // Persistent view toggle
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('pp360-emp-view') || 'kanban'
  })

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Debounce search by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(handler)
  }, [search])

  const handleViewChange = (mode) => {
    setViewMode(mode)
    localStorage.setItem('pp360-emp-view', mode)
  }

  // Fetch employees
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['employees', { search: debouncedSearch, page }],
    queryFn: () => employeesApi.getAll({ search: debouncedSearch, page, limit: 20 }),
    keepPreviousData: true,
  })

  const employees = data?.data || []
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Employees
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {viewMode === 'kanban'
              ? 'Default view: Kanban'
              : 'List view for sort, filter and bulk scanning'}
          </p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs">
        {/* Left: NEW button & Search */}
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] active:bg-[#13345d] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>NEW</span>
          </button>

          <div className="relative w-full max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20 transition"
            />
          </div>
        </div>

        {/* Right: View Toggle Buttons [Kanban] [List] */}
        <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-gray-200 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleViewChange('kanban')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Kanban</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ListIcon size={14} />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      {isLoading ? (
        // Skeleton Loaders
        viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded w-1/3 mt-4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg w-full" />
            ))}
          </div>
        )
      ) : employees.length === 0 ? (
        // Empty State
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
            <UsersIcon size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900">No employees found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Try a different search or add a new employee to get started.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#205493] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#184275] transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Employee</span>
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        // ── KANBAN GRID VIEW (Default) ──
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const fullName = `${emp.firstName} ${emp.lastName}`
            const initials = getInitials(fullName) || 'EM'
            const avatarBg = getAvatarColor(emp.firstName)
            const st = statusBadge(emp.status)

            return (
              <div
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}`)}
                className="bg-white border border-gray-200/90 hover:border-[#205493] rounded-xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                {/* Card Top: Avatar + Name + Title */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-full ${avatarBg} flex items-center justify-center font-bold text-sm shrink-0 shadow-xs`}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold text-gray-900 group-hover:text-[#205493] transition-colors truncate">
                      {fullName}
                    </h2>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {emp.jobPosition?.title || 'No Position Assigned'}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {emp.employeeNumber}
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Department & Status Dot */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium text-[11px] truncate max-w-[150px]">
                    {emp.department?.name || 'General'}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className={`text-[11px] font-semibold ${st.text}`}>
                      {st.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // ── LIST VIEW ──
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Job Position</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {employees.map((emp) => {
                  const fullName = `${emp.firstName} ${emp.lastName}`
                  const initials = getInitials(fullName) || 'EM'
                  const avatarBg = getAvatarColor(emp.firstName)
                  const st = statusBadge(emp.status)

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="hover:bg-blue-50/40 transition cursor-pointer"
                    >
                      {/* Employee name + initials */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center font-bold text-xs shrink-0`}
                          >
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block leading-tight">
                              {fullName}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {emp.employeeNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Work Email */}
                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                        {emp.email}
                      </td>

                      {/* Job Position */}
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {emp.jobPosition?.title || '—'}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-gray-600">
                        {emp.department?.name || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : emp.status === 'ON_LEAVE'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          <span>{st.label}</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {meta.total > meta.limit && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 px-1">
          <span>
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} employees
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-medium text-gray-700">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create Employee Modal */}
      <CreateEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
