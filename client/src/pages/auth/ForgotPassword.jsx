import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your work email')
      return
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setIsSubmitted(true)
      toast.success('Reset link dispatched')
    } catch (err) {
      if (err.response?.status >= 500) {
        toast.error('Server error sending reset link. Please try again later.')
      } else {
        // Safe UX: still proceed to success
        setIsSubmitted(true)
      }
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
          {!isSubmitted ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3.5 shadow-inner">
                  <Lock size={30} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Forgot your password?
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Enter your work email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSend} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="name@company.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border ${
                        error ? 'border-red-500/80 focus:ring-red-500/30' : 'border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                      } text-white placeholder-zinc-500 text-sm outline-none transition focus:ring-2`}
                    />
                  </div>
                  {error && (
                    <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                We've sent a password reset link to <strong className="text-zinc-200">{email}</strong>.
                The link is valid for 1 hour.
              </p>

              <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-zinc-400 text-left mb-6">
                <p>Didn't receive it? Check your spam folder, or click below to request another email.</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={isLoading}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 cursor-pointer"
                >
                  {isLoading ? 'Resending...' : 'Resend reset link'}
                </button>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition mt-2"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
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
          <span>•</span>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>System Status (Operational)</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
