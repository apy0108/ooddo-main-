import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Mail,
  Phone,
  CalendarOff,
  FileText,
  Clock,
  Loader2,
  Building2,
  CreditCard,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  employeesApi,
  departmentsApi,
  jobPositionsApi,
  schedulesApi,
} from '../../api/employees.api'
import SmartButton from '../../components/ui/SmartButton'
import TabGroup from '../../components/ui/TabGroup'
import SearchSelect from '../../components/ui/SearchSelect'
import { getInitials, formatDate } from '../../utils/formatters'

// Avatar background colors based on first letter of first name
const getAvatarColor = (firstName = '') => {
  const char = firstName.trim().charAt(0).toUpperCase()
  if (char >= 'A' && char <= 'D') return 'bg-indigo-600 text-white'
  if (char >= 'E' && char <= 'H') return 'bg-purple-600 text-white'
  if (char >= 'I' && char <= 'L') return 'bg-blue-600 text-white'
  if (char >= 'M' && char <= 'P') return 'bg-emerald-600 text-white'
  if (char >= 'Q' && char <= 'T') return 'bg-amber-600 text-white'
  return 'bg-rose-600 text-white'
}

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('work')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})

  // Fetch employee data
  const {
    data: employeeRes,
    isLoading: isEmpLoading,
    isError,
  } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getOne(id),
  })

  // Fetch smart button counts
  const { data: countsRes } = useQuery({
    queryKey: ['employee-counts', id],
    queryFn: () => employeesApi.getCounts(id),
  })

  const employee = employeeRes?.data
  const counts = countsRes?.data || {
    timeOffRequests: 0,
    contracts: 0,
    attendance: 0,
  }

  // Dropdowns for edit mode
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
    select: (res) => res.data || [],
  })

  const { data: jobPositions = [] } = useQuery({
    queryKey: ['jobPositions'],
    queryFn: jobPositionsApi.getAll,
    select: (res) => res.data || [],
  })

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: schedulesApi.getAll,
    select: (res) => res.data || [],
  })

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-for-manager'],
    queryFn: () => employeesApi.getAll({ limit: 100 }),
    select: (res) => res.data || [],
  })

  // Sync formData with loaded employee
  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        departmentId: employee.department?.id || '',
        jobPositionId: employee.jobPosition?.id || '',
        managerId: employee.manager?.id || '',
        workingScheduleId: employee.workingSchedule?.id || '',
        company: employee.company || 'PeoplePay360',
        workLocation: employee.workLocation || '',
        status: employee.status || 'ACTIVE',
        hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
        bankName: employee.bankName || '',
        bankAccountNumber: employee.bankAccountNumber || '',
      })
    }
  }, [employee])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => employeesApi.update(id, payload),
    onSuccess: () => {
      toast.success('Employee updated successfully')
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setIsEditing(false)
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to update employee'
      toast.error(msg)
    },
  })

  const handleSave = (e) => {
    e.preventDefault()
    updateMutation.mutate({
      ...formData,
      departmentId: formData.departmentId || null,
      jobPositionId: formData.jobPositionId || null,
      managerId: formData.managerId || null,
      workingScheduleId: formData.workingScheduleId || null,
    })
  }

  const handleCancel = () => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        departmentId: employee.department?.id || '',
        jobPositionId: employee.jobPosition?.id || '',
        managerId: employee.manager?.id || '',
        workingScheduleId: employee.workingSchedule?.id || '',
        company: employee.company || 'PeoplePay360',
        workLocation: employee.workLocation || '',
        status: employee.status || 'ACTIVE',
        hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
        bankName: employee.bankName || '',
        bankAccountNumber: employee.bankAccountNumber || '',
      })
    }
    setIsEditing(false)
  }

  if (isEmpLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <Loader2 size={32} className="animate-spin text-[#205493] mb-3" />
        <p className="text-xs font-semibold">Loading employee profile...</p>
      </div>
    )
  }

  if (isError || !employee) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto my-12">
        <h3 className="text-base font-bold text-gray-900 mb-1">Employee Not Found</h3>
        <p className="text-xs text-gray-500 mb-5">
          The requested employee record does not exist or has been removed.
        </p>
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#184275] transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Employees</span>
        </Link>
      </div>
    )
  }

  const fullName = `${employee.firstName} ${employee.lastName}`
  const initials = getInitials(fullName) || 'EM'
  const avatarBg = getAvatarColor(employee.firstName)

  const tabs = [
    { id: 'work', label: 'Work Information' },
    { id: 'private', label: 'Private Information' },
  ]

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* ── Top Header Section & Smart Buttons ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Breadcrumb */}
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link
              to="/employees"
              className="text-[#205493] hover:underline font-semibold flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Employees</span>
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">{fullName}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Main employee form with related HR actions
          </p>
        </div>

        {/* Smart Buttons Row */}
        <div className="flex flex-wrap items-center gap-2">
          <SmartButton
            label="Time Off"
            count={counts.timeOffRequests}
            icon={CalendarOff}
            onClick={() => navigate(`/time-off/requests?employeeId=${id}`)}
          />
          <SmartButton
            label="Contracts"
            count={counts.contracts}
            icon={FileText}
            onClick={() => navigate(`/contracts?employeeId=${id}`)}
          />
          <SmartButton
            label="Attendance"
            count={counts.attendance}
            icon={Clock}
            onClick={() => navigate(`/attendance?employeeId=${id}`)}
          />
        </div>
      </div>

      {/* ── Employee Header Profile Card ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Avatar + Main Info */}
          <div className="flex items-center gap-5">
            <div
              className={`w-16 h-16 rounded-full ${avatarBg} flex items-center justify-center font-bold text-xl shadow-xs shrink-0`}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  {fullName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 font-mono">
                  {employee.employeeNumber}
                </span>
              </div>

              <p className="text-xs text-gray-500 mt-0.5">
                {employee.jobPosition?.title || 'Position unassigned'}
                {employee.department?.name && ` • ${employee.department.name}`}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Mail size={13} className="text-gray-400" />
                  {employee.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit / Save Action Controls */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:border-[#205493] hover:text-[#205493] text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
              >
                <Edit2 size={13} />
                <span>EDIT</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  {updateMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  <span>SAVE</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="mt-6 pt-2">
          <TabGroup
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* ── Tab Contents ── */}
        <div className="pt-6">
          {activeTab === 'work' ? (
            /* WORK INFORMATION TAB */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Department
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData({ ...formData, departmentId: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
                    >
                      <option value="">-- None --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                      {employee.department?.name || '—'}
                    </div>
                  )}
                </div>

                {/* Manager */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Manager
                  </label>
                  {isEditing ? (
                    <SearchSelect
                      value={formData.managerId}
                      onChange={(val) => setFormData({ ...formData, managerId: val })}
                      placeholder="Select manager..."
                      options={allEmployees
                        .filter((e) => e.id !== id)
                        .map((e) => ({
                          value: e.id,
                          label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`,
                        }))}
                    />
                  ) : (
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                      {employee.manager
                        ? `${employee.manager.firstName} ${employee.manager.lastName}`
                        : '—'}
                    </div>
                  )}
                </div>

                {/* Working Schedule */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Working Schedule
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.workingScheduleId}
                      onChange={(e) =>
                        setFormData({ ...formData, workingScheduleId: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
                    >
                      <option value="">-- None --</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.weeklyHours}h/wk)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                      {employee.workingSchedule?.name || 'Standard Schedule'}
                    </div>
                  )}
                </div>

                {/* Company */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Company
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                    />
                  ) : (
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                      {employee.company || 'PeoplePay360'}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Job Position */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Job Position
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.jobPositionId}
                      onChange={(e) =>
                        setFormData({ ...formData, jobPositionId: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20"
                    >
                      <option value="">-- None --</option>
                      {jobPositions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                      {employee.jobPosition?.title || '—'}
                    </div>
                  )}
                </div>

                {/* Work Location */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Work Location
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.workLocation}
                      onChange={(e) =>
                        setFormData({ ...formData, workLocation: e.target.value })
                      }
                      placeholder="e.g. Mumbai HQ / Remote"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                    />
                  ) : (
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                      {employee.workLocation || 'Headquarters'}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Status
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium capitalize">
                      {employee.status?.toLowerCase().replace(/_/g, ' ')}
                    </div>
                  )}
                </div>

                {/* Work Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Work Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] font-mono"
                    />
                  ) : (
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-mono">
                      {employee.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* PRIVATE INFORMATION TAB */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {/* Left: First Name, Phone, Date of Birth */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                        {employee.firstName}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                        {employee.phone || '—'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Date of Birth
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) =>
                          setFormData({ ...formData, dateOfBirth: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                        {employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '—'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Last Name, Personal Email, Hire Date */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                        {employee.lastName}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Personal Email
                    </label>
                    <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-mono">
                      {employee.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Hire Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={formData.hireDate}
                        onChange={(e) =>
                          setFormData({ ...formData, hireDate: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                        {formatDate(employee.hireDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Details Sub-Section */}
              <div className="border-t border-gray-100 pt-5">
                <h4 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-gray-400" />
                  <span>Bank & Disbursal Details</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Bank Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData({ ...formData, bankName: e.target.value })
                        }
                        placeholder="e.g. HDFC Bank, SBI"
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-medium">
                        {employee.bankName || 'Not configured'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Account Number
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.bankAccountNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, bankAccountNumber: e.target.value })
                        }
                        placeholder="e.g. ACC-001-AP"
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] font-mono"
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg text-gray-800 font-mono">
                        {employee.bankAccountNumber || 'Not configured'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
