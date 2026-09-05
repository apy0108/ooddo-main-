import { useState, useEffect } from 'react'
import { Search, Bell, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { getInitials } from '../../utils/formatters'

export default function TopNav() {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [checkInTime, setCheckInTime] = useState('09:12 AM')

  useEffect(() => {
    // Current formatted time for the check-in pill
    const now = new Date()
    setCheckInTime(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  }, [])

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email?.split('@')[0] || 'User'

  const initials = getInitials(displayName) || 'U'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-7 shrink-0 z-10 font-sans">
      {/* Search Input Bar */}
      <div className="relative w-96">
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

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Check-In Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-100 text-blue-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Check-In {checkInTime}</span>
        </div>

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
