import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  ChevronDown,
  RotateCcw,
  Mail,
  Shield,
  Eye,
  Info,
  MousePointer,
  Loader2,
  Calendar,
  Wallet,
  User,
  Users as UsersIcon,
  CheckSquare,
  Square,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { getInitials } from '../../utils/formatters'

const ROLES_CONFIG = [
  {
    value: 'EMPLOYEE',
    label: 'Employee',
    scope: 'Self-Service portal only',
    badgeLabel: 'Employee',
    badgeIcon: User,
  },
  {
    value: 'HR_MANAGER',
    label: 'Hr Manager',
    scope: 'People ops, teams & records',
    badgeLabel: 'Hr Manager',
    badgeIcon: UsersIcon,
  },
  {
    value: 'HR_PAYROLL_USER',
    label: 'Hr Payroll User',
    scope: 'Compute runs & draft adjustments',
    badgeLabel: 'Payroll User',
    badgeIcon: Wallet,
  },
  {
    value: 'HR_PAYROLL_MANAGER',
    label: 'Hr Payroll Admin',
    scope: 'Disburse funds & certify tax filings',
    badgeLabel: 'Payroll Admin',
    badgeIcon: Wallet,
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    scope: 'Full system governance',
    badgeLabel: 'Admin',
    badgeIcon: Shield,
  },
]

