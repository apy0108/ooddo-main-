import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, FileEdit, Info, Check, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getTimeOffType,
  createTimeOffType,
  updateTimeOffType,
  toggleTimeOffType,
} from '../../api/timeOff.api'
import useAuthStore from '../../store/authStore'

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', hex: '#3B82F6' },
  { value: 'red', label: 'Red', hex: '#EF4444' },
  { value: 'green', label: 'Green', hex: '#22C55E' },
  { value: 'orange', label: 'Orange', hex: '#F97316' },
  { value: 'purple', label: 'Purple', hex: '#A855F7' },
  { value: 'yellow', label: 'Yellow', hex: '#EAB308' },
]

export default function TimeOffTypeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(user?.role)

  const isNew = !id || id === 'new'
  const [isEditing, setIsEditing] = useState(isNew)

  const [formData, setFormData] = useState({
    name: '',
    unit: 'DAYS',
    requiresAllocation: true,
    active: true,
    approval: 'MANAGER',
    payrollWorkEntry: 'Leave Work Entry',
    displayColor: 'blue',
    configNotes: '',
  })

  const { data: typeRes, isLoading } = useQuery({
    queryKey: ['time-off-type', id],
    queryFn: () => getTimeOffType(id),
    enabled: !isNew,
  })

  const typeData = typeRes?.data

  useEffect(() => {
    if (typeData) {
      setFormData({
        name: typeData.name || '',
        unit: typeData.unit || 'DAYS',
        requiresAllocation: Boolean(typeData.requiresAllocation),
        active: Boolean(typeData.active),
        approval: typeData.approval || 'MANAGER',
        payrollWorkEntry: typeData.payrollWorkEntry || '',
        displayColor: typeData.displayColor || 'blue',
        configNotes: typeData.configNotes || '',
      })
    }
  }, [typeData])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (data) => (isNew ? createTimeOffType(data) : updateTimeOffType(id, data)),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['time-off-types'])
      queryClient.invalidateQueries(['time-off-type', id])
      toast.success(isNew ? 'Time off type created' : 'Time off type updated')
      if (isNew) {
        navigate(`/time-off/types/${res.data.id}`)
      } else {
        setIsEditing(false)
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save time off type')
    },
  })

  // Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: () => toggleTimeOffType(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['time-off-types'])
      queryClient.invalidateQueries(['time-off-type', id])
      setFormData((prev) => ({ ...prev, active: res.data.active }))
      toast.success(`Time off type is now ${res.data.active ? 'Active' : 'Inactive'}`)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Type name is required')
      return
    }
    saveMutation.mutate(formData)
  }

  const selectedColorHex =
    COLOR_OPTIONS.find((c) => c.value === formData.displayColor)?.hex || '#3B82F6'

  if (!isNew && isLoading) {
    return (
      <div className="py-24 text-center text-xs text-gray-500 font-sans">
        Loading time off type details...
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans pb-16 max-w-4xl">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Link to="/time-off/types" className="text-[#205493] hover:underline flex items-center gap-1">
              <ArrowLeft size={13} />
              <span>Time Off Types</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">
              {isNew ? 'New' : formData.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isNew ? 'New Time Off Type' : `Time Off Type / ${formData.name}`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Form view of one time off type
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {!isNew && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate()}
                  disabled={toggleMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
                  title="Toggle active status"
                >
                  <Power size={13} className={formData.active ? 'text-emerald-600' : 'text-gray-400'} />
                  <span>{formData.active ? 'Deactivate' : 'Activate'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
                >
                  <FileEdit size={14} className="text-[#205493]" />
                  <span>EDIT</span>
                </button>
              </>
            )}

            {isEditing && (
              <>
                {!isNew && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{saveMutation.isPending ? 'Saving...' : 'SAVE'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Form Card ── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Type Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Paid Time Off"
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Unit
              </label>
              <select
                disabled={!isEditing}
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-75"
              >
                <option value="DAYS">Days</option>
                <option value="HOURS">Hours</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-800 font-semibold">
                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={formData.requiresAllocation}
                  onChange={(e) => setFormData({ ...formData, requiresAllocation: e.target.checked })}
                  className="w-4 h-4 rounded text-[#205493] focus:ring-0 cursor-pointer"
                />
                <span>Requires Allocation</span>
              </label>
              <p className="text-[11px] text-gray-500 mt-1 pl-6">
                If checked, employee must have an approved allocation grant before taking leave.
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-800 font-semibold">
                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded text-[#205493] focus:ring-0 cursor-pointer"
                />
                <span>Active</span>
              </label>
              <p className="text-[11px] text-gray-500 mt-1 pl-6">
                Active leave types are visible in employee leave request dropdowns.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Approval Mode
              </label>
              <select
                disabled={!isEditing}
                value={formData.approval}
                onChange={(e) => setFormData({ ...formData, approval: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-75"
              >
                <option value="MANAGER">Manager</option>
                <option value="OFFICER">Officer</option>
                <option value="HR">HR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Payroll / Work Entry
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.payrollWorkEntry}
                onChange={(e) => setFormData({ ...formData, payrollWorkEntry: e.target.value })}
                placeholder="e.g. Leave Work Entry"
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Display Color
              </label>
              <div className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full border border-gray-200 shrink-0 shadow-2xs"
                  style={{ backgroundColor: selectedColorHex }}
                />
                <select
                  disabled={!isEditing}
                  value={formData.displayColor}
                  onChange={(e) => setFormData({ ...formData, displayColor: e.target.value })}
                  className="flex-1 px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-75"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width: Configuration Notes */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Configuration Notes
          </label>
          <textarea
            rows={3}
            disabled={!isEditing}
            value={formData.configNotes}
            onChange={(e) => setFormData({ ...formData, configNotes: e.target.value })}
            placeholder="Describe how this leave type works, rollover policies, eligibility..."
            className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-75 resize-none"
          />
        </div>
      </form>

      {/* ── Footer Note ── */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Info size={14} className="shrink-0" />
        <span>Useful note: Time Off Type drives approval behavior and whether a request needs an allocation.</span>
      </div>
    </div>
  )
}
