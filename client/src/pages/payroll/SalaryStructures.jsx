import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { getStructures } from '../../api/salaryStructure.api'
import useAuthStore from '../../store/authStore'

export default function SalaryStructures() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')

  const userRole = user?.role || 'EMPLOYEE'
  const canManage = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(userRole)

  const { data: structuresRes, isLoading, error } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: () => getStructures(),
  })

  const structures = structuresRes?.data?.data || structuresRes?.data || []

  const filteredStructures = structures.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#205493]/10 text-[#205493] flex items-center justify-center">
              <Layers size={18} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Salary Structures</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">List view opened from Payroll → Structures</p>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <Link
              to="/payroll/structures/new"
              id="new-salary-structure-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#205493] hover:bg-[#1a4477] text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus size={14} />
              <span>NEW</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Filter / Search Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search structures by name, code or description..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20 transition"
          />
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Showing <span className="font-semibold text-gray-800">{filteredStructures.length}</span> structures
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-gray-400">Loading salary structures...</div>
        ) : error ? (
          <div className="py-16 text-center text-xs text-red-500 flex items-center justify-center gap-2">
            <ShieldAlert size={16} />
            <span>Failed to load salary structures: {error.message}</span>
          </div>
        ) : filteredStructures.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-gray-700">No salary structures found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Try adjusting your search query.' : 'Click [NEW] to create your first salary structure.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Rules</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStructures.map((structure) => {
                  const ruleCount = structure._count?.rules ?? structure.rules?.length ?? 0
                  return (
                    <tr
                      key={structure.id}
                      onClick={() => navigate(`/payroll/structures/${structure.id}`)}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-gray-900 group-hover:text-[#205493] transition flex items-center gap-2">
                        <Sliders size={14} className="text-[#205493] shrink-0" />
                        <span>{structure.name}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md border border-gray-200">
                          {structure.code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-[#205493] font-semibold rounded-full border border-blue-100 text-[11px]">
                          {ruleCount} {ruleCount === 1 ? 'rule' : 'rules'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                        {structure.description
                          ? structure.description.length > 60
                            ? `${structure.description.slice(0, 60)}...`
                            : structure.description
                          : <span className="text-gray-400 italic">No description</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        {structure.active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center text-xs font-semibold text-[#205493] group-hover:translate-x-0.5 transition gap-1">
                          View <ArrowRight size={13} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer Useful Note ── */}
      <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
        <HelpCircle size={15} className="text-[#205493] shrink-0 mt-0.5" />
        <p>
          <strong className="font-semibold text-[#205493]">Useful note:</strong> A Salary Structure defines the formula used to calculate employee payslips. The actual salary amount comes from each employee's contract.
        </p>
      </div>
    </div>
  )
}
