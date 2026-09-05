import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Landmark,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

const ROLE_REDIRECTS = {
  ADMIN: '/users',
  HR_MANAGER: '/employees',
  HR_PAYROLL_MANAGER: '/payroll/payruns',
  HR_PAYROLL_USER: '/payroll/payslips',
  EMPLOYEE: '/dashboard',
}

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!email.trim()) {
      errs.email = 'Work email is required'
    } else if (!email.includes('@') || !email.includes('.')) {
      errs.email = 'Enter a valid email address'
    }

    if (!password) {
      errs.password = 'Password is required'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
        rememberMe,
      })

      const { accessToken, user } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      setAuth(user, accessToken)

      toast.success(`Welcome back, ${user.employee?.firstName || user.email}!`)

      const redirectPath = ROLE_REDIRECTS[user.role] || '/dashboard'
      navigate(redirectPath, { replace: true })
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to sign in. Please check your credentials.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 flex flex-col items-center justify-center p-4 selection:bg-blue-500/20 selection:text-blue-900 font-sans">
      {/* Top Logo */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[#205493] flex items-center justify-center text-white shadow-sm">
          <Landmark size={18} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold text-gray-900 tracking-tight">PeoplePay</span>
          <span className="text-[11px] font-semibold bg-gray-200/80 text-gray-600 px-1.5 py-0.5 rounded">
            360
          </span>
        </div>
      </div>

      {/* Center Card */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Card Header Strip */}
        <div className="px-7 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-gray-500 font-semibold tracking-wider">
            <Shield size={13} className="text-gray-400" />
            <span>HR ENTERPRISE PORTAL</span>
          </div>
          <span className="text-gray-400 font-mono text-[10px]">v4.18.2</span>
        </div>

        {/* Card Body */}
        <div className="p-7 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Sign in to continue to your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Work Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }))
                }}
                placeholder="s.chen@meridiancorp.com"
                className={`w-full px-3.5 py-2.5 rounded-lg bg-white border ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 focus:border-[#205493] focus:ring-[#205493]/15'
                } text-gray-900 placeholder-gray-400 text-sm outline-none transition focus:ring-2`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#205493] hover:text-[#184275] hover:underline font-medium transition"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }))
                  }}
                  placeholder="••••••••••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-lg bg-white border pr-10 ${
                    errors.password
                      ? 'border-red-500 focus:ring-red-500/20'
                      : 'border-gray-200 focus:border-[#205493] focus:ring-[#205493]/15'
                  } text-gray-900 placeholder-gray-400 text-sm outline-none transition focus:ring-2`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#205493] focus:ring-[#205493]/30 cursor-pointer"
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#205493] hover:bg-[#184275] active:bg-[#13345d] text-white text-sm font-semibold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Admin Managed Notice Box */}
          <div className="mt-5 p-3 rounded-lg bg-gray-50/90 border border-gray-100 text-center">
            <p className="text-[11px] text-gray-500 leading-normal">
              Accounts are created and managed by your organization's system administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Role-Based Access Control Tag & Subtitle */}
      <div className="mt-6 flex flex-col items-center text-center max-w-sm">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100/90 border border-gray-200/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <Shield size={11} className="text-gray-400" />
          <span>ROLE-BASED ACCESS CONTROL</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
          After sign-in, show only the modules and actions allowed by the user's assigned role.
        </p>
      </div>
    </div>
  )
}
