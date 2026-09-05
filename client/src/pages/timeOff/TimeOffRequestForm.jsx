import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, CheckCircle2, XCircle, Info, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import {
  getRequest,
  createRequest,
  approveRequest,
  refuseRequest,
  getTimeOffTypes,
  getBalance,
} from '../../api/timeOff.api'
import { employeesApi } from '../../api/employees.api'
import useAuthStore from '../../store/authStore'
import BalanceBanner from '../../components/timeOff/BalanceBanner'
import RefuseModal from '../../components/timeOff/RefuseModal'

const STATUS_BADGES = {
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING: { label: 'To Approve', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  REFUSED: { label: 'Refused', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export default function TimeOffRequestForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const preselectedEmpId = searchParams.get('employeeId')
  const isNew = !id || id === 'new'
  const isEmployeeOnly = user?.role === 'EMPLOYEE'
  const canApprove = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(user?.role)

  const [isRefuseOpen, setIsRefuseOpen] = useState(false)

  const [formData, setFormData] = useState({
    employeeId: preselectedEmpId || user?.employee?.id || '',
    typeId: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    hoursInput: 8,
    reason: '',
  })

  // Fetch active employees (for HR)
  const { data: employeesRes } = useQuery({
    queryKey: ['activeEmployeesForRequests'],
    queryFn: () => employeesApi.getAll({ limit: 100, status: 'ACTIVE' }),
    enabled: isNew && !isEmployeeOnly,
  })
  const employees = employeesRes?.employees || employeesRes?.data || []

  // Fetch active time off types
  const { data: typesRes } = useQuery({
    queryKey: ['time-off-types'],
    queryFn: () => getTimeOffTypes(),
  })
  const types = typesRes?.data || []

  // Fetch request detail if view mode
  const { data: reqRes, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => getRequest(id),
    enabled: !isNew,
  })
  const reqData = reqRes?.data

  useEffect(() => {
    if (reqData) {
      setFormData({
        employeeId: reqData.employeeId || '',
        typeId: reqData.typeId || '',
        startDate: dayjs(reqData.startDate).format('YYYY-MM-DD'),
        endDate: dayjs(reqData.endDate).format('YYYY-MM-DD'),
        hoursInput: reqData.duration || 8,
        reason: reqData.reason || '',
      })
    } else if (isNew) {
      if (!formData.employeeId) {
        if (isEmployeeOnly && user?.employee?.id) {
          setFormData((prev) => ({ ...prev, employeeId: user.employee.id }))
        } else if (preselectedEmpId) {
          setFormData((prev) => ({ ...prev, employeeId: preselectedEmpId }))
        } else if (employees.length > 0) {
          setFormData((prev) => ({ ...prev, employeeId: employees[0].id }))
        }
      }
      if (!formData.typeId && types.length > 0) {
        setFormData((prev) => ({ ...prev, typeId: types[0].id }))
      }
    }
  }, [reqData, employees, types, isNew, isEmployeeOnly, user, preselectedEmpId])

  const selectedType = types.find((t) => t.id === formData.typeId) || reqData?.type
  const unit = selectedType?.unit || 'DAYS'
  const isHours = unit === 'HOURS'
  const requiresAllocation = selectedType?.requiresAllocation ?? true

  // Auto-calculated duration
  const calculatedDuration = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0
    if (isHours) return Number(formData.hoursInput) || 8
    const start = dayjs(formData.startDate)
    const end = dayjs(formData.endDate)
    const diffDays = end.diff(start, 'day') + 1
    return diffDays > 0 ? diffDays : 0
  }, [formData.startDate, formData.endDate, isHours, formData.hoursInput])

  // Fetch balance for selected employee + type
  const { data: balanceRes } = useQuery({
    queryKey: ['balance', formData.employeeId, formData.typeId],
    queryFn: () => getBalance(formData.employeeId, formData.typeId),
    enabled: !!formData.employeeId && !!formData.typeId && requiresAllocation,
  })
  const balance = balanceRes?.data

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (payload) => createRequest(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['requests'])
      queryClient.invalidateQueries(['time-off-dashboard'])
      toast.success('Time off request submitted!')
      navigate(`/time-off/requests/${res.data.id}`)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to submit request')
    },
  })

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: () => approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['request', id])
      queryClient.invalidateQueries(['requests'])
      queryClient.invalidateQueries(['allocations'])
      queryClient.invalidateQueries(['time-off-dashboard'])
      toast.success('Request approved successfully!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Insufficient leave balance for this employee')
    },
  })

  // Refuse Mutation
  const refuseMutation = useMutation({
    mutationFn: (reason) => refuseRequest(id, { refuseReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['request', id])
      queryClient.invalidateQueries(['requests'])
      queryClient.invalidateQueries(['time-off-dashboard'])
      toast.success('Request refused')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to refuse request')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.employeeId) {
      toast.error('Please select an employee')
      return
    }
    if (!formData.typeId) {
      toast.error('Please select a leave type')
      return
    }
    if (dayjs(formData.endDate).isBefore(dayjs(formData.startDate))) {
      toast.error('End date cannot be earlier than start date')
      return
    }

    saveMutation.mutate({
      employeeId: formData.employeeId,
      typeId: formData.typeId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      duration: calculatedDuration,
      reason: formData.reason,
    })
  }

  const badge = STATUS_BADGES[reqData?.status || 'PENDING']
  const employeeName = reqData
    ? `${reqData.employee?.firstName} ${reqData.employee?.lastName}`
    : ''

  if (!isNew && isLoading) {
    return (
      <div className="py-24 text-center text-xs text-gray-500 font-sans">
        Loading time off request...
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans pb-16 max-w-4xl">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Link to="/time-off/requests" className="text-[#205493] hover:underline flex items-center gap-1">
              <ArrowLeft size={13} />
              <span>Time Off Requests</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">
              {isNew ? 'New' : employeeName}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isNew ? 'New Time Off Request' : `Time Off Request / ${employeeName}`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Form view of one request
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          {!isNew && canApprove && reqData?.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={() => setIsRefuseOpen(true)}
                disabled={refuseMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
              >
                <XCircle size={14} />
                <span>Refuse</span>
              </button>
              <button
                type="button"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>{approveMutation.isPending ? 'Approving...' : 'Approve'}</span>
              </button>
            </>
          )}

          {isNew && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saveMutation.isPending ? 'Submitting...' : 'SUBMIT REQUEST'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Balance Warning Banner ── */}
      {selectedType && selectedType.requiresAllocation && formData.employeeId && balance && (
        <BalanceBanner
          allocated={balance?.allocated}
          taken={balance?.taken}
          remaining={balance?.remaining}
          unit={unit}
        />
      )}

      {/* ── Form Card ── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              {isNew ? (
                isEmployeeOnly ? (
                  <input
                    type="text"
                    disabled
                    value={`${user?.employee?.firstName || ''} ${user?.employee?.lastName || ''}`}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 font-semibold opacity-85"
                  />
                ) : (
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493]"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.employeeNumber})
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <input
                  type="text"
                  disabled
                  value={`${reqData?.employee?.firstName} ${reqData?.employee?.lastName} (${reqData?.employee?.employeeNumber || ''})`}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 font-semibold opacity-85"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Time Off Type <span className="text-red-500">*</span>
              </label>
              {isNew ? (
                <select
                  value={formData.typeId}
                  onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493]"
                >
                  <option value="">-- Select Leave Type --</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unit === 'HOURS' ? 'Hours' : 'Days'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={`${reqData?.type?.name || ''} (${reqData?.type?.unit || ''})`}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 opacity-85 font-medium"
                />
              )}
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  disabled={!isNew}
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  disabled={!isNew}
                  min={formData.startDate}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85"
                />
              </div>
            </div>

            {/* If Hours type: duration input */}
            {isHours && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Duration in Hours <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  disabled={!isNew}
                  value={formData.hoursInput}
                  onChange={(e) => setFormData({ ...formData, hoursInput: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85"
                />
              </div>
            )}

            {/* Computed Duration pill */}
            <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 font-semibold flex items-center justify-between">
              <span>Calculated Duration:</span>
              <span className="text-sm font-bold text-[#205493]">
                {isNew ? calculatedDuration : reqData?.duration}{' '}
                {isHours ? 'Hours' : 'Days'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason / Note (Optional)
              </label>
              <textarea
                rows={3}
                disabled={!isNew}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Reason for requesting time off..."
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85 resize-none"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Status
              </label>
              <div>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Approver
              </label>
              <input
                type="text"
                disabled
                value={
                  reqData?.approver?.employee
                    ? `${reqData.approver.employee.firstName} ${reqData.approver.employee.lastName}`
                    : reqData?.approver?.email || 'Pending Manager/HR Review'
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 opacity-85 font-medium"
              />
            </div>

            {/* Allocation Used field (if requiresAllocation) */}
            {requiresAllocation && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Allocation Used
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    reqData?.allocation?.validity
                      ? `${selectedType?.name || 'Leave'} — ${reqData.allocation.validity}`
                      : balance?.validity
                      ? `${selectedType?.name || 'Leave'} — ${balance.validity}`
                      : 'Active Policy Grant'
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 opacity-85 font-medium"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  {balance ? `${balance.remaining} ${unit.toLowerCase()} remaining` : ''}
                </p>
              </div>
            )}

            {reqData?.refuseReason && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                <span className="font-bold text-rose-800 block mb-0.5">Refusal Reason:</span>
                <p className="text-rose-700">{reqData.refuseReason}</p>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* ── Footer Note ── */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Info size={14} className="shrink-0" />
        <span>Useful note: if the selected type requires allocation, the request should clearly show which balance was consumed.</span>
      </div>

      {/* Refuse Modal */}
      <RefuseModal
        isOpen={isRefuseOpen}
        onClose={() => setIsRefuseOpen(false)}
        title="Refuse Time Off Request"
        onConfirm={(reason) => refuseMutation.mutateAsync(reason)}
      />
    </div>
  )
}
