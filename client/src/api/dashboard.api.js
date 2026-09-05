import api from './axios'

const b = (filters = {}) => ({
  params: {
    period: filters?.period || '',
    departmentId: filters?.departmentId || '',
    employeeType: filters?.employeeType || '',
    company: filters?.company || '',
  },
})

export const getFilterOptions = () => api.get('/dashboard/filter-options')
export const getSummaryCards = (filters) => api.get('/dashboard/summary', b(filters))
export const getSalaryByDept = (filters) => api.get('/dashboard/salary-by-dept', b(filters))
export const getSalaryTrend = (filters) => api.get('/dashboard/salary-trend', b(filters))
export const getPayslipStatus = (filters) => api.get('/dashboard/payslip-status', b(filters))
export const getAttendanceOverview = (f) => api.get('/dashboard/attendance', b(f))
export const getTimeOffOverview = (filters) => api.get('/dashboard/time-off', b(filters))
export const getDeptOverview = (filters) => api.get('/dashboard/departments', b(filters))
