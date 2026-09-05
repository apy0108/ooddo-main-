import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Info } from 'lucide-react'
import { getTimeOffTypes } from '../../api/timeOff.api'
import useAuthStore from '../../store/authStore'
import LeaveTypeBadge from '../../components/timeOff/LeaveTypeBadge'

export default function TimeOffTypes() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canManage = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(user?.role)

  const [search, setSearch] = useState('')

  const { data: typesRes, isLoading } = useQuery({
    queryKey: ['time-off-types'],
    queryFn: () => getTimeOffTypes(),
  })

  const types = typesRes?.data || []
  const filteredTypes = types.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const formatApproval = (app) => {
    if (app === 'MANAGER') return 'Manager'
    if (app === 'OFFICER') return 'Officer'
    if (app === 'HR') return 'HR'
    return app || 'Manager'
  }

  return (
    <div className="space-y-6 font-sans pb-16 max-w-6xl">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Time Off Types
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            List view opened from Time Off ▼ → Time Off Types
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => navigate('/time-off/types/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus size={15} />
            <span>NEW</span>
          </button>
        )}
      </div>

      {/* ── Top Bar / Search ── */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search time off types..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] transition"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-gray-500">
            Loading time off types...
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            No time off types found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Unit</th>
                  <th className="py-3 px-5">Allocation</th>
                  <th className="py-3 px-5">Approval</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredTypes.map((type) => (
                  <tr
                    key={type.id}
                    onClick={() => navigate(`/time-off/types/${type.id}`)}
                    className="hover:bg-blue-50/30 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <LeaveTypeBadge color={type.displayColor} name={type.name} />
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap text-gray-600 capitalize">
                      {type.unit === 'HOURS' ? 'Hours' : 'Days'}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                          type.requiresAllocation
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {type.requiresAllocation ? 'Required' : 'No'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap text-gray-700">
                      {formatApproval(type.approval)}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          type.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {type.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer Note ── */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Info size={14} className="shrink-0" />
        <span>Useful note: this list defines policy rules, not employee transactions.</span>
      </div>
    </div>
  )
}
