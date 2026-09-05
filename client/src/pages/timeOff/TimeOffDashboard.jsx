import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, Calendar, CheckCircle2, AlertCircle, Plus, Users, ArrowRight } from 'lucide-react'
import { getTimeOffDashboard } from '../../api/timeOff.api'
import useAuthStore from '../../store/authStore'
import LeaveTypeBadge from '../../components/timeOff/LeaveTypeBadge'

export default function TimeOffDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isEmployee = user?.role === 'EMPLOYEE'

  const { data: dashRes, isLoading } = useQuery({
    queryKey: ['time-off-dashboard'],
    queryFn: getTimeOffDashboard,
  })

  const stats = dashRes?.data || {
    pendingRequests: 0,
    pendingAllocations: 0,
    approvedToday: 0,
    myBalance: [],
    teamBalances: [],
  }

  return (
    <div className="space-y-6 font-sans pb-16 max-w-6xl">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Time Off Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Overview of leave balances, requests in review, and department approvals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/time-off/requests/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus size={15} />
            <span>SUBMIT TIME OFF</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <div
          onClick={() => navigate('/time-off/requests')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs hover:border-amber-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pending Requests
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
              <Clock size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingRequests}</p>
          <span className="text-[11px] text-amber-600 font-medium mt-1 inline-block">
            To be reviewed
          </span>
        </div>

        {/* Pending Allocations */}
        <div
          onClick={() => navigate('/time-off/allocations')}
          className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pending Allocations
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition">
              <Calendar size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingAllocations}</p>
          <span className="text-[11px] text-blue-600 font-medium mt-1 inline-block">
            Draft allocation grants
          </span>
        </div>

        {/* Approved Today */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Approved Today
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{stats.approvedToday}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">
            Requests approved
          </span>
        </div>

        {/* My Leave Balance Count */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              My Active Types
            </span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Users size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-[#205493] mt-2">{stats.myBalance.length}</p>
          <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">
            Leave plans active
          </span>
        </div>
      </div>

      {/* ── My Balance Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">My Leave Balance</h3>
            <p className="text-[11px] text-gray-500">
              Approved leave entitlements available for consumption
            </p>
          </div>
          <Link
            to="/time-off/requests/new"
            className="text-xs font-semibold text-[#205493] hover:underline flex items-center gap-1"
          >
            <span>Request Leave</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {stats.myBalance.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            No approved leave allocations found for your profile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Allocated</th>
                  <th className="py-3 px-5">Taken</th>
                  <th className="py-3 px-5">Remaining</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {stats.myBalance.map((item, idx) => {
                  const unitLabel = item.unit === 'HOURS' ? 'hrs' : 'days'
                  return (
                    <tr key={idx} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <LeaveTypeBadge color={item.displayColor} name={item.typeName} />
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap font-medium text-gray-800">
                        {item.allocated} {unitLabel}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap text-gray-600">
                        {item.taken} {unitLabel}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            item.remaining > 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {item.remaining} {unitLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span>Approved</span>
                          <span>✅</span>
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

      {/* ── Team Balance Overview (for HR users only) ── */}
      {!isEmployee && stats.teamBalances?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Team Allocations & Balances</h3>
              <p className="text-[11px] text-gray-500">
                Approved entitlements across all active organization staff
              </p>
            </div>
            <Link
              to="/time-off/allocations"
              className="text-xs font-semibold text-[#205493] hover:underline flex items-center gap-1"
            >
              <span>Manage Allocations</span>
              <ArrowRight size={13} />
            </Link>
          </div>

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
                {stats.teamBalances.slice(0, 8).map((tb) => {
                  const unitLabel = tb.unit === 'HOURS' ? 'hrs' : 'days'
                  return (
                    <tr
                      key={tb.id}
                      onClick={() => navigate(`/time-off/allocations/${tb.id}`)}
                      className="hover:bg-blue-50/30 transition cursor-pointer"
                    >
                      <td className="py-3 px-5 whitespace-nowrap font-semibold text-gray-900">
                        {tb.employeeName}{' '}
                        <span className="text-gray-400 font-normal">({tb.employeeNumber})</span>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <LeaveTypeBadge color={tb.displayColor} name={tb.typeName} />
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-gray-700">
                        {tb.allocated} {unitLabel}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-gray-600">
                        {tb.taken} {unitLabel}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            tb.remaining > 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {tb.remaining} {unitLabel}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span>Approved</span>
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
    </div>
  )
}
