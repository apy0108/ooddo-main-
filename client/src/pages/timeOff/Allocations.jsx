import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Info, ArrowRight } from 'lucide-react'
import { getAllocations } from '../../api/timeOff.api'
import useAuthStore from '../../store/authStore'
import LeaveTypeBadge from '../../components/timeOff/LeaveTypeBadge'

const STATUS_BADGES = {
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  REFUSED: { label: 'Refused', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export default function Allocations() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canCreate = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(user?.role)

  const [search, setSearch] = useState('')

  const { data: allocsRes, isLoading } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => getAllocations(),
  })

  const allocations = allocsRes?.data || []
  const filtered = allocations.filter((a) => {
    const term = search.toLowerCase()
    const empName = `${a.employee?.firstName} ${a.employee?.lastName}`.toLowerCase()
    const typeName = a.type?.name?.toLowerCase() || ''
    return empName.includes(term) || typeName.includes(term)
  })

  return (
    <div className="space-y-6 font-sans pb-16 max-w-6xl">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Allocations
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            List view opened from Time Off ▼ → Allocations
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/time-off/allocations/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus size={15} />
            <span>NEW</span>
          </button>
        )}
      </div>

      {/* ── Search Toolbar ── */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search allocations..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] transition"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-gray-500">
            Loading allocations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            No allocations found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
                  <th className="py-3 px-5">Employee</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Allocated</th>
                  <th className="py-3 px-5">Taken</th>
                  <th className="py-3 px-5">Remaining</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.map((alloc) => {
                  const unitLabel = alloc.type?.unit === 'HOURS' ? 'hrs' : 'days'
                  const remaining = Math.max(0, alloc.allocated - alloc.taken)
                  const badge = STATUS_BADGES[alloc.status] || STATUS_BADGES.DRAFT

                  return (
                    <tr
                      key={alloc.id}
                      onClick={() => navigate(`/time-off/allocations/${alloc.id}`)}
                      className="hover:bg-blue-50/30 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap font-semibold text-gray-900 group-hover:text-[#205493] transition-colors">
                        {alloc.employee?.firstName} {alloc.employee?.lastName}
                        {alloc.employee?.employeeNumber && (
                          <span className="text-gray-400 font-normal ml-1">
                            ({alloc.employee.employeeNumber})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <LeaveTypeBadge
                          color={alloc.type?.displayColor}
                          name={alloc.type?.name}
                        />
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap text-gray-800 font-medium">
                        {alloc.allocated} {unitLabel}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap text-gray-600">
                        {alloc.taken} {unitLabel}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            remaining === 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {remaining} {unitLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer Notes ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Info size={14} className="shrink-0" />
          <span>Useful note: the list should expose the balance math at a glance — Allocated, Taken and Remaining.</span>
        </div>
        <span className="text-[#205493] font-medium inline-flex items-center gap-1">
          <span>Open selected allocation</span>
          <ArrowRight size={13} />
        </span>
      </div>
    </div>
  )
}
