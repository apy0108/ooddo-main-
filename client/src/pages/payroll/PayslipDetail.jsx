import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calculator,
  Printer,
  DollarSign,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  FileDown,
  Calendar,
  Layers,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import {
  getPayslip,
  computePayslip,
  generatePdf,
  downloadPayslip,
  markPaidPayslip,
} from '../../api/payslip.api'
import { formatINR } from '../../utils/formatters'
import useAuthStore from '../../store/authStore'

export default function PayslipDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const isHR = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(
    user?.role
  )

  const [isPrinting, setIsPrinting] = useState(false)

  const {
    data: payslip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['payslip', id],
    queryFn: () => getPayslip(id),
    select: (res) => res.data?.data || res.data,
  })

  // Compute Mutation
  const computeMutation = useMutation({
    mutationFn: () => computePayslip(id),
    onSuccess: () => {
      toast.success('Payslip computed successfully')
      queryClient.invalidateQueries({ queryKey: ['payslip', id] })
      queryClient.invalidateQueries({ queryKey: ['payslips'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to compute payslip')
    },
  })

  // Mark Paid Mutation
  const markPaidMutation = useMutation({
    mutationFn: () => markPaidPayslip(id),
    onSuccess: () => {
      toast.success('Payslip marked as PAID')
      queryClient.invalidateQueries({ queryKey: ['payslip', id] })
      queryClient.invalidateQueries({ queryKey: ['payslips'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to mark payslip as paid')
    },
  })

  // Print Payslip (PDF generation & download)
  const handlePrintPayslip = async () => {
    try {
      setIsPrinting(true)
      await generatePdf(id)

      const res = await downloadPayslip(id)
      const empName = `${payslip?.employee?.firstName || ''}_${payslip?.employee?.lastName || ''}`
      const period = payslip?.payrun?.name || `${dayjs(payslip?.periodStart).format('MMM_YYYY')}`
      const filename = `Payslip_${empName}_${period}.pdf`.replace(/\s+/g, '_')

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('PDF generated successfully')
    } catch (err) {
      toast.error('Failed to generate PDF payslip')
    } finally {
      setIsPrinting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Loader2 size={24} className="animate-spin text-[#205493]" />
        <span className="text-xs font-medium">Loading payslip details...</span>
      </div>
    )
  }

  if (isError || !payslip) {
    return (
      <div className="p-7 max-w-7xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-xs text-red-600">
          Payslip not found or access denied.
        </div>
        <button
          type="button"
          onClick={() => navigate('/payroll/payslips')}
          className="inline-flex items-center gap-1.5 text-xs text-[#205493] font-semibold hover:underline"
        >
          <ArrowLeft size={14} /> Back to Payslips
        </button>
      </div>
    )
  }

  const emp = payslip.employee
  const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee'
  const periodStr = `${dayjs(payslip.periodStart).format('01-MMM')} → ${dayjs(
    payslip.periodEnd
  ).format('DD-MMM')}`
  const fullPeriod = `${dayjs(payslip.periodStart).format('DD-MMM-YYYY')} → ${dayjs(
    payslip.periodEnd
  ).format('DD-MMM-YYYY')}`

  const status = payslip.status
  const isDraft = status === 'DRAFT'
  const canCompute = isDraft && isHR
  const canMarkPaid = (status === 'COMPUTED' || status === 'DONE') && isHR
  const hasWarnings = Array.isArray(payslip.warnings) && payslip.warnings.length > 0

  // Category badge colors:
  // BASIC=blue, ALLOWANCE=green, GROSS=purple, DEDUCTION=red, NET=yellow/gold
  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'BASIC':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'ALLOWANCE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'GROSS':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'DEDUCTION':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'NET':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Amount color styling:
  // BASIC/ALLOWANCE/GROSS: green ₹{amount}
  // DEDUCTION: red -₹{amount}
  // NET: bold gold ₹{amount}
  const renderAmount = (line) => {
    const isDed = line.category === 'DEDUCTION'
    const isNet = line.category === 'NET'
    const amt = Math.abs(line.amount)

    if (isNet) {
      return (
        <span className="font-bold text-amber-600 text-sm">
          {formatINR(amt)}
        </span>
      )
    }

    if (isDed) {
      return (
        <span className="font-medium text-red-600">
          -{formatINR(amt)}
        </span>
      )
    }

    return (
      <span className="font-medium text-emerald-600">
        {formatINR(amt)}
      </span>
    )
  }

  return (
    <div className="p-7 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/payroll/payslips')}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#205493] font-medium transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Payslips</span>
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-xs text-gray-500 font-medium">{empName}</span>
        <span className="text-gray-300">/</span>
        <span className="text-xs font-semibold text-gray-800">{payslip.payrun?.name || periodStr}</span>
      </div>

      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Payslip / {empName} / {payslip.payrun?.name || periodStr}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                status === 'PAID'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : status === 'DONE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : status === 'COMPUTED'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Detailed salary computation for one employee
          </p>
        </div>

        {/* Action Buttons: [COMPUTE] [MARK PAID] [PRINT PAYSLIP] */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isHR && (
            <button
              type="button"
              id="payslip-compute-btn"
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
          )}

          {isHR && (
            <button
              type="button"
              id="payslip-mark-paid-btn"
              onClick={() => markPaidMutation.mutate()}
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
          )}

          <button
            type="button"
            id="payslip-print-btn"
            onClick={handlePrintPayslip}
            disabled={isPrinting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#205493] hover:bg-[#184275] rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-60"
          >
            {isPrinting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Printer size={14} />
            )}
            <span>PRINT PAYSLIP</span>
          </button>
        </div>
      </div>

      {/* Warnings Banner if detected */}
      {hasWarnings && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-xs font-semibold text-amber-800">
            Warning detected: {payslip.warnings.join(', ')}
          </p>
        </div>
      )}

      {/* Form Fields: Two Column Read-Only Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {/* Left Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Employee:</span>
              <span className="text-xs font-bold text-gray-900">
                {empName}
                {emp?.employeeNumber && (
                  <span className="text-gray-400 font-normal ml-1">({emp.employeeNumber})</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Salary Structure:</span>
              <span className="text-xs font-medium text-gray-800">
                {payslip.salaryStructure?.name} ({payslip.salaryStructure?.code})
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Pay Run:</span>
              <span className="text-xs font-medium text-gray-800">
                {payslip.payrun?.name || 'Standard Payrun'}
              </span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Period:</span>
              <span className="text-xs font-medium text-gray-800">{fullPeriod}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Status:</span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {status}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Days:</span>
              <span className="text-xs font-bold text-gray-900">
                {payslip.workedDays} / {payslip.totalDays || 22}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Computation Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4.5 border-b border-gray-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#205493] tracking-wide uppercase">
            Salary Computation
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            {payslip.lines?.length || 0} calculated rules
          </span>
        </div>

        {(!payslip.lines || payslip.lines.length === 0) ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Calculator size={32} className="mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">Not yet computed</p>
            <p className="text-xs text-gray-400">
              Click the [COMPUTE] button above to calculate salary lines.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Rule</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 pr-5 text-right font-mono">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payslip.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/70 transition">
                    {/* Rule name */}
                    <td className="p-3.5 pl-5 font-semibold text-gray-900">
                      {line.ruleName}
                    </td>

                    {/* Category badge */}
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadge(
                          line.category
                        )}`}
                      >
                        {line.category}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="p-3.5 text-right">
                      {renderAmount(line)}
                    </td>

                    {/* Monospace Code */}
                    <td className="p-3.5 pr-5 text-right font-mono text-[11px] font-semibold text-gray-500">
                      {line.ruleCode}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Card Below Table */}
        <div className="p-5 bg-gray-50/70 border-t border-gray-200 flex flex-col items-end gap-2">
          <div className="w-full max-w-sm space-y-2 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-600">Gross Salary:</span>
              <span className="font-bold text-emerald-600">{formatINR(payslip.gross)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-600">Total Deductions:</span>
              <span className="font-bold text-red-600">-{formatINR(payslip.deductions)}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900">NET SALARY:</span>
              <span className="text-base font-extrabold text-amber-600">
                {formatINR(payslip.net)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-2 text-center">
        <p className="text-xs text-gray-400 italic">
          The Print action generates the employee payslip as PDF; that PDF can be sent from the parent Payrun
        </p>
      </div>
    </div>
  )
}
