import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Filter,
  Sliders,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { getRules, getStructures } from '../../api/salaryStructure.api'
import { formatINR } from '../../utils/formatters'

const CATEGORY_BADGES = {
  BASIC: 'bg-blue-50 text-blue-700 border-blue-200',
  ALLOWANCE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  GROSS: 'bg-purple-50 text-purple-700 border-purple-200',
  DEDUCTION: 'bg-red-50 text-red-700 border-red-200',
  NET: 'bg-amber-50 text-amber-700 border-amber-200',
}

const AMOUNT_TYPE_LABELS = {
  CONTRACT_WAGE: 'Contract Wage',
  FIXED: 'Fixed',
  PERCENTAGE: 'Percentage',
  COMPUTED: 'Computed',
}

export default function SalaryRules() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedStructureId, setSelectedStructureId] = useState('')

  // Fetch all structures for filter dropdown
  const { data: structuresRes } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: () => getStructures(),
  })
  const structures = structuresRes?.data?.data || structuresRes?.data || []

  // Fetch rules
  const { data: rulesRes, isLoading, error } = useQuery({
    queryKey: ['salary-rules', selectedStructureId],
    queryFn: () => getRules(selectedStructureId ? { structureId: selectedStructureId } : {}),
  })
  const rules = rulesRes?.data?.data || rulesRes?.data || []

  const filteredRules = rules.filter((rule) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      rule.name.toLowerCase().includes(q) ||
      rule.code.toLowerCase().includes(q) ||
      (rule.structure?.name && rule.structure.name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#205493]/10 text-[#205493] flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Salary Rules</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">All rules across all salary structures</p>
        </div>
      </div>

      {/* ── Filter / Search Bar ── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rules by name, code or structure..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20 transition"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={15} className="text-gray-400" />
            <select
              value={selectedStructureId}
              onChange={(e) => setSelectedStructureId(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium outline-none focus:bg-white focus:border-[#205493] cursor-pointer"
            >
              <option value="">All Structures</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 font-medium self-end sm:self-center">
          Showing <span className="font-semibold text-gray-800">{filteredRules.length}</span> rules
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-gray-400">Loading salary rules...</div>
        ) : error ? (
          <div className="py-16 text-center text-xs text-red-500 flex items-center justify-center gap-2">
            <ShieldAlert size={16} />
            <span>Failed to load rules: {error.message}</span>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-gray-700">No salary rules found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search || selectedStructureId
                ? 'Try clearing the filter or search query.'
                : 'No rules configured in the system.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Structure</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Seq</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRules.map((rule) => {
                  let valueDisplay = 'Auto'
                  if (rule.amountType === 'FIXED') {
                    valueDisplay = formatINR(rule.amount || 0)
                  } else if (rule.amountType === 'PERCENTAGE') {
                    valueDisplay = `${rule.percentage}% of ${rule.percentageBase || 'Basic'}`
                  } else if (rule.amountType === 'CONTRACT_WAGE') {
                    valueDisplay = '= Contract Wage'
                  } else if (rule.amountType === 'COMPUTED') {
                    valueDisplay = 'Auto-calculated'
                  }

                  const parentStructureId = rule.structureId || rule.structure?.id

                  return (
                    <tr
                      key={rule.id}
                      onClick={() => parentStructureId && navigate(`/payroll/structures/${parentStructureId}`)}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-gray-900 group-hover:text-[#205493] transition">
                        {rule.name}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                          {rule.code}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-700">
                        {rule.structure?.name || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            CATEGORY_BADGES[rule.category] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rule.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {AMOUNT_TYPE_LABELS[rule.amountType] || rule.amountType}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-800">{valueDisplay}</td>

                      <td className="py-3.5 px-4 font-semibold text-gray-500">#{rule.sequence}</td>

                      <td className="py-3.5 px-4">
                        {rule.active ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center text-xs font-semibold text-[#205493] group-hover:translate-x-0.5 transition gap-1">
                          Edit <ArrowRight size={13} />
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
          <strong className="font-semibold text-[#205493]">Useful note:</strong> Rules are managed inside their parent structure. Click a rule row to open its parent structure and edit or reorder rules.
        </p>
      </div>
    </div>
  )
}