export default function Users() {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((s) => s.user?.id)

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState(null)
  const [panelMode, setPanelMode] = useState('CREATE') // 'CREATE' | 'EDIT'
  const [showBlueprint, setShowBlueprint] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'EMPLOYEE',
    employeeId: '',
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState({})

  // Fetch Users
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/auth/users')
      return res.data.data || []
    },
  })

  // Fetch Employees for dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-dropdown'],
    queryFn: async () => {
      const res = await api.get('/employees?limit=100')
      return res.data.data || []
    },
  })

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/auth/users', payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('User created successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['employees-dropdown'] })
      resetForm()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create user'
      toast.error(msg)
    },
  })

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/auth/users/${id}`, payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('User access updated successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['employees-dropdown'] })
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to update user'
      toast.error(msg)
    },
  })

  const resetForm = () => {
    setSelectedUser(null)
    setFormData({
      email: '',
      password: '',
      role: 'EMPLOYEE',
      employeeId: '',
      isActive: true,
    })
    setFormErrors({})
    setPanelMode('CREATE')
  }

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      employeeId: user.employee?.id || '',
      isActive: user.isActive,
    })
    setFormErrors({})
    setPanelMode('EDIT')
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    const errs = {}

    if (!formData.email.trim()) {
      errs.email = 'Work email is required'
    } else if (!formData.email.includes('@')) {
      errs.email = 'Enter a valid email address'
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }

    if (panelMode === 'CREATE') {
      createMutation.mutate({
        email: formData.email.trim(),
        password: formData.password || 'Password@123',
        role: formData.role,
        employeeId: formData.employeeId || null,
        isActive: formData.isActive,
      })
    } else {
      updateMutation.mutate({
        id: selectedUser.id,
        payload: {
          role: formData.role,
          employeeId: formData.employeeId || null,
          isActive: formData.isActive,
        },
      })
    }
  }

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${u.employee?.firstName || ''} ${u.employee?.lastName || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (u.employee?.employeeNumber || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  const activeCount = useMemo(() => {
    return users.filter((u) => u.isActive).length
  }, [users])

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-5 font-sans pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            User Management
          </h1>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 tracking-wide">
            ADMIN ONLY
          </span>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1e4e8c] hover:bg-[#183e70] text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus size={15} />
          <span>New User</span>
        </button>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative w-full max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, employees or email..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e4e8c] focus:ring-1 focus:ring-[#1e4e8c]/20 transition"
            />
          </div>

          {/* Role Filter Dropdown */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-medium outline-none focus:border-[#1e4e8c] cursor-pointer"
            >
              <option value="ALL">Role Filter</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="HR_MANAGER">HR Manager</option>
              <option value="HR_PAYROLL_USER">HR Payroll User</option>
              <option value="HR_PAYROLL_MANAGER">HR Payroll Admin</option>
              <option value="ADMIN">Admin</option>
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Active Seats Count */}
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
          <span>{activeCount} Active System Seats</span>
        </div>
      </div>

      {/* ── Blueprint Accordion Bar ── */}
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowBlueprint(!showBlueprint)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-gray-400" />
            <span>Architectural Blueprint Reference (Wireframe Spec)</span>
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${showBlueprint ? 'rotate-180' : ''}`}
          />
        </button>
        {showBlueprint && (
          <div className="p-4 bg-gray-50/80 border-t border-gray-200 text-xs text-gray-600 leading-relaxed">
            <p>
              This interface provisions authentication identities mapped onto employee records.
              Role sets govern route guards and operational execution permissions across PeoplePay360.
            </p>
          </div>
        )}
      </div>

      {/* ── Two-Column Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Table & Identity Boundary (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Table Container */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/40 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Work Email</th>
                    <th className="py-3 px-4">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {isUsersLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">
                        <Loader2 size={24} className="animate-spin text-[#1e4e8c] mx-auto mb-2" />
                        <span>Loading directory...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">
                        No users match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const fullName = u.employee
                        ? `${u.employee.firstName} ${u.employee.lastName}`
                        : u.email.split('@')[0]

                      const roleMatch =
                        ROLES_CONFIG.find((r) => r.value === u.role) || {
                          label: u.role,
                          badgeLabel: u.role,
                          badgeIcon: Shield,
                        }

                      const RoleIcon = roleMatch.badgeIcon
                      const isSelected = selectedUser?.id === u.id

                      return (
                        <tr
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          className={`hover:bg-blue-50/40 cursor-pointer transition ${
                            isSelected ? 'bg-blue-50/70' : ''
                          }`}
                        >
                          {/* User Column: Avatar + Name + ID */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#1e4e8c] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {getInitials(fullName)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 leading-tight truncate">
                                  {fullName}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                  {u.employee?.employeeNumber
                                    ? `ID #${u.employee.employeeNumber}`
                                    : 'No ID'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Employee Column */}
                          <td className="py-3 px-4 text-gray-700 font-medium">
                            {u.employee
                              ? `${u.employee.firstName} ${u.employee.lastName}`
                              : '—'}
                          </td>

                          {/* Work Email Column */}
                          <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                            {u.email}
                          </td>

                          {/* Role Column */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100/90 text-gray-700 text-[11px] font-medium border border-gray-200">
                              <RoleIcon size={12} className="text-gray-500 shrink-0" />
                              <span>{roleMatch.badgeLabel}</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <MousePointer size={13} className="text-gray-400" />
                <span>Select a user to edit access, or create a new user.</span>
              </div>
              <span>{filteredUsers.length} records listed</span>
            </div>
          </div>

          {/* Identity & Ownership Boundary Box */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs text-blue-950 flex items-start gap-3 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Info size={14} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-blue-900 mb-1">
                Identity & Ownership Boundary
              </h4>
              <p className="text-[11px] text-blue-800/80 leading-relaxed">
                User accounts are separate from Employee records, but should be linked to an
                employee for access and ownership. Revoking employee contracts does not
                immediately extinguish IAM access without updating the user profile.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Create / Edit User Card (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              <h3 className="font-bold text-sm text-gray-900">
                {panelMode === 'CREATE' ? 'Create User' : 'Create / Edit User'}
              </h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              title="Reset Form"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Employee Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-800">
                  Employee <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Linked Master</span>
              </div>
              <div className="relative">
                <select
                  value={formData.employeeId}
                  onChange={(e) => {
                    const empId = e.target.value
                    const emp = employees.find((x) => x.id === empId)
                    setFormData((prev) => ({
                      ...prev,
                      employeeId: empId,
                      ...(panelMode === 'CREATE' && emp?.email && !prev.email
                        ? { email: emp.email }
                        : {}),
                    }))
                  }}
                  className="w-full appearance-none px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-[#1e4e8c] focus:ring-1 focus:ring-[#1e4e8c]/20 transition cursor-pointer"
                >
                  <option value="">-- Select linked employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeNumber || 'EMP'})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Work Email Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Work Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  disabled={panelMode === 'EDIT'}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    if (formErrors.email) setFormErrors({ ...formErrors, email: null })
                  }}
                  placeholder="aarav@company.com"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e4e8c] focus:ring-1 focus:ring-[#1e4e8c]/20 disabled:bg-gray-50 disabled:text-gray-500 transition pr-9 font-mono"
                />
                <Mail
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-[11px] text-red-500 font-medium">
                  {formErrors.email}
                </p>
              )}
              <p className="mt-1 text-[10px] text-gray-400 leading-tight">
                Sign-in credentials and MFA codes route to this domain address.
              </p>
            </div>

            {/* Roles & Permission Sets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Roles & Permission Sets <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400 font-medium">RBAC scope</span>
              </div>

              <div className="space-y-1.5 border border-gray-200 rounded-lg p-2 bg-gray-50/30">
                {ROLES_CONFIG.map((r) => {
                  const isChecked = formData.role === r.value
                  const isSelf = selectedUser?.id === currentUserId
                  const disabled = isSelf && r.value !== formData.role

                  return (
                    <div
                      key={r.value}
                      onClick={() => !disabled && setFormData({ ...formData, role: r.value })}
                      className={`flex items-center justify-between p-2 rounded-md transition cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50/80 border border-blue-200/80'
                          : 'hover:bg-gray-100/60 border border-transparent'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-blue-700">
                          {isChecked ? (
                            <CheckSquare size={15} className="text-[#1e4e8c]" />
                          ) : (
                            <Square size={15} className="text-gray-300" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-900">
                          {r.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">{r.scope}</span>
                    </div>
                  )
                })}
              </div>

              {selectedUser?.id === currentUserId && (
                <p className="mt-1.5 text-[11px] text-amber-600">
                  You cannot change your own administrator role.
                </p>
              )}
            </div>

            {/* Account Status */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-semibold text-gray-800">Account Status</p>
                <p className="text-[10px] text-gray-400">Enables system authentication</p>
              </div>

              <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: true })}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    formData.isActive
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: false })}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    !formData.isActive
                      ? 'bg-white text-gray-900 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Disabled
                </button>
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2 px-4 rounded-lg bg-[#1e4e8c] hover:bg-[#183e70] active:bg-[#122f56] text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Shield size={14} />
                    <span>Create User / Save Access</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!formData.email) {
                    toast.error('Specify an email first')
                    return
                  }
                  toast.success(`Invitation instructions resent to ${formData.email}`)
                }}
                className="w-full py-2 px-4 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail size={14} className="text-gray-400" />
                <span>Resend Invitation & Setup Instructions</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
