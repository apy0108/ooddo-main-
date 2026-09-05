import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Landmark,
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  Wallet,
  Settings,
  UserCheck,
  MoreVertical,
  LogOut,
  FileText,
  CalendarClock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { getInitials } from '../../utils/formatters'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[#1e4e8c] text-white shadow-sm'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const role = user?.role || 'EMPLOYEE'
  const isEmployeeOnly = role === 'EMPLOYEE'
  const canAccessPayroll = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(role)
  const isAdmin = role === 'ADMIN'

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Proceed even if network fails
    } finally {
      localStorage.removeItem('accessToken')
      clearAuth()
      toast.success('Signed out')
      navigate('/login', { replace: true })
    }
  }

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email?.split('@')[0] || 'User'

  const roleLabels = {
    ADMIN: 'Admin',
    HR_MANAGER: 'HR Manager',
    HR_PAYROLL_MANAGER: 'HR Payroll Manager',
    HR_PAYROLL_USER: 'HR Payroll User',
    EMPLOYEE: 'Employee',
  }

  const initials = getInitials(displayName) || 'U'

  return (
    <aside className="w-64 bg-white flex flex-col h-screen shrink-0 border-r border-gray-200 selection:bg-blue-500/20 font-sans">
      {/* Top Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-[#205493] flex items-center justify-center text-white shadow-sm">
          <Landmark size={18} />
        </div>
        <div>
          <h1 className="text-gray-900 font-bold text-sm tracking-tight leading-tight">
            PeoplePay360
          </h1>
          <p className="text-gray-400 text-xs">HR & Payroll</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 text-xs">
        {/* CORE OPERATIONS */}
        <div>
          <p className="px-3 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Core Operations
          </p>
          <div className="space-y-1">
            <NavLink to="/dashboard" className={navLinkClass}>
              <LayoutDashboard size={17} />
              <span>Overview</span>
            </NavLink>

            {!isEmployeeOnly && (
              <>
                <NavLink to="/employees" className={navLinkClass}>
                  <Users size={17} />
                  <span>Employees</span>
                </NavLink>
                <NavLink to="/contracts" className={navLinkClass}>
                  <FileText size={17} />
                  <span>Contracts</span>
                </NavLink>
                <NavLink to="/attendance" className={navLinkClass}>
                  <Clock size={17} />
                  <span>Attendance</span>
                </NavLink>
                <NavLink to="/time-off/requests" className={navLinkClass}>
                  <Calendar size={17} />
                  <span>Time Off</span>
                </NavLink>
              </>
            )}

            {canAccessPayroll && (
              <NavLink to="/payroll/payruns" className={navLinkClass}>
                <Wallet size={17} />
                <span>Payroll</span>
              </NavLink>
            )}
          </div>
        </div>

        {/* ADMINISTRATION */}
        {(!isEmployeeOnly || isAdmin) && (
          <div>
            <p className="px-3 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Administration
            </p>
            <div className="space-y-1">
              <NavLink to="/working-schedules" className={navLinkClass}>
                <CalendarClock size={17} />
                <span>Working Schedules</span>
              </NavLink>

              {isAdmin && (
                <NavLink to="/users" className={navLinkClass}>
                  <UserCheck size={17} />
                  <span>User Management</span>
                </NavLink>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Profile Card */}
      <div className="p-3 border-t border-gray-100 bg-white relative">
        {/* Profile Popover / Dropdown for Sign out */}
        {showProfileMenu && (
          <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 z-30 animate-in fade-in slide-in-from-bottom-2">
            <div className="px-3 py-2 border-b border-gray-100 text-xs">
              <p className="font-semibold text-gray-900">{displayName}</p>
              <p className="text-[11px] text-gray-500 font-mono truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#1e4e8c] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {roleLabels[role] || role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer shrink-0"
            title="Account Options"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
