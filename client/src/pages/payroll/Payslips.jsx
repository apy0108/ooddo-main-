import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Calendar,
  Receipt,
  FileDown,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import useAuthStore from '../../store/authStore'
import { getPayslips, createStandalonePayslip } from '../../api/payslip.api'
import { getStructures } from '../../api/salaryStructure.api'
import { employeesApi } from '../../api/employees.api'
import { formatINR } from '../../utils/formatters'
import Modal from '../../components/ui/Modal'

export default function Payslips() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const isHR = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(
    user?.role
  )

  const [search, setSearch] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('All Periods')
  const [isStandaloneModalOpen, setIsStandaloneModalOpen] = useState(false)

  // Standalone payslip form state
  const [standaloneForm, setStandaloneForm] = useState({
    employeeId: '',
    salaryStructureId: '',
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
  })

  // Fetch payslips with role awareness
  const {
    data: payslips = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['payslips', { period: selectedPeriod, search }],
    queryFn: () => getPayslips({ period: selectedPeriod, search }),
    select: (res) => res.data?.data || res.data || [],
  })

  // Dropdown options for periods
  const periodOptions = useMemo(() => {
    const periods = new Set()
    payslips.forEach((p) => {
      if (p.payrun?.name) {
        periods.add(p.payrun.name)
      } else if (p.periodStart) {
        periods.add(dayjs(p.periodStart).format('MMM YYYY'))
      }
    })
    return ['All Periods', ...Array.from(periods)]
  }, [payslips])

  // Standalone payslip dropdown queries (enabled only when modal opens)
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-for-standalone-payslip'],
    queryFn: () => employeesApi.getAll({ limit: 150 }),
    enabled: isStandaloneModalOpen,
    select: (res) => res.data || [],
  })

  const { data: structures = [] } = useQuery({
    queryKey: ['active-salary-structures-standalone'],
    queryFn: () => getStructures({ active: true }),
    enabled: isStandaloneModalOpen,
    select: (res) => res.data?.data || res.data || [],
  })

  // Standalone mutation
  const standaloneMutation = useMutation({
    mutationFn: createStandalonePayslip,
    onSuccess: (res) => {
      const ps = res.data?.data || res.data
      toast.success('Standalone payslip created and computed')
      queryClient.invalidateQueries({ queryKey: ['payslips'] })
      setIsStandaloneModalOpen(false)
      if (ps?.id) {
        navigate(`/payroll/payslips/${ps.id}`)
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create standalone payslip')
    },
  })

  const handleCreateStandalone = (e) => {
    e.preventDefault()
    if (!standaloneForm.employeeId) {
      toast.error('Please select an employee')
      return
    }
    standaloneMutation.mutate(standaloneForm)
  }

  // Status Badge styling helper
  const getStatusBadge = (st) => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Payslips</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            List view of employee payslips
          </p>
        </div>

        {isHR && (
          <button
            type="button"
            id="new-standalone-payslip-btn"
            onClick={() => setIsStandaloneModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>NEW</span>
          </button>
        )}
      </div>

      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payslips..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/80 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#205493] transition"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-gray-500 font-medium">Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer font-medium text-gray-700"
          >
            {periodOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={24} className="animate-spin text-[#205493]" />
            <span className="text-xs font-medium">Loading payslips...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-red-600">
            Failed to load payslips. Please try again.
          </div>
        ) : payslips.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Receipt size={32} className="mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No payslips found</p>
            <p className="text-xs text-gray-400">
              {search ? 'Try adjusting your search criteria.' : 'No payslip records available yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Employee</th>
                  <th className="p-3.5">Warning</th>
                  <th className="p-3.5">Period</th>
                  <th className="p-3.5 text-right">Basic</th>
                  <th className="p-3.5 text-right">Gross</th>
                  <th className="p-3.5 text-right">Net</th>
                  <th className="p-3.5">Structure</th>
                  <th className="p-3.5 pr-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payslips.map((ps) => {
                  const emp = ps.employee
                  const empName = emp ? `${emp.firstName} ${emp.lastName}` : '—'
                  const hasWarnings = Array.isArray(ps.warnings) && ps.warnings.length > 0
                  const periodStr = `${dayjs(ps.periodStart).format('DD-MMM')} → ${dayjs(
                    ps.periodEnd
                  ).format('DD-MMM')}`
                  const structureName = ps.salaryStructure?.name || 'Regular'

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

                      {/* Period */}
                      <td className="p-3.5 text-gray-600 font-medium">
                        {periodStr}
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

                      {/* Structure */}
                      <td className="p-3.5 text-gray-600">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium">
                          {structureName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 pr-5 text-center">
                        {getStatusBadge(ps.status)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="pt-2 text-center">
        <p className="text-xs text-gray-400 italic">
          Selecting any payslip opens the detailed salary computation and PDF action for that employee
        </p>
      </div>

      {/* Standalone Payslip Modal */}
      {isStandaloneModalOpen && (
        <Modal
          isOpen={isStandaloneModalOpen}
          onClose={() => setIsStandaloneModalOpen(false)}
          title="Create Standalone Payslip"
          subtitle="Generate an individual employee payslip outside normal payruns"
          size="md"
        >
          <form onSubmit={handleCreateStandalone} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={standaloneForm.employeeId}
                onChange={(e) =>
                  setStandaloneForm({ ...standaloneForm, employeeId: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
                required
              >
                <option value="">-- Select Employee --</option>
                {allEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Salary Structure (optional)
              </label>
              <select
                value={standaloneForm.salaryStructureId}
                onChange={(e) =>
                  setStandaloneForm({ ...standaloneForm, salaryStructureId: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer"
              >
                <option value="">-- Use Active Contract Structure --</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={standaloneForm.periodStart}
                  onChange={(e) =>
                    setStandaloneForm({ ...standaloneForm, periodStart: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={standaloneForm.periodEnd}
                  onChange={(e) =>
                    setStandaloneForm({ ...standaloneForm, periodEnd: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={() => setIsStandaloneModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={standaloneMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#205493] hover:bg-[#184275] rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                {standaloneMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                <span>Create & Compute</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
