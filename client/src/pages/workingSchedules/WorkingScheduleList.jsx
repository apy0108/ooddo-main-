import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Filter,
  Clock,
  Columns3,
} from 'lucide-react'
import { workingSchedulesApi } from '../../api/workingSchedules.api'

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export default function WorkingScheduleList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(handler)
  }, [search])

  const { data: schedulesRes, isLoading } = useQuery({
    queryKey: ['working-schedules', { search: debouncedSearch, isActive: statusFilter }],
    queryFn: () =>
      workingSchedulesApi.getAll({
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { isActive: statusFilter }),
      }),
  })

  const schedules = schedulesRes?.data || []

  const getUniqueDays = (lines = []) => {
    const unique = new Set(lines.map((l) => l.dayOfWeek))
    return unique.size
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Working Schedules
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Define weekly working patterns for employees and contracts
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/working-schedules/new')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>New Schedule</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schedules..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer text-gray-600"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:border-gray-300 transition cursor-pointer"
          >
            <Columns3 size={14} />
            <span>Columns</span>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg w-full" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
            <Clock size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900">No working schedules found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Create your first working schedule to define weekly patterns.
          </p>
          <button
            type="button"
            onClick={() => navigate('/working-schedules/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#205493] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#184275] transition cursor-pointer"
          >
            <Plus size={14} />
            <span>New Schedule</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Schedule Name</th>
                  <th className="py-3 px-4">Days/Week</th>
                  <th className="py-3 px-4">Hours/Week</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {schedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    onClick={() => navigate(`/working-schedules/${schedule.id}`)}
                    className="hover:bg-blue-50/40 transition cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{schedule.name}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {getUniqueDays(schedule.lines)} days
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {schedule.weeklyHours}h
                    </td>
                    <td className="py-3 px-4 text-gray-400">PeoplePay360</td>
                    <td className="py-3 px-4 text-center">
                      {schedule.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
