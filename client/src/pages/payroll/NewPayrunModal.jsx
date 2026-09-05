import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, ArrowLeft, ArrowRight, Check, X, Users, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import { getStructures } from '../../api/salaryStructure.api'
import { getEligibleEmployees, createPayrun } from '../../api/payrun.api'
import { formatINR } from '../../utils/formatters'

export default function NewPayrunModal({ isOpen, onClose }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Step state: 1 = Scope Selection, 2 = Employee Selection
  const [step, setStep] = useState(1)

  // Step 1 Form fields
  const [structureId, setStructureId] = useState('')
  const [periodName, setPeriodName] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [step1Errors, setStep1Errors] = useState({})

  // Step 2 Selection state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState('')

  // Fetch active salary structures
  const { data: structures = [] } = useQuery({
    queryKey: ['active-salary-structures'],
    queryFn: () => getStructures({ active: true }),
    enabled: isOpen,
    select: (res) => res.data?.data || res.data || [],
  })

  // Set default structure when loaded
  if (structures.length > 0 && !structureId) {
    const reg = structures.find((s) => s.code === 'REG') || structures[0]
    setStructureId(reg.id)
  }

  // Fetch eligible employees when on Step 2
  const {
    data: eligibleEmployees = [],
    isLoading: loadingEmployees,
    isError: errorEmployees,
  } = useQuery({
    queryKey: ['eligible-employees', structureId, periodStart, periodEnd],
    queryFn: () =>
      getEligibleEmployees({
        salaryStructureId: structureId,
        periodStart,
        periodEnd,
      }),
    enabled: isOpen && step === 2 && Boolean(structureId && periodStart && periodEnd),
    select: (res) => res.data?.data || res.data || [],
  })

  const resetModal = () => {
    setStep(1)
    setPeriodName('')
    setPeriodStart('')
    setPeriodEnd('')
    setStep1Errors({})
    setSelectedEmployeeIds([])
    setEmployeeSearch('')
    onClose()
  }

  const validateStep1 = () => {
    const errs = {}
    if (!structureId) errs.structureId = 'Salary structure is required'
    if (!periodName.trim()) errs.periodName = 'Period name is required'
    if (!periodStart) errs.periodStart = 'Period start date is required'
    if (!periodEnd) errs.periodEnd = 'Period end date is required'
    if (periodStart && periodEnd && new Date(periodStart) >= new Date(periodEnd)) {
      errs.periodEnd = 'Period end date must be after start date'
    }
    setStep1Errors(errs)
    return Object.keys(errs).length === 0
  }

  const handleContinue = () => {
    if (!validateStep1()) return
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
  }

  // Step 2 Employee Selection helpers
  const filteredEmployees = eligibleEmployees.filter((emp) => {
    if (!employeeSearch.trim()) return true
    const q = employeeSearch.toLowerCase()
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.employeeNumber?.toLowerCase().includes(q)
    )
  })

  const isAllSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedEmployeeIds.includes(e.id))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect filtered
      const filteredIds = new Set(filteredEmployees.map((e) => e.id))
      setSelectedEmployeeIds((prev) => prev.filter((id) => !filteredIds.has(id)))
    } else {
      // Select all filtered
      const newIds = new Set([...selectedEmployeeIds, ...filteredEmployees.map((e) => e.id)])
      setSelectedEmployeeIds(Array.from(newIds))
    }
  }

  const handleToggleEmployee = (id) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Create Payrun Mutation
  const createMutation = useMutation({
    mutationFn: createPayrun,
    onSuccess: (res) => {
      const data = res.data?.data || res.data
      toast.success(`Payrun created with ${selectedEmployeeIds.length} employees`)
      queryClient.invalidateQueries({ queryKey: ['payruns'] })
      resetModal()
      if (data?.id) {
        navigate(`/payroll/payruns/${data.id}`)
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create payrun'
      toast.error(msg)
    },
  })

  const handleCreatePayrun = () => {
    if (selectedEmployeeIds.length === 0) {
      toast.error('Please select at least 1 employee')
      return
    }

    createMutation.mutate({
      salaryStructureId: structureId,
      name: periodName.trim(),
      periodStart,
      periodEnd,
      employeeIds: selectedEmployeeIds,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetModal}
      title={step === 1 ? 'New Pay Run' : 'Select Employee Records'}
      subtitle={
        step === 1
          ? 'Step 1 of 2: Define payroll scope & dates'
          : `Step 2 of 2: Choose employees for ${periodName}`
      }
      size="lg"
    >
      {step === 1 ? (
        /* ── STEP 1: SCOPE SELECTION ── */
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Salary Structure <span className="text-red-500">*</span>
            </label>
            <select
              value={structureId}
              onChange={(e) => {
                setStructureId(e.target.value)
                if (step1Errors.structureId) setStep1Errors({ ...step1Errors, structureId: null })
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="">-- Select Salary Structure --</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            {step1Errors.structureId && (
              <p className="text-red-500 text-[11px] mt-1">{step1Errors.structureId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Period Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. March 2026"
              value={periodName}
              onChange={(e) => {
                setPeriodName(e.target.value)
                if (step1Errors.periodName) setStep1Errors({ ...step1Errors, periodName: null })
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
            />
            {step1Errors.periodName && (
              <p className="text-red-500 text-[11px] mt-1">{step1Errors.periodName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Period Start <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value)
                  if (step1Errors.periodStart) setStep1Errors({ ...step1Errors, periodStart: null })
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
              />
              {step1Errors.periodStart && (
                <p className="text-red-500 text-[11px] mt-1">{step1Errors.periodStart}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Period End <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value)
                  if (step1Errors.periodEnd) setStep1Errors({ ...step1Errors, periodEnd: null })
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
              />
              {step1Errors.periodEnd && (
                <p className="text-red-500 text-[11px] mt-1">{step1Errors.periodEnd}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={resetModal}
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#205493] hover:bg-[#184275] rounded-lg transition cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* ── STEP 2: EMPLOYEE SELECTION ── */
        <div className="space-y-4 pt-1">
          {/* Search bar & Selection summary */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employees..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#205493]"
              />
            </div>
            <div className="text-xs text-gray-500 font-medium shrink-0">
              <span className="font-semibold text-gray-800">{selectedEmployeeIds.length}</span> / {eligibleEmployees.length} selected
            </div>
          </div>

          {/* Employees Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            {loadingEmployees ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-500">
                <Loader2 size={20} className="animate-spin text-[#205493]" />
                <span className="text-xs">Loading eligible employees...</span>
              </div>
            ) : errorEmployees ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-red-500">
                <AlertCircle size={20} />
                <span className="text-xs">Failed to load eligible employees</span>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">
                No eligible employees found with an active contract for this salary structure.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-gray-300 text-[#205493] focus:ring-[#205493] cursor-pointer"
                      />
                    </th>
                    <th className="p-3 font-semibold">Employee Name</th>
                    <th className="p-3 font-semibold">Working Hrs</th>
                    <th className="p-3 font-semibold">Start Date</th>
                    <th className="p-3 font-semibold text-right">Wage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((emp) => {
                    const selected = selectedEmployeeIds.includes(emp.id)
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => handleToggleEmployee(emp.id)}
                        className={`hover:bg-blue-50/50 cursor-pointer transition ${
                          selected ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleToggleEmployee(emp.id)}
                            className="rounded border-gray-300 text-[#205493] focus:ring-[#205493] cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-900">
                          {emp.name}
                          {emp.employeeNumber && (
                            <span className="ml-1.5 text-[10px] text-gray-400">
                              ({emp.employeeNumber})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">{emp.workingHours}</td>
                        <td className="p-3 text-gray-500">{emp.startDate}</td>
                        <td className="p-3 font-bold text-gray-900 text-right">
                          {formatINR(emp.wage)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs font-semibold text-[#205493] hover:underline cursor-pointer"
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleBack}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleCreatePayrun}
                disabled={createMutation.isPending || selectedEmployeeIds.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#205493] hover:bg-[#184275] rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>Create Payrun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
