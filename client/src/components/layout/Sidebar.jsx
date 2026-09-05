import { NavLink, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Clock,
  Settings,
  PieChart,
  CalendarOff,
  Layers,
  FileCode,
  PlayCircle,
  Receipt,
  BarChart3,
  UserCog,
  LogOut,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { getInitials } from '../../utils/formatters'

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
    isActive
      ? 'bg-indigo-600 text-white shadow-sm'
      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
  }`

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const role = user?.role || 'EMPLOYEE'
  const isEmployeeOnly = role === 'EMPLOYEE'
  const canAccessPayroll = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(role)
  const isAdmin = role === 'ADMIN'

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Proceed even if server call fails
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

  const initials = getInitials(displayName)

  const roleLabels = {
    ADMIN: 'Admin',
    HR_MANAGER: 'HR Manager',
    HR_PAYROLL_MANAGER: 'Payroll Mgr',
    HR_PAYROLL_USER: 'Payroll User',
    EMPLOYEE: 'Employee',
  }

  return (
    <aside className="w-60 bg-gray-900 flex flex-col h-screen shrink-0 border-r border-gray-800 selection:bg-indigo-500/30">
      {/* Top Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-white font-bold text-sm leading-tight tracking-tight">
            PeoplePay360
          </h1>
          <p className="text-gray-400 text-xs">HR & Payroll</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs">
        {/* MAIN */}
        <div>
          <NavLink to="/dashboard" className={navLinkClass}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
        </div>

        {/* EMPLOYEES (hidden for EMPLOYEE) */}
        {!isEmployeeOnly && (
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Employees
            </p>
            <div className="space-y-1">
              <NavLink to="/employees" className={navLinkClass}>
                <Users size={17} />
                <span>Employees</span>
              </NavLink>
              <NavLink to="/contracts" className={navLinkClass}>
                <FileText size={17} />
                <span>Contracts</span>
              </NavLink>
              <NavLink to="/working-schedules" className={navLinkClass}>
                <Calendar size={17} />
                <span>Working Schedules</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* ATTENDANCE (hidden for EMPLOYEE) */}
        {!isEmployeeOnly && (
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Attendance
            </p>
            <div className="space-y-1">
              <NavLink to="/attendance" className={navLinkClass}>
                <Clock size={17} />
                <span>Attendance</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* TIME OFF (hidden for EMPLOYEE) */}
        {!isEmployeeOnly && (
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Time Off
            </p>
            <div className="space-y-1">
              <NavLink to="/time-off/types" className={navLinkClass}>
                <Settings size={17} />
                <span>Types</span>
              </NavLink>
              <NavLink to="/time-off/allocations" className={navLinkClass}>
                <PieChart size={17} />
                <span>Allocations</span>
              </NavLink>
              <NavLink to="/time-off/requests" className={navLinkClass}>
                <CalendarOff size={17} />
                <span>Requests</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* PAYROLL (only HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN) */}
        {canAccessPayroll && (
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Payroll
            </p>
            <div className="space-y-1">
              <NavLink to="/payroll/salary-structures" className={navLinkClass}>
                <Layers size={17} />
                <span>Salary Structures</span>
              </NavLink>
              <NavLink to="/payroll/salary-rules" className={navLinkClass}>
                <FileCode size={17} />
                <span>Salary Rules</span>
              </NavLink>
              <NavLink to="/payroll/payruns" className={navLinkClass}>
                <PlayCircle size={17} />
                <span>Payruns</span>
              </NavLink>
              <NavLink to="/payroll/payslips" className={navLinkClass}>
                <Receipt size={17} />
                <span>Payslips</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* REPORTS (only HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN) */}
        {canAccessPayroll && (
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Reports
            </p>
            <div className="space-y-1">
              <NavLink to="/reports/dashboard" className={navLinkClass}>
                <BarChart3 size={17} />
                <span>Dashboard</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* ADMIN (only ADMIN) */}
        {isAdmin && (
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Admin
            </p>
            <div className="space-y-1">
              <NavLink to="/users" className={navLinkClass}>
                <UserCog size={17} />
                <span>User Management</span>
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom User Profile Card */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/90 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-inner">
            {initials || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate leading-tight">
              {displayName}
            </p>
            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-indigo-300 font-medium truncate">
              {roleLabels[role] || role}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Sign Out"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition cursor-pointer shrink-0"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
