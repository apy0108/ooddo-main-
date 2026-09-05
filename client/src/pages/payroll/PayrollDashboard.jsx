import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Users,
  Building2,
  Briefcase,
  Layers,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import {
  getFilterOptions,
  getSummaryCards,
  getSalaryByDept,
  getSalaryTrend,
  getPayslipStatus,
  getAttendanceOverview,
  getTimeOffOverview,
  getDeptOverview,
} from '../../api/dashboard.api'
import { formatINR, formatLakh, formatINRFull } from '../../utils/formatters'

export default function PayrollDashboard() {
  const [filters, setFilters] = useState({
    period: '',
    departmentId: '',
    employeeType: '',
    company: '',
  })

  // Set default period to current month on mount
  useEffect(() => {
    const now = new Date()
    const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setFilters((prev) => ({ ...prev, period: defaultPeriod }))
  }, [])

  // ── Queries ──
  const { data: filterOptionsRes } = useQuery({
    queryKey: ['dashboard-filter-options'],
    queryFn: getFilterOptions,
    select: (res) => res.data?.data || res.data || {},
  })
  const filterOptions = filterOptionsRes || {}

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboard-summary', filters],
    queryFn: () => getSummaryCards(filters),
    select: (res) => res.data?.data || res.data || {},
    enabled: !!filters.period,
  })

  const { data: deptSalary = [], isLoading: isDeptSalaryLoading } = useQuery({
    queryKey: ['dashboard-dept-salary', filters],
    queryFn: () => getSalaryByDept(filters),
    select: (res) => res.data?.data || res.data || [],
    enabled: !!filters.period,
  })

  const { data: trend = [], isLoading: isTrendLoading } = useQuery({
    queryKey: ['dashboard-trend', filters],
    queryFn: () => getSalaryTrend(filters),
    select: (res) => res.data?.data || res.data || [],
    enabled: !!filters.period,
  })

  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ['dashboard-status', filters],
    queryFn: () => getPayslipStatus(filters),
    select: (res) => res.data?.data || res.data || {},
    enabled: !!filters.period,
  })

  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['dashboard-attendance', filters],
    queryFn: () => getAttendanceOverview(filters),
    select: (res) => res.data?.data || res.data || {},
    enabled: !!filters.period,
  })

  const { data: timeOff = [], isLoading: isTimeOffLoading } = useQuery({
    queryKey: ['dashboard-timeoff', filters],
    queryFn: () => getTimeOffOverview(filters),
    select: (res) => res.data?.data || res.data || [],
    enabled: !!filters.period,
  })

  const { data: deptOverview = [], isLoading: isDeptOverviewLoading } = useQuery({
    queryKey: ['dashboard-dept-overview', filters],
    queryFn: () => getDeptOverview(filters),
    select: (res) => res.data?.data || res.data || [],
    enabled: !!filters.period,
  })

  // Status breakdown calculations
  const statusCounts = statusData?.statusCounts || { PAID: 0, DONE: 0, PENDING: 0, WARNING: 0 }
  const totalStatusCount =
    (statusCounts.PAID || 0) +
    (statusCounts.DONE || 0) +
    (statusCounts.PENDING || 0) +
    (statusCounts.WARNING || 0)

  const paidPct = totalStatusCount > 0 ? ((statusCounts.PAID || 0) / totalStatusCount) * 100 : 0
  const donePct = totalStatusCount > 0 ? ((statusCounts.DONE || 0) / totalStatusCount) * 100 : 0
  const pendingPct = totalStatusCount > 0 ? ((statusCounts.PENDING || 0) / totalStatusCount) * 100 : 0
  const warnPct = totalStatusCount > 0 ? ((statusCounts.WARNING || 0) / totalStatusCount) * 100 : 0

  const alerts = statusData?.alerts || {
    missingBank: 0,
    duplicateWarnings: 0,
    draftsNotValidated: 0,
    expiringContracts: 0,
  }
  const hasAnyAlert =
    alerts.missingBank > 0 ||
    alerts.duplicateWarnings > 0 ||
    alerts.draftsNotValidated > 0 ||
    alerts.expiringContracts > 0

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payroll Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1 max-w-3xl">
            Understand payments, staffing impact, leave patterns, and attendance quality for the selected period.
          </p>
        </div>
      </div>

      {/* ── PART A: Filter Bar (Sticky Top) ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-xl p-3.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Period Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Period
            </label>
            <select
              value={filters.period}
              onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-medium outline-none focus:border-[#205493] focus:bg-white transition"
            >
              {filterOptions.periods?.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters((prev) => ({ ...prev, departmentId: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-medium outline-none focus:border-[#205493] focus:bg-white transition"
            >
              <option value="">All Departments</option>
              {filterOptions.departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Employee Type
            </label>
            <select
              value={filters.employeeType}
              onChange={(e) => setFilters((prev) => ({ ...prev, employeeType: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-medium outline-none focus:border-[#205493] focus:bg-white transition"
            >
              <option value="">All Types</option>
              {filterOptions.employeeTypes?.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Company
            </label>
            <select
              value={filters.company}
              onChange={(e) => setFilters((prev) => ({ ...prev, company: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-medium outline-none focus:border-[#205493] focus:bg-white transition"
            >
              <option value="">All Companies</option>
              {filterOptions.companyList?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── PART B: Summary Cards (5 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Net Salary Paid */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500">Total Net Salary Paid</span>
            {isSummaryLoading ? (
              <div className="animate-pulse bg-gray-200 rounded h-7 w-28 my-2" />
            ) : (
              <div className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight">
                {formatLakh(summary?.totalNetPaid || 0)}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center text-xs font-semibold">
            {summary?.percentChange > 0 ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <TrendingUp size={14} /> +{summary.percentChange}% vs last month
              </span>
            ) : summary?.percentChange < 0 ? (
              <span className="text-red-500 flex items-center gap-1">
                <TrendingDown size={14} /> {summary.percentChange}% vs last month
              </span>
            ) : (
              <span className="text-gray-400">0% vs last month</span>
            )}
          </div>
        </div>

        {/* Card 2: Payslips Generated */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500">Payslips Generated</span>
            {isSummaryLoading ? (
              <div className="animate-pulse bg-gray-200 rounded h-7 w-20 my-2" />
            ) : (
              <div className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight">
                {summary?.totalPayslips || 0}
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-500 font-medium">
            <span className="text-emerald-600 font-semibold">{summary?.paidCount || 0} paid</span>,{' '}
            <span className="text-amber-600 font-semibold">{summary?.pendingCount || 0} pending</span>
          </div>
        </div>

        {/* Card 3: Avg Salary / Employee */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500">Avg Salary / Employee</span>
            {isSummaryLoading ? (
              <div className="animate-pulse bg-gray-200 rounded h-7 w-24 my-2" />
            ) : (
              <div className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight">
                {formatINR(summary?.avgSalary || 0)}
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-400 font-medium">Based on current payrun</div>
        </div>

        {/* Card 4: Approved Time Off Days */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500">Approved Time Off Days</span>
            {isSummaryLoading ? (
              <div className="animate-pulse bg-gray-200 rounded h-7 w-20 my-2" />
            ) : (
              <div className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight">
                {summary?.approvedTimeOff || 0} Days
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-400 font-medium">across selected period</div>
        </div>

        {/* Card 5: Attendance Health */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500">Attendance Health</span>
            {isSummaryLoading ? (
              <div className="animate-pulse bg-gray-200 rounded h-7 w-16 my-2" />
            ) : (
              <div className="text-2xl font-bold text-gray-900 mt-1.5 tracking-tight">
                {summary?.attendanceHealth || 0}%
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-400 font-medium">Present / reviewed records</div>
        </div>
      </div>

      {/* ── PART C: Charts Row (3 Panels) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* C1: Salary Cost by Department (Bar Chart) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Salary Cost by Department</h2>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Source: Payslips + Employee Department</p>
          </div>

          <div className="mt-4 h-[260px] w-full flex items-center justify-center">
            {isDeptSalaryLoading ? (
              <div className="animate-pulse bg-gray-100 rounded-lg h-full w-full flex items-center justify-center text-xs text-gray-400 font-medium">
                Loading chart...
              </div>
            ) : deptSalary.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-10">
                No salary data available for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptSalary} margin={{ top: 25, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={35}
                  />
                  <YAxis
                    tickFormatter={(v) => formatLakh(v)}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                  />
                  <Tooltip
                    formatter={(value) => [formatINRFull(value), 'Net Salary']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="totalSalary" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="totalSalary"
                      position="top"
                      formatter={(v) => formatLakh(v)}
                      style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* C2: Monthly Net Salary Trend (Line Chart) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Monthly Net Salary Trend</h2>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Source: historical Payslips / Payruns</p>
          </div>

          <div className="mt-4 h-[260px] w-full flex items-center justify-center">
            {isTrendLoading ? (
              <div className="animate-pulse bg-gray-100 rounded-lg h-full w-full flex items-center justify-center text-xs text-gray-400 font-medium">
                Loading trend...
              </div>
            ) : trend.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-10">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend} margin={{ top: 20, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis
                    tickFormatter={(v) => formatLakh(v)}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                  />
                  <Tooltip
                    formatter={(v) => [formatINRFull(v), 'Net Salary']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalNet"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={{ fill: '#3B82F6', r: 4, strokeWidth: 1, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* C3: Payslip Status & Payroll Alerts */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Payslip Status & Payroll Alerts</h2>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Source: Payrun + Payslip validation</p>
          </div>

          <div className="mt-4 flex-1 flex flex-col justify-between">
            {/* Status Split Horizontal Bar */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Payslip Status Breakdown</div>
              {isStatusLoading ? (
                <div className="animate-pulse bg-gray-200 rounded h-5 w-full" />
              ) : totalStatusCount === 0 ? (
                <div className="text-xs text-gray-400 py-1">No payslips in selected period</div>
              ) : (
                <>
                  <div className="h-5 w-full bg-gray-100 rounded-md overflow-hidden flex shadow-2xs">
                    {paidPct > 0 && (
                      <div
                        style={{ width: `${paidPct}%` }}
                        className="bg-emerald-500 h-full transition-all duration-300"
                        title={`Paid: ${statusCounts.PAID}`}
                      />
                    )}
                    {donePct > 0 && (
                      <div
                        style={{ width: `${donePct}%` }}
                        className="bg-blue-500 h-full transition-all duration-300"
                        title={`Done: ${statusCounts.DONE}`}
                      />
                    )}
                    {pendingPct > 0 && (
                      <div
                        style={{ width: `${pendingPct}%` }}
                        className="bg-amber-400 h-full transition-all duration-300"
                        title={`Pending: ${statusCounts.PENDING}`}
                      />
                    )}
                    {warnPct > 0 && (
                      <div
                        style={{ width: `${warnPct}%` }}
                        className="bg-rose-500 h-full transition-all duration-300"
                        title={`Warning: ${statusCounts.WARNING}`}
                      />
                    )}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-gray-600 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Paid ({statusCounts.PAID || 0})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      Done ({statusCounts.DONE || 0})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                      Pending ({statusCounts.PENDING || 0})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      Warning ({statusCounts.WARNING || 0})
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Current Alerts List */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-700 mb-2">Current Alerts</div>
              {isStatusLoading ? (
                <div className="space-y-2">
                  <div className="animate-pulse bg-gray-200 rounded h-4 w-full" />
                  <div className="animate-pulse bg-gray-200 rounded h-4 w-3/4" />
                </div>
              ) : !hasAnyAlert ? (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 py-1">
                  <CheckCircle2 size={14} className="text-emerald-500" /> No alerts — all clear ✅
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {alerts.missingBank > 0 && (
                    <li className="text-rose-600 font-medium flex items-center gap-1.5">
                      <span className="text-sm leading-none">🔴</span> {alerts.missingBank} employee
                      {alerts.missingBank > 1 ? 's' : ''} missing bank account
                    </li>
                  )}
                  {alerts.duplicateWarnings > 0 && (
                    <li className="text-orange-600 font-medium flex items-center gap-1.5">
                      <span className="text-sm leading-none">🟠</span> {alerts.duplicateWarnings} duplicate payslip warning
                      {alerts.duplicateWarnings > 1 ? 's' : ''}
                    </li>
                  )}
                  {alerts.draftsNotValidated > 0 && (
                    <li className="text-amber-600 font-medium flex items-center gap-1.5">
                      <span className="text-sm leading-none">🟡</span> {alerts.draftsNotValidated} draft
                      {alerts.draftsNotValidated > 1 ? 's' : ''} still not validated
                    </li>
                  )}
                  {alerts.expiringContracts > 0 && (
                    <li className="text-orange-600 font-medium flex items-center gap-1.5">
                      <span className="text-sm leading-none">🟠</span> {alerts.expiringContracts} contract
                      {alerts.expiringContracts > 1 ? 's' : ''} expiring this month
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── PART D: Bottom Row (3 Panels) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* D1: Attendance Overview */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Attendance Overview</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Source: Attendance</p>
          </div>

          <div className="mt-3 h-[150px] w-full flex items-center justify-center">
            {isAttendanceLoading ? (
              <div className="animate-pulse bg-gray-100 rounded-lg h-full w-full flex items-center justify-center text-xs text-gray-400 font-medium">
                Loading attendance...
              </div>
            ) : attendanceData?.chartData?.length === 0 ? (
              <div className="text-xs text-gray-400">No attendance data</div>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={attendanceData?.chartData || []} barSize={36} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(attendanceData?.chartData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Stats below chart */}
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Missing check-outs:</span>
              <span className="font-semibold text-gray-900">{attendanceData?.stats?.missingCheckouts ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Manual attendance edits:</span>
              <span className="font-semibold text-gray-900">{attendanceData?.stats?.manualEdits ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Attendance coverage:</span>
              <span className="font-semibold text-emerald-600">{attendanceData?.stats?.coverage ?? 0}%</span>
            </div>
          </div>
        </div>

        {/* D2: Time Off Overview */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Time Off Overview</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Source: Time Off Requests + Allocations</p>
          </div>

          <div className="mt-3 flex-1 overflow-x-auto">
            {isTimeOffLoading ? (
              <div className="space-y-2 py-4">
                <div className="animate-pulse bg-gray-200 rounded h-5 w-full" />
                <div className="animate-pulse bg-gray-200 rounded h-5 w-full" />
                <div className="animate-pulse bg-gray-200 rounded h-5 w-full" />
              </div>
            ) : timeOff.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-8">No time off records</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold text-[11px]">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-center">Approved</th>
                    <th className="pb-2 font-medium text-center">Pending</th>
                    <th className="pb-2 font-medium text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {timeOff.map((row) => (
                    <tr key={row.typeName} className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-medium text-gray-900">{row.typeName}</td>
                      <td className="py-2.5 text-center font-medium">
                        {row.approvedDays} {row.unit === 'HOURS' ? 'Hrs' : 'Days'}
                      </td>
                      <td className="py-2.5 text-center font-medium text-amber-600">
                        {row.pending}
                      </td>
                      <td className="py-2.5 text-right font-medium">
                        {row.requiresAllocation ? (
                          <span className="text-emerald-600">
                            {row.remainingBalance} {row.unit === 'HOURS' ? 'Hrs' : 'Days'}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* D3: Department Overview */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Department Overview</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Source: Employee + Contract + Payslip totals</p>
          </div>

          <div className="mt-3 flex-1 overflow-x-auto">
            {isDeptOverviewLoading ? (
              <div className="space-y-2 py-4">
                <div className="animate-pulse bg-gray-200 rounded h-5 w-full" />
                <div className="animate-pulse bg-gray-200 rounded h-5 w-full" />
                <div className="animate-pulse bg-gray-200 rounded h-5 w-full" />
              </div>
            ) : deptOverview.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-8">No department data</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold text-[11px]">
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium text-center">Headcount</th>
                    <th className="pb-2 font-medium text-right">Monthly Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {deptOverview.map((row) => (
                    <tr key={row.department} className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-medium text-gray-900">{row.department}</td>
                      <td className="py-2.5 text-center font-medium">{row.headcount}</td>
                      <td className="py-2.5 text-right font-semibold text-gray-900">
                        {formatLakh(row.monthlySalary)}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="border-t-2 border-gray-200 font-bold text-gray-900 bg-gray-50/60">
                    <td className="py-2.5 pl-1">Total</td>
                    <td className="py-2.5 text-center">
                      {deptOverview.reduce((sum, r) => sum + (r.headcount || 0), 0)}
                    </td>
                    <td className="py-2.5 pr-1 text-right text-[#205493]">
                      {formatLakh(deptOverview.reduce((sum, r) => sum + (r.monthlySalary || 0), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
