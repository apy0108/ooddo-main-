import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Edit2,
  Play,
  XCircle,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  Save,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { contractsApi } from '../../api/contracts.api'
import { formatINR, formatDateShort } from '../../utils/formatters'
import Modal from '../../components/ui/Modal'

const STATUS_DISPLAY = {
  DRAFT:     { label: 'Draft',     icon: Clock,          color: 'text-gray-600' },
  ACTIVE:    { label: 'Running',   icon: CheckCircle2,   color: 'text-emerald-600' },
  EXPIRED:   { label: 'Expired',   icon: AlertTriangle,  color: 'text-amber-600' },
  CANCELLED: { label: 'Cancelled', icon: Ban,            color: 'text-red-600' },
}

const STATUS_BADGE = {
  DRAFT:     'bg-gray-100 text-gray-600 border-gray-200',
  ACTIVE:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRED:   'bg-amber-50 text-amber-600 border-amber-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
}

export default function ContractDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showActivateModal, setShowActivateModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ endDate: '', notes: '' })

  // Fetch contract
  const { data: contractRes, isLoading, isError } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.getOne(id),
  })

  const contract = contractRes?.data

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: () => contractsApi.activate(id),
    onSuccess: () => {
      toast.success('Contract is now Running ✅')
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['employee-counts'] })
      setShowActivateModal(false)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to activate contract'
      toast.error(msg)
      setShowActivateModal(false)
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => contractsApi.cancel(id),
    onSuccess: () => {
      toast.success('Contract cancelled')
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      setShowCancelModal(false)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to cancel contract'
      toast.error(msg)
      setShowCancelModal(false)
    },
  })

  // Update mutation (for editing end date / notes)
  const updateMutation = useMutation({
    mutationFn: (data) => contractsApi.update(id, data),
    onSuccess: () => {
      toast.success('Contract updated successfully')
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      setIsEditing(false)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to update contract'
      toast.error(msg)
    },
  })

  const startEditing = () => {
    if (contract.status === 'ACTIVE') {
      // Only endDate and notes for running contracts
      setEditData({
        endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
        notes: contract.notes || '',
      })
    } else if (contract.status === 'DRAFT') {
      setEditData({
        endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
        notes: contract.notes || '',
      })
    }
    setIsEditing(true)
  }

  const handleSave = () => {
    updateMutation.mutate({
      endDate: editData.endDate || null,
      notes: editData.notes || null,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <Loader2 size={32} className="animate-spin text-[#205493] mb-3" />
        <p className="text-xs font-semibold">Loading contract...</p>
      </div>
    )
  }

  if (isError || !contract) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto my-12">
        <h3 className="text-base font-bold text-gray-900 mb-1">Contract Not Found</h3>
        <p className="text-xs text-gray-500 mb-5">
          The requested contract does not exist or has been removed.
        </p>
        <Link
          to="/contracts"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#184275] transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Contracts</span>
        </Link>
      </div>
    )
  }

  const st = STATUS_DISPLAY[contract.status] || STATUS_DISPLAY.DRAFT
  const badgeCls = STATUS_BADGE[contract.status] || STATUS_BADGE.DRAFT
  const empName = contract.employee
    ? `${contract.employee.firstName} ${contract.employee.lastName}`
    : '—'
  const isDraft = contract.status === 'DRAFT'
  const isRunning = contract.status === 'ACTIVE'
  const isReadOnly = contract.status === 'EXPIRED' || contract.status === 'CANCELLED'

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link
              to="/contracts"
              className="text-[#205493] hover:underline font-semibold flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Contracts</span>
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold font-mono">
              {contract.contractRef}
            </span>
          </div>
          <p className="text-xs text-gray-500">Form view of one contract</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isDraft && (
            <>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:border-[#205493] hover:text-[#205493] text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    <X size={13} />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-60"
                  >
                    {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowActivateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
              >
                <Play size={13} />
                <span>Set to Running</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <XCircle size={13} />
                <span>Cancel Contract</span>
              </button>
            </>
          )}

          {isRunning && (
            <>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:border-[#205493] hover:text-[#205493] text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>Edit End Date</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    <X size={13} />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-60"
                  >
                    {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>Save</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <XCircle size={13} />
                <span>Cancel Contract</span>
              </button>
            </>
          )}

          {isReadOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg">
              Read Only
            </span>
          )}
        </div>
      </div>

      {/* ── Status Banner ── */}
      {isDraft && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>Draft</strong> — This contract is in Draft. Click "Set to Running" to activate.
          </p>
        </div>
      )}
      {isRunning && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-700">
            <strong>Running</strong> — This is the active contract used for payroll.
          </p>
        </div>
      )}
      {contract.status === 'EXPIRED' && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
          <Clock size={16} className="text-gray-400 shrink-0" />
          <p className="text-xs text-gray-600">
            Contract expired on {formatDateShort(contract.endDate)}. A new contract is needed.
          </p>
        </div>
      )}
      {contract.status === 'CANCELLED' && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <Ban size={16} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-600">
            This contract was cancelled.
          </p>
        </div>
      )}

      {/* ── Contract Fields ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Employee</label>
              <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                <Link
                  to={`/employees/${contract.employee?.id}`}
                  className="text-[#205493] hover:underline"
                >
                  {empName}
                </Link>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
              <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                {formatDateShort(contract.startDate)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editData.endDate}
                  onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                />
              ) : (
                <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                  {contract.endDate ? formatDateShort(contract.endDate) : 'Open-ended'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
              <div className="px-3 py-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeCls}`}>
                  {st.label}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Department</label>
              <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                {contract.department?.name || '—'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Job Position</label>
              <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                {contract.jobPosition?.title || '—'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Wage / Month</label>
              <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg text-[#205493] font-bold">
                {formatINR(contract.wage)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Working Schedule</label>
              <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                {contract.workingSchedule?.name || '—'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Salary Structure</label>
              <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg font-medium">
                {contract.salaryStructure ? (
                  <span className="text-gray-800">
                    {contract.salaryStructure.name} ({contract.salaryStructure.code})
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Not assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Salary Structure / Notes ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Salary Structure / Notes</h3>
        {contract.salaryStructure && (
          <p className="text-xs text-gray-700 mb-2">
            <span className="font-medium">Structure:</span>{' '}
            {contract.salaryStructure.name} ({contract.salaryStructure.code})
          </p>
        )}
        {isEditing ? (
          <textarea
            rows={4}
            value={editData.notes}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            placeholder="Add notes about this contract or salary structure..."
            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] resize-none"
          />
        ) : (
          <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg min-h-[80px]">
            {contract.notes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
            ) : (
              <p className="text-gray-400 italic">No notes added</p>
            )}
          </div>
        )}
      </div>

      {/* ── Activate Confirmation Modal ── */}
      <Modal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        title="Activate Contract?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            This will set contract <strong className="font-mono">{contract.contractRef}</strong> as Running.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Wage:</span> {formatINR(contract.wage)}/month
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Period:</span> {formatDateShort(contract.startDate)} onwards
            </p>
          </div>
          <p className="text-xs text-gray-500">
            The system will check for conflicting active contracts.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowActivateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {activateMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              <span>Yes, Set to Running</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Cancel Confirmation Modal ── */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Contract?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Are you sure you want to cancel contract{' '}
            <strong className="font-mono">{contract.contractRef}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition cursor-pointer"
            >
              Keep Contract
            </button>
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {cancelMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <XCircle size={13} />
              )}
              <span>Yes, Cancel Contract</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
