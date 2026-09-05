import { useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  // Password strength calculation: 4 criteria
  const strengthScore = useMemo(() => {
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    return score
  }, [password])

  const strengthLabel = useMemo(() => {
    switch (strengthScore) {
      case 1:
        return { text: 'Weak', color: 'text-red-400', bar: 'bg-red-500' }
      case 2:
        return { text: 'Fair', color: 'text-amber-400', bar: 'bg-amber-500' }
      case 3:
        return { text: 'Good', color: 'text-blue-400', bar: 'bg-blue-500' }
      case 4:
        return { text: 'Strong', color: 'text-emerald-400', bar: 'bg-emerald-500' }
      default:
        return { text: 'Very Weak', color: 'text-zinc-500', bar: 'bg-zinc-700' }
    }
  }, [strengthScore])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      setError('Invalid or missing reset token. Please request a new link.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const res = await api.post('/auth/reset-password', {
        token,
        password,
      })

      setIsSuccess(true)
      toast.success(res.data?.message || 'Password reset successfully!')

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reset password. Link may be expired.'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
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
          {!token ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 mb-4 border border-red-500/20">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h2>
              <p className="text-sm text-zinc-400 mb-6">
                This password reset link is invalid or incomplete. Please request a new link.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
              >
                Request New Link
              </Link>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Password Updated!</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Your password has been successfully reset. Redirecting you to sign in...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
              >
                <span>Go to Sign In</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3.5 shadow-inner">
                  <KeyRound size={30} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Set new password</h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 text-white placeholder-zinc-500 text-sm outline-none transition focus:ring-2 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Strength:</span>
                      <span className={`font-semibold ${strengthLabel.color}`}>
                        {strengthLabel.text}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= seg ? strengthLabel.bar : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 text-white placeholder-zinc-500 text-sm outline-none transition focus:ring-2 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-zinc-800/80 bg-[#11131a]/80 backdrop-blur fixed bottom-0 left-0 right-0 z-20 text-[11px] text-zinc-500 flex flex-col md:flex-row items-center justify-between px-6 gap-2">
        <div>© 2026 PeoplePay360 Technologies Inc. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Security & Compliance</span>
        </div>
      </footer>
    </div>
  )
}
