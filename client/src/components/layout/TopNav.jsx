import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  LayoutDashboard,
  CalendarCheck,
  Sliders,
  FileSpreadsheet,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getInitials } from '../../utils/formatters'
import AttendanceWidget from './AttendanceWidget'

export default function TopNav() {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [timeOffOpen, setTimeOffOpen] = useState(false)
  const timeOffDropdownRef = useRef(null)

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email?.split('@')[0] || 'User'

  const initials = getInitials(displayName) || 'U'

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (timeOffDropdownRef.current && !timeOffDropdownRef.current.contains(e.target)) {
        setTimeOffOpen(false)
      }
    }
    if (timeOffOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [timeOffOpen])

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-7 shrink-0 z-10 font-sans">
      {/* Search Input Bar & Time Off Dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative w-80">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees, payroll batches, or tasks..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20 transition"
          />
        </div>

        {/* Time Off ▼ Dropdown Menu */}
        <div className="relative" ref={timeOffDropdownRef}>
          <button
            type="button"
            id="topnav-time-off-dropdown-btn"
            onClick={() => setTimeOffOpen(!timeOffOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer border border-gray-200/80 bg-gray-50/60 shadow-2xs"
          >
            <span>Time Off</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-150 ${timeOffOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {timeOffOpen && (
            <div
              id="topnav-time-off-dropdown-menu"
              className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
            >
              <Link
                to="/time-off/dashboard"
                onClick={() => setTimeOffOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-[#205493] transition"
              >
                <LayoutDashboard size={14} className="text-[#205493]" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/time-off/requests"
                onClick={() => setTimeOffOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-[#205493] transition"
              >
                <CalendarCheck size={14} className="text-[#205493]" />
                <span>Time offs</span>
              </Link>
              <Link
                to="/time-off/types"
                onClick={() => setTimeOffOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-[#205493] transition"
              >
                <Sliders size={14} className="text-[#205493]" />
                <span>Time Off Types</span>
              </Link>
              <Link
                to="/time-off/allocations"
                onClick={() => setTimeOffOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-[#205493] transition"
              >
                <FileSpreadsheet size={14} className="text-[#205493]" />
                <span>Allocations</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Attendance Widget Pill & Popup */}
        <AttendanceWidget />

        {/* Bell Icon */}
        <button
          type="button"
          onClick={() => toast('No new notifications')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          title="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* Help Circle Icon */}
        <button
          type="button"
          onClick={() => toast('PeoplePay360 Support: support@peoplepay360.com')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          title="Help & Support"
        >
          <HelpCircle size={18} />
        </button>

        {/* User Circular Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-[#1e4e8c] text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer ml-1"
          title={displayName}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
