import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, LogIn, LogOut, Calendar, AlertCircle, CheckCircle2, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import attendanceApi from '../../api/attendance.api'
import useAuthStore from '../../store/authStore'

export default function AttendanceWidget() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [sessionData, setSessionData] = useState({
    isCheckedIn: false,
    session: null,
    scheduledHours: 8,
  })
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const popupRef = useRef(null)

  // Fetch today's session
  const fetchSession = async () => {
    try {
      setLoading(true)
      const res = await attendanceApi.getTodaySession()
      if (res?.success) {
        setSessionData(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch attendance session:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  // Live timer for active session
  useEffect(() => {
    if (!sessionData.isCheckedIn || !sessionData.session?.checkIn) {
      setElapsedSeconds(0)
      return
    }

    const updateTimer = () => {
      const start = new Date(sessionData.session.checkIn).getTime()
      const now = new Date().getTime()
      const diff = Math.max(0, Math.floor((now - start) / 1000))
      setElapsedSeconds(diff)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [sessionData.isCheckedIn, sessionData.session?.checkIn])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Handle Check In
  const handleCheckIn = async () => {
    try {
      setActionLoading(true)
      const res = await attendanceApi.checkIn()
      if (res.success) {
        toast.success('Successfully checked in! Have a productive day.')
        await fetchSession()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to check in. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Check Out
  const handleCheckOut = async () => {
    try {
      setActionLoading(true)
      const res = await attendanceApi.checkOut()
      if (res.success) {
        const worked = res.data?.workedHours || 0
        toast.success(`Checked out successfully! Total worked today: ${worked} hrs`)
        await fetchSession()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to check out.')
    } finally {
      setActionLoading(false)
    }
  }

  // Format seconds to HH:mm:ss
  const formatTimer = (totalSec) => {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const isCheckedIn = sessionData.isCheckedIn
  const session = sessionData.session
  const scheduledHours = sessionData.scheduledHours || 8
  const workedHoursNow = isCheckedIn
    ? Math.round((elapsedSeconds / 3600) * 100) / 100
    : session?.workedHours || 0
  const progressPercent = Math.min(100, Math.round((workedHoursNow / scheduledHours) * 100))

  return (
    <div className="relative" ref={popupRef}>
      {/* TopNav Toggle Button */}
      <button
        type="button"
        id="topnav-attendance-btn"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchSession()
        }}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer shadow-sm ${
          isCheckedIn
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 hover:bg-emerald-100/90'
            : 'bg-rose-50/90 border-rose-200 text-rose-800 hover:bg-rose-100/90'
        }`}
        title="Click to view Attendance & Punch In/Out"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          }`}
        />
        <span>
          {isCheckedIn
            ? `Checked In (${dayjs(session?.checkIn).format('hh:mm A')})`
            : 'Not Checked In'}
        </span>
      </button>

      {/* Interactive Popup Modal */}
      {isOpen && (
        <div
          id="attendance-widget-popup"
          className="absolute right-0 mt-3 w-88 bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#205493] flex items-center justify-center font-bold">
                <Clock size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 leading-none">Attendance</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {dayjs().format('dddd, MMMM D, YYYY')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Status Indicator Card */}
          <div
            className={`p-3.5 rounded-xl border mb-4 ${
              isCheckedIn
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : session?.checkOut
                ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                : 'bg-rose-50/60 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isCheckedIn
                      ? 'bg-emerald-600 animate-pulse'
                      : session?.checkOut
                      ? 'bg-blue-600'
                      : 'bg-rose-500'
                  }`}
                />
                <span>
                  {isCheckedIn
                    ? 'Active Work Session'
                    : session?.checkOut
                    ? 'Completed for Today'
                    : 'Ready to Check In'}
                </span>
              </div>
              {session?.status && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current">
                  {session.status}
                </span>
              )}
            </div>

            {session?.checkIn && (
              <div className="text-[11px] opacity-80 mt-1 flex items-center gap-1.5">
                <span>Check-in: {dayjs(session.checkIn).format('hh:mm:ss A')}</span>
                {session?.checkOut && (
                  <>
                    <span>•</span>
                    <span>Check-out: {dayjs(session.checkOut).format('hh:mm:ss A')}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Live Hours & Progress */}
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">
                  Elapsed
                </span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {isCheckedIn ? formatTimer(elapsedSeconds) : `${workedHoursNow}h`}
                </span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">
                  Scheduled
                </span>
                <span className="text-sm font-bold text-gray-900">{scheduledHours}h</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">
                  Overtime
                </span>
                <span
                  className={`text-sm font-bold ${
                    (session?.overtime || 0) > 0 ? 'text-emerald-600' : 'text-gray-500'
                  }`}
                >
                  {(session?.overtime || 0) > 0 ? `+${session.overtime}h` : '0h'}
                </span>
              </div>
            </div>

            {/* Scheduled Progress Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                <span>Shift Completion</span>
                <span className="font-semibold text-gray-700">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progressPercent >= 100
                      ? 'bg-emerald-500'
                      : isCheckedIn
                      ? 'bg-[#205493]'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isCheckedIn ? (
              <button
                type="button"
                id="widget-checkin-btn"
                disabled={actionLoading}
                onClick={handleCheckIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#205493] hover:bg-[#1a4478] text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <LogIn size={15} />
                <span>{actionLoading ? 'Recording Check In...' : 'Check In Now'}</span>
              </button>
            ) : (
              <button
                type="button"
                id="widget-checkout-btn"
                disabled={actionLoading}
                onClick={handleCheckOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <LogOut size={15} />
                <span>{actionLoading ? 'Recording Check Out...' : 'Check Out Now'}</span>
              </button>
            )}

            <button
              type="button"
              id="widget-view-all-btn"
              onClick={() => {
                setIsOpen(false)
                navigate('/attendance')
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition cursor-pointer"
            >
              <span>View Attendance Log & History</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
