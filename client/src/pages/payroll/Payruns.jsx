import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react'
import dayjs from 'dayjs'
import useAuthStore from '../../store/authStore'
import { getPayruns } from '../../api/payrun.api'
import NewPayrunModal from './NewPayrunModal'

export default function Payruns() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const isHR = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(
    user?.role
  )
  const canCreate = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(user?.role)

  const [search, setSearch] = useState('')
  const [year, setYear] = useState('2026')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)

  const {
    data: payruns = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['payruns', { search, year }],
    queryFn: () => getPayruns({ search, year }),
    select: (res) => res.data?.data || res.data || [],
  })

  // Status Badge styling helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Paid
          </span>
        )
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Validated
          </span>
        )
      case 'COMPUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Computed
          </span>
        )
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
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
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Payruns</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Payrun view for payroll periods
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            id="new-payrun-btn"
            onClick={() => setIsNewModalOpen(true)}
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
            placeholder="Search payruns..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/80 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#205493] transition"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-gray-500 font-medium">Year:</span>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer font-medium text-gray-700"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* Payrun Cards List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={24} className="animate-spin text-[#205493]" />
          <span className="text-xs font-medium">Loading payroll periods...</span>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-xs text-red-600">
          Failed to load payruns. Please refresh or try again.
        </div>
      ) : payruns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 space-y-2">
          <Layers size={32} className="mx-auto text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">No payruns found</p>
          <p className="text-xs text-gray-400">
            {search ? 'Try adjusting your search criteria.' : 'Create a new payrun to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payruns.map((pr) => {
            const periodStr = `${dayjs(pr.periodStart).format('DD-MMM-YYYY')} → ${dayjs(
              pr.periodEnd
            ).format('DD-MMM-YYYY')}`
            const empCount = pr.employeeCount ?? pr._count?.payslips ?? 0
            const warningCount = pr.warningCount ?? 0

            return (
              <div
                key={pr.id}
                onClick={() => navigate(`/payroll/payruns/${pr.id}`)}
                className="group bg-white hover:bg-slate-50/70 border border-gray-200 hover:border-[#205493]/30 rounded-xl p-4.5 transition-all shadow-2xs hover:shadow-sm cursor-pointer flex items-center justify-between gap-4"
              >
                {/* Left side: Period Name & Date Range */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#205493] transition truncate">
                      {pr.name}
                    </h3>
                    {pr.salaryStructure && (
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                        {pr.salaryStructure.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-normal">
                    {periodStr}
                  </p>
                </div>

                {/* Right side: Employee Count, Status, Warnings & Chevron */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-semibold text-gray-800">
                      {empCount} {empCount === 1 ? 'employee' : 'employees'}
                    </span>
                  </div>

                  <div>{getStatusBadge(pr.status)}</div>

                  <div className="min-w-24 text-right">
                    {warningCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span>{warningCount}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No warnings</span>
                    )}
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-gray-400 group-hover:text-[#205493] group-hover:translate-x-0.5 transition"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer Note */}
      <div className="pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-400 italic">
          Each Payrun represents one payroll period and groups the payslips generated for that period
        </p>
      </div>

      {/* New Payrun Modal */}
      {isNewModalOpen && (
        <NewPayrunModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
        />
      )}
    </div>
  )
}
