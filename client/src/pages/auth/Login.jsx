import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  ArrowRight,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
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

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'apy0108@gmail.com', pass: 'Apy@0108', role: 'ADMIN' },
  { label: 'HR Manager', email: 'priya.sharma@company.com', pass: 'Password@123', role: 'HR_MANAGER' },
  { label: 'Payroll Mgr', email: 'rohan.mehta@company.com', pass: 'Password@123', role: 'HR_PAYROLL_MANAGER' },
  { label: 'Employee', email: 'vikram.nair@company.com', pass: 'Password@123', role: 'EMPLOYEE' },
]

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
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
      const message = err.response?.data?.message || 'Failed to sign in. Please check your credentials.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSSO = () => {
    toast.error('SSO is not configured for this workspace')
  }

  const fillDemo = (acc) => {
    setEmail(acc.email)
    setPassword(acc.pass)
    setErrors({})
    toast(`Filled ${acc.label} credentials`, { icon: '🔑' })
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-zinc-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header Bar */}
      <header className="h-12 border-b border-zinc-800/80 bg-[#11131a]/90 backdrop-blur px-6 flex items-center justify-between text-xs fixed top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
            <ShieldCheck size={16} />
          </div>
          <span className="font-semibold text-zinc-200 tracking-tight">PeoplePay360</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">HR & Payroll</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Enterprise Auth v2.4</span>
          <span className="text-zinc-600">•</span>
          <span>SOC2 Type II</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 pt-16 pb-20">
        <div
          className="w-full max-w-md bg-zinc-900/90 backdrop-blur-md rounded-2xl p-8 border border-zinc-800 transition-all"
          style={{
            boxShadow: '0 0 0 1px rgba(79, 70, 229, 0.3), 0 0 40px rgba(79, 70, 229, 0.15)',
          }}
        >
          {/* Top Icon & Titles */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3.5 shadow-inner">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
            <p className="text-sm text-zinc-400 mt-1">Sign in to continue to your workspace.</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Work Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
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
                className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border ${
                  errors.email ? 'border-red-500/80 focus:ring-red-500/30' : 'border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                } text-white placeholder-zinc-500 text-sm outline-none transition focus:ring-2`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition font-medium"
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
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border pr-10 ${
                    errors.password ? 'border-red-500/80 focus:ring-red-500/30' : 'border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } text-white placeholder-zinc-500 text-sm outline-none transition focus:ring-2`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-400 hover:text-zinc-300 transition">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500/30 focus:ring-offset-0 cursor-pointer"
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* OR Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-3 text-zinc-500 font-medium tracking-wider">
                OR
              </span>
            </div>
          </div>

          {/* SSO Button */}
          <button
            type="button"
            onClick={handleSSO}
            className="w-full py-2.5 px-4 rounded-xl border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/60 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Building2 size={16} className="text-zinc-400" />
            <span>Sign In with Company SSO (Okta / Azure AD)</span>
          </button>

          {/* Role Access Notice */}
          <div className="mt-4 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2.5 text-xs text-zinc-400">
            <Lock size={15} className="text-indigo-400 shrink-0 mt-0.5" />
            <span>Access is limited to your assigned role and workspace.</span>
          </div>

          <p className="mt-3 text-[11px] text-center text-zinc-500">
            Accounts are created by an administrator.
          </p>

          {/* Demo Credentials Quick Switcher */}
          <div className="mt-5 pt-4 border-t border-zinc-800/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                Quick Demo Accounts:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 flex items-center justify-between transition group"
                >
                  <span className="font-medium group-hover:text-indigo-300">{acc.label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                    Fill
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-zinc-800/80 bg-[#11131a]/80 backdrop-blur fixed bottom-0 left-0 right-0 z-20 text-[11px] text-zinc-500 flex flex-col md:flex-row items-center justify-between px-6 gap-2">
        <div>© 2026 PeoplePay360 Technologies Inc. All rights reserved.</div>

        <div className="flex items-center gap-4">
          <button type="button" onClick={() => toast('Privacy Policy')} className="hover:text-zinc-300 transition">
            Privacy Policy
          </button>
          <span>•</span>
          <button type="button" onClick={() => toast('Security & SOC2 Info')} className="hover:text-zinc-300 transition">
            Security & Compliance
          </button>
          <span>•</span>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>System Status (Operational)</span>
          </div>
          <span>•</span>
          <button type="button" onClick={() => toast('Support contact: support@peoplepay360.com')} className="hover:text-zinc-300 transition">
            Help & Support
          </button>
        </div>
      </footer>
    </div>
  )
}
