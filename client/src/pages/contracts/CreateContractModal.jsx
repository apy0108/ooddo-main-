import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Loader2, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import FormField from '../../components/ui/FormField'
import SearchSelect from '../../components/ui/SearchSelect'
import { employeesApi, departmentsApi, jobPositionsApi } from '../../api/employees.api'
import { contractsApi } from '../../api/contracts.api'
import { workingSchedulesApi } from '../../api/workingSchedules.api'
import { getStructures } from '../../api/salaryStructure.api'

const CONTRACT_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT',  label: 'Contract' },
  { value: 'INTERN',    label: 'Intern' },
]

export default function CreateContractModal({ isOpen, onClose, defaultEmployeeId = '' }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    employeeId: defaultEmployeeId,
    departmentId: '',
    jobPositionId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    wage: '',
    contractType: 'FULL_TIME',
    workingScheduleId: '',
    salaryStructureId: '',
    notes: '',
  })

  const [errors, setErrors] = useState({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        employeeId: defaultEmployeeId || '',
      }))
    }
  }, [isOpen, defaultEmployeeId])

  // Fetch dropdown data
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-for-contract'],
    queryFn: () => employeesApi.getAll({ limit: 200 }),
    enabled: isOpen,
    select: (res) => res.data || [],
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
    enabled: isOpen,
    select: (res) => res.data || [],
  })

  const { data: jobPositions = [] } = useQuery({
    queryKey: ['jobPositions'],
    queryFn: jobPositionsApi.getAll,
    enabled: isOpen,
    select: (res) => res.data || [],
  })

  const { data: schedules = [] } = useQuery({
    queryKey: ['working-schedules-dropdown'],
    queryFn: () => workingSchedulesApi.getAll(),
    enabled: isOpen,
    select: (res) => res.data || [],
  })

  const { data: structures = [] } = useQuery({
    queryKey: ['salary-structures-dropdown'],
    queryFn: () => getStructures({ active: true }),
    enabled: isOpen,
    select: (res) => res.data?.data || res.data || [],
  })

  // Auto-fill department and position when employee is selected
  const handleEmployeeChange = (empId) => {
    setFormData((prev) => ({ ...prev, employeeId: empId }))
    if (empId) {
      const emp = allEmployees.find((e) => e.id === empId)
      if (emp) {
        setFormData((prev) => ({
          ...prev,
          employeeId: empId,
          departmentId: emp.department?.id || prev.departmentId,
          jobPositionId: emp.jobPosition?.id || prev.jobPositionId,
          workingScheduleId: emp.workingSchedule?.id || prev.workingScheduleId,
        }))
      }
    }
  }

  const createMutation = useMutation({
    mutationFn: contractsApi.create,
    onSuccess: (res) => {
      toast.success('Contract created as Draft')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['employee-counts'] })
      handleClose()
      const newId = res?.data?.id
      if (newId) navigate(`/contracts/${newId}`)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create contract'
      toast.error(msg)
    },
  })

  const handleClose = () => {
    setFormData({
      employeeId: '',
      departmentId: '',
      jobPositionId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      wage: '',
      contractType: 'FULL_TIME',
      workingScheduleId: '',
      salaryStructureId: '',
      notes: '',
    })
    setErrors({})
    onClose()
  }

  const validate = () => {
    const errs = {}
    if (!formData.employeeId) errs.employeeId = 'Employee is required'
    if (!formData.startDate) errs.startDate = 'Start date is required'
    if (!formData.wage || parseFloat(formData.wage) <= 0) errs.wage = 'Wage must be a positive number'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      createMutation.mutate({
        employeeId: formData.employeeId,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        wage: parseFloat(formData.wage),
        contractType: formData.contractType,
        departmentId: formData.departmentId || null,
        jobPositionId: formData.jobPositionId || null,
        workingScheduleId: formData.workingScheduleId || null,
        salaryStructureId: formData.salaryStructureId || null,
        notes: formData.notes || null,
      })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to create contract'
      toast.error(msg)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Contract"
      subtitle="Define contract terms for an employee"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Row 1: Employee | Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Employee" required error={errors.employeeId}>
            <SearchSelect
              placeholder="Select employee..."
              value={formData.employeeId}
              onChange={handleEmployeeChange}
              options={allEmployees.map((e) => ({
                value: e.id,
                label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`,
              }))}
              error={!!errors.employeeId}
            />
          </FormField>

          <FormField label="Department">
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row 2: Start Date | End Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Start Date" required error={errors.startDate}>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => {
                setFormData({ ...formData, startDate: e.target.value })
                if (errors.startDate) setErrors({ ...errors, startDate: null })
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
            />
          </FormField>

          <FormField label="End Date" hint="Leave blank for open-ended">
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
            />
          </FormField>
        </div>

        {/* Row 3: Wage | Contract Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Wage (₹)" required error={errors.wage}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
              <input
                type="number"
                min="0"
                value={formData.wage}
                onChange={(e) => {
                  setFormData({ ...formData, wage: e.target.value })
                  if (errors.wage) setErrors({ ...errors, wage: null })
                }}
                placeholder="85000"
                className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
              />
            </div>
            <small className="text-gray-500 text-[11px] mt-1 block">
              This wage is used as the Basic Salary in payroll calculations
            </small>
          </FormField>

          <FormField label="Contract Type">
            <select
              value={formData.contractType}
              onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              {CONTRACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row 4: Job Position | Working Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Job Position">
            <select
              value={formData.jobPositionId}
              onChange={(e) => setFormData({ ...formData, jobPositionId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="">-- Select Job Position --</option>
              {jobPositions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Working Schedule">
            <select
              value={formData.workingScheduleId}
              onChange={(e) => setFormData({ ...formData, workingScheduleId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="">-- Select Schedule --</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.weeklyHours}h/wk)
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row 5: Salary Structure */}
        <FormField label="Salary Structure">
          <select
            name="salaryStructureId"
            value={formData.salaryStructureId}
            onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
          >
            <option value="">-- Select Structure (optional) --</option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </FormField>

        {/* Notes */}
        <FormField label="Notes">
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add notes about this contract..."
            className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] resize-none"
          />
        </FormField>

        {/* Info box */}
        <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            New contracts start as <strong>Draft</strong>. Click "Set to Running" on the
            contract page to activate it after verifying the details.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#205493] hover:bg-[#184275] rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Contract</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
