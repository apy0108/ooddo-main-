import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Search,
  FileText,
  ArrowLeft,
} from 'lucide-react'
import { contractsApi } from '../../api/contracts.api'
import { employeesApi } from '../../api/employees.api'
import { formatINR, formatDateShort } from '../../utils/formatters'
import CreateContractModal from './CreateContractModal'

const STATUS_DISPLAY = {
  DRAFT:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  ACTIVE:    { label: 'Running',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  EXPIRED:   { label: 'Expired',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-600 border-red-200' },
}

export default function ContractList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const employeeId = searchParams.get('employeeId')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(handler)
  }, [search])

  // Fetch contracts
  const { data: contractsRes, isLoading } = useQuery({
    queryKey: ['contracts', { employeeId, status: statusFilter, search: debouncedSearch }],
    queryFn: () =>
      contractsApi.getAll({
        ...(employeeId && { employeeId }),
        ...(statusFilter && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
      }),
  })

  // Fetch employee name for filtered mode
  const { data: employeeRes } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeesApi.getOne(employeeId),
    enabled: !!employeeId,
  })

  const contracts = contractsRes?.data || []
  const employee = employeeRes?.data

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {employeeId && (
            <Link
              to={`/employees/${employeeId}`}
              className="inline-flex items-center gap-1 text-xs text-[#205493] hover:underline font-semibold mb-1"
            >
              <ArrowLeft size={13} />
              <span>Back to Employee</span>
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {employeeId && employee
              ? `Contracts — ${employee.firstName} ${employee.lastName}`
              : 'Contracts'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            List view of employee contracts
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#184275] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>NEW</span>
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-gray-50/70 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20 transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#205493] cursor-pointer text-gray-600"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Running</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg w-full" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-3">
            <FileText size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900">No contracts found</h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            Create a new contract to get started.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#205493] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#184275] transition cursor-pointer"
          >
            <Plus size={14} />
            <span>New Contract</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Contract</th>
                  {!employeeId && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Start</th>
                  <th className="py-3 px-4">End</th>
                  <th className="py-3 px-4">Wage/Month</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {contracts.map((contract) => {
                  const st = STATUS_DISPLAY[contract.status] || STATUS_DISPLAY.DRAFT
                  const isRunning = contract.status === 'ACTIVE'

                  return (
                    <tr
                      key={contract.id}
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                      className={`hover:bg-blue-50/40 transition cursor-pointer ${
                        isRunning ? 'border-l-4 border-l-emerald-500' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="text-[#205493] font-mono font-medium">
                          {contract.contractRef}
                        </span>
                      </td>
                      {!employeeId && (
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-900">
                            {contract.employee
                              ? `${contract.employee.firstName} ${contract.employee.lastName}`
                              : '—'}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4 text-gray-600">
                        {formatDateShort(contract.startDate)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {contract.endDate ? formatDateShort(contract.endDate) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {formatINR(contract.wage)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom note */}
          <div className="px-4 py-2 border-t border-gray-100">
            <p className="text-[11px] text-gray-400">
              Retain contract history, but make the active Running contract obvious
              because payroll depends on it.
            </p>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      <CreateContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultEmployeeId={employeeId || ''}
      />
    </div>
  )
}
