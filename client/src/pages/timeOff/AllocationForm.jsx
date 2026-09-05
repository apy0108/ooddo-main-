import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, CheckCircle2, XCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAllocation,
  createAllocation,
  approveAllocation,
  refuseAllocation,
  getTimeOffTypes,
} from '../../api/timeOff.api'
import { employeesApi } from '../../api/employees.api'
import useAuthStore from '../../store/authStore'
import RefuseModal from '../../components/timeOff/RefuseModal'

const STATUS_BADGES = {
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  REFUSED: { label: 'Refused', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export default function AllocationForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(user?.role)

  const isNew = !id || id === 'new'
  const [isRefuseOpen, setIsRefuseOpen] = useState(false)

  const [formData, setFormData] = useState({
    employeeId: '',
    typeId: '',
    allocated: 21,
    validity: '2026 Annual Balance',
    description: '',
  })

  // Fetch active employees
  const { data: employeesRes } = useQuery({
    queryKey: ['activeEmployeesForAllocations'],
    queryFn: () => employeesApi.getAll({ limit: 100, status: 'ACTIVE' }),
    enabled: isNew,
  })
  const employees = employeesRes?.employees || employeesRes?.data || []

  // Fetch active time off types
  const { data: typesRes } = useQuery({
    queryKey: ['time-off-types'],
    queryFn: () => getTimeOffTypes(),
  })
  const types = typesRes?.data || []

  // Fetch allocation detail if not new
  const { data: allocRes, isLoading } = useQuery({
    queryKey: ['allocation', id],
    queryFn: () => getAllocation(id),
    enabled: !isNew,
  })
  const alloc = allocRes?.data

  useEffect(() => {
    if (alloc) {
      setFormData({
        employeeId: alloc.employeeId || '',
        typeId: alloc.typeId || '',
        allocated: alloc.allocated || 0,
        validity: alloc.validity || '',
        description: alloc.description || '',
      })
    } else if (isNew && employees.length > 0 && types.length > 0) {
      if (!formData.employeeId) setFormData((prev) => ({ ...prev, employeeId: employees[0].id }))
      if (!formData.typeId) setFormData((prev) => ({ ...prev, typeId: types[0].id }))
    }
  }, [alloc, employees, types, isNew])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (data) => createAllocation(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['allocations'])
      toast.success('Allocation created successfully')
      navigate(`/time-off/allocations/${res.data.id}`)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create allocation')
    },
  })

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: () => approveAllocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['allocation', id])
      queryClient.invalidateQueries(['allocations'])
      queryClient.invalidateQueries(['time-off-dashboard'])
      toast.success('Allocation approved!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to approve allocation')
    },
  })

  // Refuse Mutation
  const refuseMutation = useMutation({
    mutationFn: (reason) => refuseAllocation(id, { refuseReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allocation', id])
      queryClient.invalidateQueries(['allocations'])
      queryClient.invalidateQueries(['time-off-dashboard'])
      toast.success('Allocation refused')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to refuse allocation')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.employeeId) {
      toast.error('Please select an employee')
      return
    }
    if (!formData.typeId) {
      toast.error('Please select a time off type')
      return
    }
    if (!formData.allocated || Number(formData.allocated) <= 0) {
      toast.error('Allocated amount must be greater than 0')
      return
    }
    saveMutation.mutate(formData)
  }

  const selectedType = types.find((t) => t.id === formData.typeId) || alloc?.type
  const unitLabel = selectedType?.unit === 'HOURS' ? 'Hours' : 'Days'
  const badge = STATUS_BADGES[alloc?.status || 'DRAFT']
  const employeeName = alloc
    ? `${alloc.employee?.firstName} ${alloc.employee?.lastName}`
    : ''

  const remaining = alloc ? Math.max(0, alloc.allocated - alloc.taken) : formData.allocated

  if (!isNew && isLoading) {
    return (
      <div className="py-24 text-center text-xs text-gray-500 font-sans">
        Loading allocation details...
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans pb-16 max-w-4xl">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Link to="/time-off/allocations" className="text-[#205493] hover:underline flex items-center gap-1">
              <ArrowLeft size={13} />
              <span>Allocations</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">
              {isNew ? 'New' : employeeName}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isNew ? 'New Allocation' : `Allocation / ${employeeName}`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Form view of one allocation record
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isNew && canManage && alloc?.status === 'DRAFT' && (
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
              <span>{saveMutation.isPending ? 'Saving...' : 'SAVE'}</span>
            </button>
          )}
        </div>
      </div>

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
              ) : (
                <input
                  type="text"
                  disabled
                  value={`${alloc?.employee?.firstName} ${alloc?.employee?.lastName} (${alloc?.employee?.employeeNumber || ''})`}
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
                  <option value="">-- Select Type --</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.unit})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value={`${alloc?.type?.name || ''} (${alloc?.type?.unit || ''})`}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 opacity-85 font-medium"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Allocated ({unitLabel}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                disabled={!isNew}
                value={formData.allocated}
                onChange={(e) => setFormData({ ...formData, allocated: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85"
              />
            </div>

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
                Validity
              </label>
              <input
                type="text"
                disabled={!isNew}
                value={formData.validity}
                onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                placeholder="e.g. 2026 Annual Balance"
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Taken ({unitLabel})
              </label>
              <input
                type="text"
                disabled
                value={isNew ? '0' : `${alloc?.taken || 0}`}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 opacity-85 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Remaining ({unitLabel})
              </label>
              <input
                type="text"
                disabled
                value={`${remaining}`}
                className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold opacity-90 ${
                  remaining > 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Approver
              </label>
              <input
                type="text"
                disabled
                value={
                  alloc?.approver?.employee
                    ? `${alloc.approver.employee.firstName} ${alloc.approver.employee.lastName}`
                    : alloc?.approver?.email || '—'
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 opacity-85"
              />
            </div>
          </div>
        </div>

        {/* Full-width: Description */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Description / Reason
          </label>
          <textarea
            rows={3}
            disabled={!isNew}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Annual leave balance granted at start of policy year..."
            className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85 resize-none"
          />
        </div>
      </form>

      {/* ── Footer Note ── */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Info size={14} className="shrink-0" />
        <span>Useful note: approved allocation is what creates available leave balance for the employee.</span>
      </div>

      {/* Refuse Modal */}
      <RefuseModal
        isOpen={isRefuseOpen}
        onClose={() => setIsRefuseOpen(false)}
        title="Refuse Allocation"
        onConfirm={(reason) => refuseMutation.mutateAsync(reason)}
      />
    </div>
  )
}
