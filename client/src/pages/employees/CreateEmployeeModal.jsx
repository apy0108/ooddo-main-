import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import FormField from '../../components/ui/FormField'
import SearchSelect from '../../components/ui/SearchSelect'
import {
  employeesApi,
  departmentsApi,
  jobPositionsApi,
  schedulesApi,
} from '../../api/employees.api'

export default function CreateEmployeeModal({ isOpen, onClose }) {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    jobPositionId: '',
    managerId: '',
    workingScheduleId: '',
    hireDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    workLocation: '',
    company: 'PeoplePay360',
    dateOfBirth: '',
    bankName: '',
    bankAccountNumber: '',
  })

  const [errors, setErrors] = useState({})
  const [showBankInfo, setShowBankInfo] = useState(false)

  // Fetch dropdown data
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
    queryKey: ['schedules'],
    queryFn: schedulesApi.getAll,
    enabled: isOpen,
    select: (res) => res.data || [],
  })

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-for-manager'],
    queryFn: () => employeesApi.getAll({ limit: 100 }),
    enabled: isOpen,
    select: (res) => res.data || [],
  })

  const createMutation = useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      toast.success('Employee created successfully')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      handleClose()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create employee'
      toast.error(msg)
    },
  })

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      departmentId: '',
      jobPositionId: '',
      managerId: '',
      workingScheduleId: '',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      workLocation: '',
      company: 'PeoplePay360',
      dateOfBirth: '',
      bankName: '',
      bankAccountNumber: '',
    })
    setErrors({})
    setShowBankInfo(false)
    onClose()
  }

  const validate = () => {
    const errs = {}
    if (!formData.firstName.trim()) errs.firstName = 'First name is required'
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required'
    if (!formData.email.trim()) {
      errs.email = 'Work email is required'
    } else if (!formData.email.includes('@') || !formData.email.includes('.')) {
      errs.email = 'Enter a valid email address'
    }
    if (!formData.hireDate) errs.hireDate = 'Hire date is required'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    createMutation.mutate({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      hireDate: formData.hireDate,
      dateOfBirth: formData.dateOfBirth || null,
      status: formData.status,
      workLocation: formData.workLocation.trim() || null,
      company: formData.company.trim() || 'PeoplePay360',
      departmentId: formData.departmentId || null,
      jobPositionId: formData.jobPositionId || null,
      managerId: formData.managerId || null,
      workingScheduleId: formData.workingScheduleId || null,
      bankName: formData.bankName.trim() || null,
      bankAccountNumber: formData.bankAccountNumber.trim() || null,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Employee"
      subtitle="Fill in the essential employment and organizational details."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Row 1: First Name | Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First Name" required error={errors.firstName}>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => {
                setFormData({ ...formData, firstName: e.target.value })
                if (errors.firstName) setErrors({ ...errors, firstName: null })
              }}
              placeholder="e.g. Aarav"
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
            />
          </FormField>

          <FormField label="Last Name" required error={errors.lastName}>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => {
                setFormData({ ...formData, lastName: e.target.value })
                if (errors.lastName) setErrors({ ...errors, lastName: null })
              }}
              placeholder="e.g. Mehta"
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
            />
          </FormField>
        </div>

        {/* Row 2: Work Email | Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Work Email" required error={errors.email}>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                if (errors.email) setErrors({ ...errors, email: null })
              }}
              placeholder="aarav@company.com"
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
            />
          </FormField>

          <FormField label="Phone">
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
            />
          </FormField>
        </div>

        {/* Row 3: Department | Job Position */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Department">
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Job Position">
            <select
              value={formData.jobPositionId}
              onChange={(e) => setFormData({ ...formData, jobPositionId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="">-- Select Job Position --</option>
              {jobPositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Row 4: Manager | Working Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Reports To / Manager">
            <SearchSelect
              placeholder="Select manager..."
              value={formData.managerId}
              onChange={(val) => setFormData({ ...formData, managerId: val })}
              options={allEmployees.map((e) => ({
                value: e.id,
                label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`,
              }))}
            />
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

        {/* Row 5: Hire Date | Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Hire Date" required error={errors.hireDate}>
            <input
              type="date"
              value={formData.hireDate}
              onChange={(e) => {
                setFormData({ ...formData, hireDate: e.target.value })
                if (errors.hireDate) setErrors({ ...errors, hireDate: null })
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
            />
          </FormField>

          <FormField label="Status">
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>
          </FormField>
        </div>

        {/* Row 6: Work Location | Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Work Location">
            <input
              type="text"
              value={formData.workLocation}
              onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
              placeholder="e.g. Mumbai HQ / Remote"
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
            />
          </FormField>

          <FormField label="Company">
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="PeoplePay360"
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
            />
          </FormField>
        </div>

        {/* Row 7: Date of Birth */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date of Birth">
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
            />
          </FormField>
          <div />
        </div>

        {/* Collapsible Bank Info */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowBankInfo(!showBankInfo)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-700 py-1 hover:text-[#205493] transition cursor-pointer"
          >
            <span>Bank & Disbursal Information (Optional)</span>
            <ChevronDown
              size={15}
              className={`text-gray-400 transition-transform ${showBankInfo ? 'rotate-180' : ''}`}
            />
          </button>

          {showBankInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-2">
              <FormField label="Bank Name">
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                />
              </FormField>

              <FormField label="Account Number">
                <input
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  placeholder="e.g. 5010023456789"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Modal Footer */}
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
            className="px-5 py-2 text-xs font-semibold text-white bg-[#205493] hover:bg-[#184275] active:bg-[#13345d] rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Employee</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
