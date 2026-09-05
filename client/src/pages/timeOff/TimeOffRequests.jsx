import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Info, ArrowLeft, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getRequests, approveRequest, refuseRequest } from '../../api/timeOff.api'
import { employeesApi } from '../../api/employees.api'
import useAuthStore from '../../store/authStore'
import LeaveTypeBadge from '../../components/timeOff/LeaveTypeBadge'
import RefuseModal from '../../components/timeOff/RefuseModal'
import { formatDateShort } from '../../utils/formatters'

const STATUS_BADGES = {
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING: { label: 'To Approve', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  REFUSED: { label: 'Refused', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export default function TimeOffRequests() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const employeeId = searchParams.get('employeeId')
  const isEmployeeOnly = user?.role === 'EMPLOYEE'
  const canApprove = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(user?.role)

  const [tab, setTab] = useState('ALL') // ALL | MY_TEAM
  const [search, setSearch] = useState('')
  const [refuseTargetId, setRefuseTargetId] = useState(null)

  // Fetch employee info if filtered by employeeId
  const { data: empRes } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeesApi.getOne(employeeId),
    enabled: !!employeeId,
  })
  const filterEmployee = empRes?.data

  // Fetch Requests
  const { data: requestsRes, isLoading } = useQuery({
    queryKey: ['requests', { employeeId, tab, search }],
    queryFn: () =>
      getRequests({
        ...(employeeId && { employeeId }),
        ...(tab === 'MY_TEAM' && { myTeam: true }),
        ...(search && { search }),
      }),
  })

  const requests = requestsRes?.data || []

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id) => approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['requests'])
      queryClient.invalidateQueries(['allocations'])
      queryClient.invalidateQueries(['time-off-dashboard'])
      toast.success('Request approved successfully')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Insufficient leave balance for this employee')
    },
  })

  // Refuse Mutation
  const refuseMutation = useMutation({
    mutationFn: ({ id, reason }) => refuseRequest(id, { refuseReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['requests'])
      queryClient.invalidateQueries(['time-off-dashboard'])
      toast.success('Request refused')
      setRefuseTargetId(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to refuse request')
    },
  })

  return (
    <div className="space-y-6 font-sans pb-16 max-w-6xl">
      {/* ── Page Header ── */}
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {employeeId && filterEmployee
              ? `Time Off Requests — ${filterEmployee.firstName} ${filterEmployee.lastName}`
              : isEmployeeOnly
              ? 'My Time Off Requests'
              : 'Time Off Requests'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            List view opened from Time Off ▼ → Requests
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(employeeId ? `/time-off/requests/new?employeeId=${employeeId}` : '/time-off/requests/new')
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus size={15} />
          <span>NEW</span>
        </button>
      </div>

      {/* ── Toolbar & Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs">
        {/* Left: Tab pills for HR */}
        {!isEmployeeOnly ? (
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                tab === 'ALL'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTab('MY_TEAM')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                tab === 'MY_TEAM'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              My Team
            </button>
          </div>
        ) : (
          <div className="text-xs font-semibold text-gray-500">My Leave History</div>
        )}

        {/* Right: Search */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50/80 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] transition"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-gray-500">
            Loading time off requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            No time off requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Start</th>
                  <th className="py-3 px-4">End</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {requests.map((req) => {
                  const badge = STATUS_BADGES[req.status] || STATUS_BADGES.DRAFT
                  const isPending = req.status === 'PENDING'
                  const unitCap = req.type?.unit === 'HOURS' ? 'Hrs' : 'Days'

                  return (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/time-off/requests/${req.id}`)}
                      className="hover:bg-blue-50/30 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-gray-900 group-hover:text-[#205493] transition-colors">
                        {req.employee?.firstName} {req.employee?.lastName}
                        {req.employee?.employeeNumber && (
                          <span className="text-gray-400 font-normal ml-1">
                            ({req.employee.employeeNumber})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <LeaveTypeBadge
                          color={req.type?.displayColor}
                          name={req.type?.name}
                        />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                        {formatDateShort(req.startDate)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                        {formatDateShort(req.endDate)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-gray-900">
                        {req.duration} {unitCap}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canApprove && isPending ? (
                          <div
                            className="inline-flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => approveMutation.mutate(req.id)}
                              disabled={approveMutation.isPending}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded font-semibold text-[11px] transition cursor-pointer flex items-center gap-1"
                              title="Approve request"
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRefuseTargetId(req.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-semibold text-[11px] transition cursor-pointer flex items-center gap-1"
                              title="Refuse request"
                            >
                              <X size={12} />
                              <span>Refuse</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#205493] font-semibold text-xs hover:underline">
                            View
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer Note ── */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Info size={14} className="shrink-0" />
        <span>Useful note: request status should show the approval lifecycle clearly.</span>
      </div>

      {/* Refuse Modal */}
      <RefuseModal
        isOpen={!!refuseTargetId}
        onClose={() => setRefuseTargetId(null)}
        title="Refuse Time Off Request"
        onConfirm={(reason) =>
          refuseMutation.mutateAsync({ id: refuseTargetId, reason })
        }
      />
    </div>
  )
}
