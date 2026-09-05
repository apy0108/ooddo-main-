import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
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
        rememberMe: true,
      })

      const { accessToken, user } = res.data.data
      localStorage.setItem('accessToken', accessToken)
      setAuth(user, accessToken)

      toast.success(`Welcome back, ${user.employee?.firstName || user.email}!`)

      const redirectPath = ROLE_REDIRECTS[user.role] || '/dashboard'
      navigate(redirectPath, { replace: true })
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to sign in. Please check your credentials.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-zinc-100 flex items-center justify-center p-4 selection:bg-blue-500/30 selection:text-blue-200 font-sans">
      <div className="w-full max-w-md bg-[#12151c] rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden">
        {/* Card Header Tab */}
        <div className="px-6 py-4 border-b border-zinc-800/70 bg-[#161a23]">
          <h2 className="text-sm font-semibold text-zinc-200 tracking-wide">
            HR Portal
          </h2>
        </div>

        {/* Card Body */}
        <div className="p-7 sm:p-8">
          {/* Welcome Text */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Sign in to continue to your workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Work Email */}
            <div>
              <label className="block text-xs text-zinc-300 mb-1.5 font-medium">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }))
                }}
                placeholder="name@company.com"
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#0e1017] border ${
                  errors.email
                    ? 'border-red-500/80 focus:ring-red-500/30'
                    : 'border-zinc-800 focus:border-blue-500 focus:ring-blue-500/20'
                } text-white placeholder-zinc-500 text-sm outline-none transition focus:ring-2`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-zinc-300 mb-1.5 font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }))
                  }}
                  placeholder="••••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-lg bg-[#0e1017] border pr-10 ${
                    errors.password
                      ? 'border-red-500/80 focus:ring-red-500/30'
                      : 'border-zinc-800 focus:border-blue-500 focus:ring-blue-500/20'
                  } text-white placeholder-zinc-500 text-sm outline-none transition focus:ring-2`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400 font-medium">{errors.password}</p>
              )}
              {/* Forgot password link below input */}
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-400 hover:text-blue-300 transition font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#4b82f6] hover:bg-[#3b74e8] active:bg-[#2b64d8] text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Thin horizontal divider */}
          <div className="border-t border-zinc-800/80 my-7" />

          {/* Bottom notices */}
          <div className="space-y-5 text-center">
            <p className="text-xs text-zinc-400">
              Accounts are created by an administrator.
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed px-2">
              After sign-in, show only the modules and actions allowed by the user's assigned role.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
