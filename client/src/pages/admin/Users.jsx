import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus,
  Search,
  X,
  Check,
  Shield,
  Loader2,
  Lock,
  UserCheck,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { getInitials } from '../../utils/formatters'

const ROLES_LIST = [
  { value: 'EMPLOYEE', label: 'Employee', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'HR_MANAGER', label: 'HR Manager', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'HR_PAYROLL_USER', label: 'HR Payroll User', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'HR_PAYROLL_MANAGER', label: 'HR Payroll Admin', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'ADMIN', label: 'Admin', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
]

export default function Users() {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((s) => s.user?.id)

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState('CREATE') // 'CREATE' | 'EDIT'

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
      toast.success('User account created successfully!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['employees-dropdown'] })
      handleClosePanel()
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
      toast.success('User account updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['employees-dropdown'] })
      handleClosePanel()
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to update user'
      toast.error(msg)
    },
  })

  const openCreateMode = () => {
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
    setIsPanelOpen(true)
  }

  const openEditMode = (user) => {
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
    setIsPanelOpen(true)
  }

  const handleClosePanel = () => {
    setIsPanelOpen(false)
    setSelectedUser(null)
    setFormErrors({})
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    const errs = {}

    if (!formData.email.trim()) {
      errs.email = 'Work email is required'
    } else if (!formData.email.includes('@')) {
      errs.email = 'Enter a valid email address'
    }

    if (panelMode === 'CREATE' && formData.password && formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }

    if (!formData.role) {
      errs.role = 'Role is required'
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

  // Filtered Users List
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

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] bg-gray-50/50">
      {/* LEFT PANEL (60% or full width when panel closed) */}
      <div
        className={`transition-all duration-300 flex flex-col p-6 overflow-y-auto ${
          isPanelOpen ? 'w-full lg:w-3/5 border-r border-gray-200' : 'w-full'
        }`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              User Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
              Admin Only
            </span>
          </div>

          <button
            type="button"
            onClick={openCreateMode}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-indigo-600/20 transition cursor-pointer"
          >
            <UserPlus size={16} />
            <span>+ New User</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, employees or email..."
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="HR_MANAGER">HR Manager</option>
              <option value="HR_PAYROLL_USER">HR Payroll User</option>
              <option value="HR_PAYROLL_MANAGER">HR Payroll Admin</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
          {isUsersLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <Loader2 size={32} className="animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading user directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <Shield size={24} />
              </div>
              <p className="text-base font-semibold text-gray-800 mb-1">No users found</p>
              <p className="text-sm text-gray-500 max-w-sm mb-4">
                No user accounts match your search or filter criteria. Create the first user to get started.
              </p>
              <button
                type="button"
                onClick={openCreateMode}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
              >
                Create a new user account
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Work Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredUsers.map((u) => {
                    const fullName = u.employee
                      ? `${u.employee.firstName} ${u.employee.lastName}`
                      : u.email.split('@')[0]
                    const roleInfo =
                      ROLES_LIST.find((r) => r.value === u.role) || {
                        label: u.role,
                        badge: 'bg-gray-100 text-gray-700',
                      }
                    const isSelected = selectedUser?.id === u.id

                    return (
                      <tr
                        key={u.id}
                        onClick={() => openEditMode(u)}
                        className={`hover:bg-indigo-50/40 cursor-pointer transition ${
                          isSelected ? 'bg-indigo-50/70' : ''
                        }`}
                      >
                        {/* User initials & name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {getInitials(fullName)}
                            </div>
                            <span className="font-medium text-gray-900 truncate">
                              {fullName}
                            </span>
                          </div>
                        </td>

                        {/* Linked Employee */}
                        <td className="py-3 px-4 text-gray-600">
                          {u.employee ? (
                            <span className="text-gray-800 font-medium text-xs">
                              {u.employee.firstName} {u.employee.lastName}
                              {u.employee.employeeNumber && (
                                <span className="text-gray-400 ml-1">
                                  ({u.employee.employeeNumber})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">
                              Unlinked
                            </span>
                          )}
                        </td>

                        {/* Work Email */}
                        <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                          {u.email}
                        </td>

                        {/* Role Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleInfo.badge}`}
                          >
                            {roleInfo.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                            />
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Note */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            User accounts are separate from Employee records, but should be linked to an employee for access and ownership.
          </div>
        </div>
      </div>

      {/* RIGHT SLIDE-IN PANEL (40% width) */}
      {isPanelOpen && (
        <div className="w-full lg:w-2/5 bg-white border-l border-gray-200 shadow-xl flex flex-col h-full overflow-y-auto">
          {/* Panel Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {panelMode === 'CREATE' ? 'Create User' : 'Edit User Access'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {panelMode === 'CREATE'
                  ? 'Provision a new login account'
                  : `Managing access for ${formData.email}`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClosePanel}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Panel Form */}
          <form onSubmit={handleFormSubmit} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Linked Employee Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Link to Employee
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => {
                    const empId = e.target.value
                    setFormData((prev) => {
                      const emp = employees.find((x) => x.id === empId)
                      return {
                        ...prev,
                        employeeId: empId,
                        // auto-populate email if creating new user
                        ...(panelMode === 'CREATE' && emp?.email && !prev.email
                          ? { email: emp.email }
                          : {}),
                      }
                    })
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
                >
                  <option value="">-- No linked employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.employeeNumber}] {emp.firstName} {emp.lastName}{' '}
                      {emp.department?.name ? `— ${emp.department.name}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-500">
                  Linking connects this login to an employee record.
                </p>
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled={panelMode === 'EDIT'}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    if (formErrors.email) setFormErrors({ ...formErrors, email: null })
                  }}
                  placeholder="name@company.com"
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    formErrors.email ? 'border-rose-400 ring-1 ring-rose-400' : 'border-gray-200'
                  } rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-100 disabled:text-gray-500 transition`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field (Only in CREATE mode) */}
              {panelMode === 'CREATE' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value })
                      if (formErrors.password) setFormErrors({ ...formErrors, password: null })
                    }}
                    placeholder="Password@123"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-mono"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Default password: <code className="bg-gray-100 px-1 rounded">Password@123</code> (can be overridden)
                  </p>
                </div>
              )}

              {/* Roles: Radio Buttons */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  System Role <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {ROLES_LIST.map((r) => {
                    const isSelf = selectedUser?.id === currentUserId
                    const disabledRoleChange = isSelf && r.value !== formData.role

                    return (
                      <label
                        key={r.value}
                        className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                          formData.role === r.value
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                            : 'border-gray-200 hover:bg-gray-50'
                        } ${disabledRoleChange ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="role"
                            value={r.value}
                            disabled={disabledRoleChange}
                            checked={formData.role === r.value}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="text-xs font-semibold text-gray-900 block">
                              {r.label}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {r.value === 'ADMIN' && 'Full system administrator'}
                              {r.value === 'HR_PAYROLL_MANAGER' && 'Execute payruns and approve payroll'}
                              {r.value === 'HR_PAYROLL_USER' && 'Review payroll and inspect payslips'}
                              {r.value === 'HR_MANAGER' && 'Manage employees and approvals'}
                              {r.value === 'EMPLOYEE' && 'Standard self-service employee portal'}
                            </span>
                          </div>
                        </div>

                        {formData.role === r.value && (
                          <Check size={16} className="text-indigo-600 shrink-0" />
                        )}
                      </label>
                    )
                  })}
                </div>
                {selectedUser?.id === currentUserId && (
                  <p className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle size={14} />
                    You cannot change your own administrator role.
                  </p>
                )}
              </div>

              {/* Account Status Switch */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">
                      Account Status
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {formData.isActive
                        ? 'User can log in to the workspace'
                        : 'User is locked out from signing in'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.isActive ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="pt-6 border-t border-gray-200 flex items-center gap-3">
              <button
                type="button"
                onClick={handleClosePanel}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>
                    {panelMode === 'CREATE' ? 'Create User' : 'Save Access'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
