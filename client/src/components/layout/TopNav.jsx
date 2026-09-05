import { useLocation } from 'react-router-dom'
import { Bell, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getInitials } from '../../utils/formatters'

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/contracts': 'Contracts',
  '/working-schedules': 'Working Schedules',
  '/attendance': 'Attendance',
  '/time-off/types': 'Time Off Types',
  '/time-off/allocations': 'Allocations',
  '/time-off/requests': 'Time Off Requests',
  '/payroll/salary-structures': 'Salary Structures',
  '/payroll/salary-rules': 'Salary Rules',
  '/payroll/payruns': 'Payruns',
  '/payroll/payruns/new': 'New Payrun',
  '/payroll/payslips': 'Payslips',
  '/reports/dashboard': 'Payroll Dashboard',
  '/users': 'User Management',
}

const roleBadges = {
  ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
  HR_MANAGER: 'bg-blue-50 text-blue-700 border-blue-200',
  HR_PAYROLL_MANAGER: 'bg-purple-50 text-purple-700 border-purple-200',
  HR_PAYROLL_USER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  EMPLOYEE: 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function TopNav() {
  const location = useLocation()
  const { user } = useAuthStore()

  const title = routeTitles[location.pathname] || 'PeoplePay360'

  const pathParts = location.pathname.split('/').filter(Boolean)
  const breadcrumb = pathParts.map((part) =>
    part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
  )

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email?.split('@')[0] || 'User'

  const role = user?.role || 'EMPLOYEE'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
          <span>Home</span>
          {breadcrumb.map((crumb, idx) => (
            <span key={crumb} className="flex items-center gap-1.5">
              <ChevronRight size={12} className="text-gray-400" />
              <span className={idx === breadcrumb.length - 1 ? 'font-medium text-gray-700' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
        <h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell stub */}
        <button
          type="button"
          onClick={() => toast('No new notifications')}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition cursor-pointer"
          title="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            {getInitials(displayName)}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-gray-900 leading-tight">
              {displayName}
            </p>
            <span
              className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                roleBadges[role] || 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {role.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
