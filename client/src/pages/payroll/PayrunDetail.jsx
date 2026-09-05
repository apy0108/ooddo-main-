import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calculator,
  CheckCircle2,
  DollarSign,
  Send,
  Loader2,
  ArrowLeft,
  FileDown,
  AlertTriangle,
  Calendar,
  Layers,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import {
  getPayrun,
  computePayrun,
  validatePayrun,
  markPaidPayrun,
  sendPayslips,
} from '../../api/payrun.api'
import { downloadPayslip } from '../../api/payslip.api'
import { formatINR } from '../../utils/formatters'
import useAuthStore from '../../store/authStore'

export default function PayrunDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [downloadingId, setDownloadingId] = useState(null)

  const {
    data: payrun,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['payrun', id],
    queryFn: () => getPayrun(id),
    select: (res) => res.data?.data || res.data,
  })

  // Compute Mutation
  const computeMutation = useMutation({
    mutationFn: () => computePayrun(id),
    onSuccess: () => {
      toast.success('All payslips computed')
      queryClient.invalidateQueries({ queryKey: ['payrun', id] })
      queryClient.invalidateQueries({ queryKey: ['payruns'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to compute payslips')
    },
  })

  // Validate Mutation
  const validateMutation = useMutation({
    mutationFn: () => validatePayrun(id),
    onSuccess: () => {
      toast.success('Payrun validated successfully')
      queryClient.invalidateQueries({ queryKey: ['payrun', id] })
      queryClient.invalidateQueries({ queryKey: ['payruns'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to validate payrun')
    },
  })

  // Mark Paid Mutation
  const markPaidMutation = useMutation({
    mutationFn: () => markPaidPayrun(id),
    onSuccess: () => {
      toast.success('Payrun marked as PAID')
      queryClient.invalidateQueries({ queryKey: ['payrun', id] })
      queryClient.invalidateQueries({ queryKey: ['payruns'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to mark payrun as paid')
    },
  })

  // Send Payslips Mutation
  const sendMutation = useMutation({
    mutationFn: () => sendPayslips(id),
    onSuccess: (res) => {
      const sentCount = res.data?.data?.sent ?? res.data?.sent ?? payrun?.payslips?.length ?? 0
      toast.success(`Payslips sent to ${sentCount} employees`)
      queryClient.invalidateQueries({ queryKey: ['payrun', id] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send payslip emails')
    },
  })

  // Handlers with dialog confirmation
  const handleValidate = () => {
    const hasDraft = payrun?.payslips?.some((p) => p.status === 'DRAFT')
    if (hasDraft) {
      toast.error('Compute all payslips first')
      return
    }
    validateMutation.mutate()
  }

  const handleMarkPaid = () => {
    if (window.confirm('Mark this payrun as PAID? This cannot be undone.')) {
      markPaidMutation.mutate()
    }
  }

  const handleSendPayslips = () => {
    const count = payrun?.payslips?.length || 0
    if (window.confirm(`Send payslip emails to all ${count} employees?`)) {
      toast.loading('Sending payslips...', { id: 'sending-payslips' })
      sendMutation.mutate(undefined, {
        onSettled: () => toast.dismiss('sending-payslips'),
      })
    }
  }

  const handleDownloadPdf = async (e, payslip) => {
    e.stopPropagation()
    try {
      setDownloadingId(payslip.id)
      const res = await downloadPayslip(payslip.id)
      const empName = `${payslip.employee?.firstName || ''}_${payslip.employee?.lastName || ''}`
      const filename = `Payslip_${empName}_${payrun?.name || 'period'}.pdf`.replace(/\s+/g, '_')

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error('Failed to download PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Loader2 size={24} className="animate-spin text-[#205493]" />
        <span className="text-xs font-medium">Loading payrun details...</span>
      </div>
    )
  }

  if (isError || !payrun) {
    return (
      <div className="p-7 max-w-7xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-xs text-red-600">
          Payrun not found or failed to load.
        </div>
        <button
          type="button"
          onClick={() => navigate('/payroll/payruns')}
          className="inline-flex items-center gap-1.5 text-xs text-[#205493] font-semibold hover:underline"
        >
          <ArrowLeft size={14} /> Back to Payruns
        </button>
      </div>
    )
  }

  const status = payrun.status
  const isDraft = status === 'DRAFT'
  const isComputed = status === 'COMPUTED'
  const isValidated = status === 'VALIDATED'
  const isPaid = status === 'PAID'

  // Button enabling rules:
  // DRAFT: [COMPUTE] enabled, others disabled
  // COMPUTED: [COMPUTE] enabled, [VALIDATE] enabled, others disabled
  // VALIDATED: [MARK PAID] enabled, [SEND PAYSLIPS] enabled
  // PAID: all disabled (read-only) except [SEND PAYSLIPS] still enabled
  const canCompute = isDraft || isComputed
  const canValidate = isComputed
  const canMarkPaid = isValidated
  const canSendPayslips = isValidated || isPaid

  // Status Badge styling helper
  const getPayslipStatusBadge = (st) => {
    switch (st) {
      case 'PAID':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Paid
          </span>
        )
      case 'DONE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Done
          </span>
        )
      case 'COMPUTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Computed
          </span>
        )
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Draft
          </span>
        )
    }
  }

  return (
    <div className="p-7 max-w-7xl mx-auto space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/payroll/payruns')}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#205493] font-medium transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Payruns</span>
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-xs font-semibold text-gray-800">{payrun.name}</span>
      </div>

      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Payrun / {payrun.name}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isValidated
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : isComputed
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Open one Payrun to compute and manage its payslips
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* COMPUTE button */}
          <button
            type="button"
            id="payrun-compute-btn"
            onClick={() => computeMutation.mutate()}
            disabled={!canCompute || computeMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition shadow-2xs ${
              canCompute
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
          >
            {computeMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Calculator size={14} />
            )}
            <span>COMPUTE</span>
          </button>

          {/* VALIDATE button */}
          <button
            type="button"
            id="payrun-validate-btn"
            onClick={handleValidate}
            disabled={!canValidate || validateMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition shadow-2xs ${
              canValidate
                ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
          >
            {validateMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            <span>VALIDATE</span>
          </button>

          {/* MARK PAID button */}
          <button
            type="button"
            id="payrun-mark-paid-btn"
            onClick={handleMarkPaid}
            disabled={!canMarkPaid || markPaidMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition shadow-2xs ${
              canMarkPaid
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
          >
            {markPaidMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <DollarSign size={14} />
            )}
            <span>MARK PAID</span>
          </button>

          {/* SEND PAYSLIPS button (pink/purple gradient style) */}
          <button
            type="button"
            id="payrun-send-payslips-btn"
            onClick={handleSendPayslips}
            disabled={!canSendPayslips || sendMutation.isPending}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition shadow-2xs ${
              canSendPayslips
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
          >
            {sendMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>SEND PAYSLIPS</span>
          </button>
        </div>
      </div>

      {/* Payrun Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
        <div>
          <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Period Name
          </span>
          <span className="text-sm font-bold text-gray-800 mt-0.5 block">
            {payrun.name}
          </span>
        </div>

        <div>
          <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Salary Structure
          </span>
          <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
            {payrun.salaryStructure?.name} ({payrun.salaryStructure?.code})
          </span>
        </div>

        <div>
          <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Date Range
          </span>
          <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
            {dayjs(payrun.periodStart).format('DD-MMM')} → {dayjs(payrun.periodEnd).format('DD-MMM-YYYY')}
          </span>
        </div>

        <div>
          <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Employees
          </span>
          <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
            {payrun.payslips?.length || 0} enrolled
          </span>
        </div>
      </div>

      {/* Payslips Table Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">
            Payslips in this Payrun
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            {payrun.payslips?.length || 0} total records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
              <tr>
                <th className="p-3.5 pl-5">Employee</th>
                <th className="p-3.5">Warning</th>
                <th className="p-3.5 text-center">Worked</th>
                <th className="p-3.5 text-right">Basic</th>
                <th className="p-3.5 text-right">Gross</th>
                <th className="p-3.5 text-right">Net</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-5 text-center">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrun.payslips?.map((ps) => {
                const emp = ps.employee
                const empName = emp ? `${emp.firstName} ${emp.lastName}` : '—'
                const hasWarnings = Array.isArray(ps.warnings) && ps.warnings.length > 0

                return (
                  <tr
                    key={ps.id}
                    onClick={() => navigate(`/payroll/payslips/${ps.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition"
                  >
                    {/* Employee */}
                    <td className="p-3.5 pl-5">
                      <div className="font-semibold text-gray-900">{empName}</div>
                      {emp?.employeeNumber && (
                        <div className="text-[10px] text-gray-400">{emp.employeeNumber}</div>
                      )}
                    </td>

                    {/* Warning */}
                    <td className="p-3.5">
                      {hasWarnings ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle size={11} className="text-amber-500" />
                          <span>{ps.warnings.join(', ')}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Worked Days */}
                    <td className="p-3.5 text-center font-medium text-gray-700">
                      {ps.workedDays}
                    </td>

                    {/* Basic */}
                    <td className="p-3.5 text-right font-medium text-gray-700">
                      {formatINR(ps.basic)}
                    </td>

                    {/* Gross */}
                    <td className="p-3.5 text-right font-medium text-emerald-600">
                      {formatINR(ps.gross)}
                    </td>

                    {/* Net */}
                    <td className="p-3.5 text-right font-bold text-[#205493]">
                      {formatINR(ps.net)}
                    </td>

                    {/* Status */}
                    <td className="p-3.5 text-center">
                      {getPayslipStatusBadge(ps.status)}
                    </td>

                    {/* PDF Action */}
                    <td className="p-3.5 pr-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadPdf(e, ps)}
                        disabled={downloadingId === ps.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#205493] hover:text-[#184275] bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition cursor-pointer disabled:opacity-50"
                      >
                        {downloadingId === ps.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <FileDown size={12} />
                        )}
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-2 text-center">
        <p className="text-xs text-gray-400 italic">
          Warnings such as missing account data or duplicate payslips should be visible before payroll is finalized
        </p>
      </div>
    </div>
  )
}
