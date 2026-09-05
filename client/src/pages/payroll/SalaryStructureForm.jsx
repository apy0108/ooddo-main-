import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  Calculator,
  Layers,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStructure,
  createStructure,
  updateStructure,
  createRule,
  updateRule,
  deleteRule,
  previewStructure,
} from '../../api/salaryStructure.api'
import { employeesApi } from '../../api/employees.api'
import useAuthStore from '../../store/authStore'
import Modal from '../../components/ui/Modal'
import { formatINR } from '../../utils/formatters'

const CATEGORY_BADGES = {
  BASIC: 'bg-blue-50 text-blue-700 border-blue-200',
  ALLOWANCE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  GROSS: 'bg-purple-50 text-purple-700 border-purple-200',
  DEDUCTION: 'bg-red-50 text-red-700 border-red-200',
  NET: 'bg-amber-50 text-amber-700 border-amber-200',
}

const AMOUNT_TYPE_LABELS = {
  CONTRACT_WAGE: 'Contract Wage',
  FIXED: 'Fixed',
  PERCENTAGE: 'Percentage',
  COMPUTED: 'Computed',
}

export default function SalaryStructureForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const isNew = !id || id === 'new'
  const userRole = user?.role || 'EMPLOYEE'
  const canManage = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(userRole)

  const [isEditing, setIsEditing] = useState(isNew)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    active: true,
  })

  // Rule Modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    code: '',
    category: 'ALLOWANCE',
    amountType: 'FIXED',
    amount: '',
    percentage: '',
    percentageBase: 'BASIC',
    sequence: 10,
  })

  // Preview state
  const [previewEmpId, setPreviewEmpId] = useState('')
  const [previewResult, setPreviewResult] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Fetch Structure
  const { data: structureRes, isLoading } = useQuery({
    queryKey: ['salary-structure', id],
    queryFn: () => getStructure(id),
    enabled: !isNew,
  })
  const structure = structureRes?.data?.data || structureRes?.data

  // Fetch Employees for Preview
  const { data: employeesRes } = useQuery({
    queryKey: ['active-employees-for-preview'],
    queryFn: () => employeesApi.getAll({ limit: 100, status: 'ACTIVE' }),
  })
  const employees = employeesRes?.employees || employeesRes?.data || []

  useEffect(() => {
    if (structure && !isNew) {
      setFormData({
        name: structure.name || '',
        code: structure.code || '',
        description: structure.description || '',
        active: structure.active !== undefined ? structure.active : true,
      })
    }
  }, [structure, isNew])

  // Create Structure Mutation
  const createMutation = useMutation({
    mutationFn: (data) => createStructure(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
      toast.success('Salary Structure created successfully')
      const createdId = res?.data?.data?.id || res?.data?.id
      if (createdId) navigate(`/payroll/structures/${createdId}`, { replace: true })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create structure')
    },
  })

  // Update Structure Mutation
  const updateMutation = useMutation({
    mutationFn: (data) => updateStructure(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structure', id] })
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
      toast.success('Salary Structure updated')
      setIsEditing(false)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update structure')
    },
  })

  // Add / Edit Rule Mutation
  const ruleMutation = useMutation({
    mutationFn: (payload) => {
      if (editingRule?.id) {
        return updateRule(editingRule.id, payload)
      }
      return createRule({ ...payload, structureId: id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structure', id] })
      queryClient.invalidateQueries({ queryKey: ['salary-rules'] })
      toast.success(editingRule?.id ? 'Rule updated' : 'Rule added to structure')
      setRuleModalOpen(false)
      setEditingRule(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save rule')
    },
  })

  // Delete Rule Mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId) => deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structure', id] })
      queryClient.invalidateQueries({ queryKey: ['salary-rules'] })
      toast.success('Rule removed')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete rule')
    },
  })

  // Handle Save Structure
  const handleSaveStructure = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return toast.error('Structure name is required')
    if (!formData.code.trim()) return toast.error('Structure code is required')

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
      active: formData.active,
    }

    if (isNew) {
      createMutation.mutate(payload)
    } else {
      updateMutation.mutate(payload)
    }
  }

  // Open Add Rule Modal
  const handleOpenAddRule = () => {
    const rules = structure?.rules || []
    const maxSeq = rules.length > 0 ? Math.max(...rules.map((r) => r.sequence)) : 0
    setEditingRule(null)
    setRuleForm({
      name: '',
      code: '',
      category: 'ALLOWANCE',
      amountType: 'FIXED',
      amount: '',
      percentage: '',
      percentageBase: 'BASIC',
      sequence: maxSeq + 1,
    })
    setRuleModalOpen(true)
  }

  // Open Edit Rule Modal
  const handleOpenEditRule = (rule) => {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      code: rule.code,
      category: rule.category,
      amountType: rule.amountType,
      amount: rule.amount !== null ? rule.amount : '',
      percentage: rule.percentage !== null ? rule.percentage : '',
      percentageBase: rule.percentageBase || 'BASIC',
      sequence: rule.sequence,
    })
    setRuleModalOpen(true)
  }

  // Handle Save Rule Submit
  const handleSaveRule = (e) => {
    e.preventDefault()
    if (!ruleForm.name.trim()) return toast.error('Rule name is required')
    if (!ruleForm.code.trim()) return toast.error('Rule code is required')
    if (ruleForm.sequence === undefined || isNaN(ruleForm.sequence)) {
      return toast.error('Valid sequence number is required')
    }

    const payload = {
      name: ruleForm.name.trim(),
      code: ruleForm.code.trim().toUpperCase(),
      category: ruleForm.category,
      amountType: ruleForm.amountType,
      sequence: Number(ruleForm.sequence),
      amount: ruleForm.amountType === 'FIXED' ? parseFloat(ruleForm.amount) : null,
      percentage: ruleForm.amountType === 'PERCENTAGE' ? parseFloat(ruleForm.percentage) : null,
      percentageBase: ruleForm.amountType === 'PERCENTAGE' ? ruleForm.percentageBase : null,
    }

    ruleMutation.mutate(payload)
  }

  // Handle Live Preview Calculation
  const handleRunPreview = async () => {
    if (!previewEmpId) {
      return toast.error('Please select an employee for preview')
    }
    setPreviewLoading(true)
    try {
      const res = await previewStructure(id, { employeeId: previewEmpId })
      setPreviewResult(res.data?.data || res.data)
      toast.success('Preview calculation refreshed')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Calculation failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  const rules = structure?.rules || []

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Navigation & Title Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/payroll/structures"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#205493] hover:underline mb-1"
          >
            <ArrowLeft size={13} /> Back to Salary Structures
          </Link>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {isNew ? 'New Salary Structure' : `Salary Structure / ${structure?.name || ''}`}
          </h1>
          <p className="text-xs text-gray-500">
            {isNew ? 'Define a new salary structure configuration' : 'Form view of one salary structure'}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {!isNew && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Edit2 size={13} />
                <span>EDIT</span>
              </button>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleSaveStructure}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#205493] hover:bg-[#1a4477] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>SAVE</span>
                </button>
                {!isNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      if (structure) {
                        setFormData({
                          name: structure.name,
                          code: structure.code,
                          description: structure.description || '',
                          active: structure.active,
                        })
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <X size={13} />
                    <span>CANCEL</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Top Section: Structure Info ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 space-y-5">
        <h2 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2 border-b border-gray-100 pb-3">
          <Layers size={16} className="text-[#205493]" />
          <span>Structure Information</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Structure Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Regular Salary"
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Code <span className="text-red-500">*</span> (max 6 chars)
              </label>
              <input
                type="text"
                maxLength={6}
                disabled={!isEditing}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. REG"
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 font-mono uppercase outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded text-[#205493] border-gray-300 focus:ring-[#205493]"
                />
                <span>Active Structure</span>
              </label>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                rows={5}
                disabled={!isEditing}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain the purpose, applicability, or guidelines for this salary structure..."
                className="w-full px-3 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:bg-white focus:border-[#205493] disabled:opacity-85 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Embedded Section: Salary Rules ── */}
      {!isNew && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#205493] tracking-tight">Salary Rules</h2>
              <p className="text-[11px] text-gray-500">Ordered by sequence of execution during payroll calculation</p>
            </div>

            {canManage && (
              <button
                type="button"
                id="add-salary-rule-btn"
                onClick={handleOpenAddRule}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#205493] hover:bg-[#1a4477] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Rule</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Rule Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 px-3">Sequence</th>
                  {canManage && <th className="py-2.5 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 8 : 7} className="py-8 text-center text-gray-400">
                      No rules configured yet. Click [Add Rule] to configure calculation rules.
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => {
                    let valueDisplay = 'Auto'
                    if (rule.amountType === 'FIXED') {
                      valueDisplay = formatINR(rule.amount || 0)
                    } else if (rule.amountType === 'PERCENTAGE') {
                      valueDisplay = `${rule.percentage}% of ${rule.percentageBase || 'Basic'}`
                    } else if (rule.amountType === 'CONTRACT_WAGE') {
                      valueDisplay = '= Employee Contract Wage'
                    } else if (rule.amountType === 'COMPUTED') {
                      valueDisplay = 'Auto-calculated'
                    }

                    return (
                      <tr key={rule.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-2.5 px-3 font-semibold text-gray-400">#{rule.sequence}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{rule.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[11px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                            {rule.code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              CATEGORY_BADGES[rule.category] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {rule.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-medium">
                          {AMOUNT_TYPE_LABELS[rule.amountType] || rule.amountType}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">{valueDisplay}</td>
                        <td className="py-2.5 px-3 text-gray-500">{rule.sequence}</td>
                        {canManage && (
                          <td className="py-2.5 px-3 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRule(rule)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                              title="Edit Rule"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete rule "${rule.name}"?`)) {
                                  deleteRuleMutation.mutate(rule.id)
                                }
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Delete Rule"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section: Live Preview Salary Calculation ── */}
      {!isNew && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-5 shadow-lg border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-blue-400" />
                <h2 className="text-sm font-bold tracking-tight text-white">Preview Salary Calculation</h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Simulate computation against an employee's active contract wage without generating a payslip
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={previewEmpId}
                onChange={(e) => setPreviewEmpId(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Select Employee ▼ --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                  </option>
                ))}
              </select>

              <button
                type="button"
                id="calculate-preview-btn"
                onClick={handleRunPreview}
                disabled={previewLoading || !previewEmpId}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                {previewLoading ? 'CALCULATING...' : 'CALCULATE PREVIEW'}
              </button>
            </div>
          </div>

          {previewResult ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px] uppercase">
                      <th className="py-2 px-3">Rule</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {previewResult.lines?.map((line, idx) => {
                      const isDeduction = line.category === 'DEDUCTION'
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-medium text-slate-200">{line.ruleName}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                                CATEGORY_BADGES[line.category] || 'text-slate-300'
                              }`}
                            >
                              {line.category}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              isDeduction ? 'text-red-400' : 'text-slate-100'
                            }`}
                          >
                            {isDeduction ? `-${formatINR(line.amount)}` : formatINR(line.amount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Bar */}
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
                <div className="text-slate-300">
                  Gross: <span className="text-emerald-400 text-sm font-bold ml-1">{formatINR(previewResult.gross)}</span>
                </div>
                <div className="text-slate-300">
                  Deductions: <span className="text-red-400 text-sm font-bold ml-1">-{formatINR(previewResult.deductions)}</span>
                </div>
                <div className="text-slate-300">
                  Net Salary: <span className="text-amber-400 text-base font-extrabold ml-1">{formatINR(previewResult.net)}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 italic">
                Note: This is a preview only. No payslip is created.
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
              <Info size={16} className="text-slate-500" />
              <span>Select an employee above and click [CALCULATE PREVIEW] to inspect the calculation breakdown.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Add / Edit Rule ── */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRule ? `Edit Rule: ${editingRule.name}` : 'Add Salary Rule'}
        subtitle="Define computation behavior and sequence within this structure"
        size="md"
      >
        <form onSubmit={handleSaveRule} className="space-y-4" noValidate>
          {/* Row 1: Rule Name | Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Rule Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="e.g. Transport Allowance"
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ruleForm.code}
                onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. TRANS_ALLOW"
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg font-mono uppercase outline-none focus:border-[#205493]"
                required
              />
            </div>
          </div>

          {/* Row 2: Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={ruleForm.category}
              onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="BASIC">BASIC (Blue)</option>
              <option value="ALLOWANCE">ALLOWANCE (Green)</option>
              <option value="GROSS">GROSS (Purple)</option>
              <option value="DEDUCTION">DEDUCTION (Red)</option>
              <option value="NET">NET (Yellow)</option>
            </select>
          </div>

          {/* Row 3: Amount Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Amount Type <span className="text-red-500">*</span>
            </label>
            <select
              value={ruleForm.amountType}
              onChange={(e) => setRuleForm({ ...ruleForm, amountType: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="FIXED">Fixed Amount (₹)</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="CONTRACT_WAGE">Contract Wage (=)</option>
              <option value="COMPUTED">Auto-Computed (GROSS or NET)</option>
            </select>
          </div>

          {/* Row 4: Conditional Fields based on Amount Type */}
          {ruleForm.amountType === 'FIXED' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ruleForm.amount}
                onChange={(e) => setRuleForm({ ...ruleForm, amount: e.target.value })}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                required
              />
            </div>
          )}

          {ruleForm.amountType === 'PERCENTAGE' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Percentage (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={ruleForm.percentage}
                  onChange={(e) => setRuleForm({ ...ruleForm, percentage: e.target.value })}
                  placeholder="e.g. 40"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Of (Base) <span className="text-red-500">*</span>
                </label>
                <select
                  value={ruleForm.percentageBase}
                  onChange={(e) => setRuleForm({ ...ruleForm, percentageBase: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
                >
                  <option value="BASIC">Basic Salary</option>
                  <option value="GROSS">Gross Salary</option>
                  <option value="CONTRACT_WAGE">Contract Wage</option>
                </select>
              </div>
            </div>
          )}

          {(ruleForm.amountType === 'CONTRACT_WAGE' || ruleForm.amountType === 'COMPUTED') && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
              <Info size={16} className="text-blue-500 shrink-0" />
              <span>Value will be calculated automatically during payroll execution based on rules sequence.</span>
            </div>
          )}

          {/* Row 5: Sequence */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sequence <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={ruleForm.sequence}
              onChange={(e) => setRuleForm({ ...ruleForm, sequence: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">Lower numbers are calculated first.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setRuleModalOpen(false)}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={ruleMutation.isPending}
              className="px-4 py-1.5 bg-[#205493] hover:bg-[#1a4477] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {ruleMutation.isPending ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
