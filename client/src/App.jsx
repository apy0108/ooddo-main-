import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Users from './pages/admin/Users'
import EmployeeList from './pages/employees/EmployeeList'
import EmployeeDetail from './pages/employees/EmployeeDetail'
import WorkingScheduleList from './pages/workingSchedules/WorkingScheduleList'
import WorkingScheduleForm from './pages/workingSchedules/WorkingScheduleForm'
import ContractList from './pages/contracts/ContractList'
import ContractDetail from './pages/contracts/ContractDetail'
import AttendanceList from './pages/attendance/AttendanceList'
import AttendanceDetail from './pages/attendance/AttendanceDetail'
import TimeOffDashboard from './pages/timeOff/TimeOffDashboard'
import TimeOffTypes from './pages/timeOff/TimeOffTypes'
import TimeOffTypeForm from './pages/timeOff/TimeOffTypeForm'
import Allocations from './pages/timeOff/Allocations'
import AllocationForm from './pages/timeOff/AllocationForm'
import TimeOffRequests from './pages/timeOff/TimeOffRequests'
import TimeOffRequestForm from './pages/timeOff/TimeOffRequestForm'
import SalaryStructures from './pages/payroll/SalaryStructures'
import SalaryStructureForm from './pages/payroll/SalaryStructureForm'
import SalaryRules from './pages/payroll/SalaryRules'
import Payruns from './pages/payroll/Payruns'
import PayrunDetail from './pages/payroll/PayrunDetail'
import Payslips from './pages/payroll/Payslips'
import PayslipDetail from './pages/payroll/PayslipDetail'
import ComingSoon from './pages/ComingSoon'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/layout/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected App Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<ComingSoon title="Dashboard" />} />

            {/* Admin Only */}
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Users />
                </ProtectedRoute>
              }
            />

            {/* Employee & HR Routes */}
            <Route
              path="employees"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <EmployeeList />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <EmployeeDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="contracts"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ContractList />
                </ProtectedRoute>
              }
            />
            <Route
              path="contracts/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ContractDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="working-schedules"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <WorkingScheduleList />
                </ProtectedRoute>
              }
            />
            <Route
              path="working-schedules/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <WorkingScheduleForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="working-schedules/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <WorkingScheduleForm />
                </ProtectedRoute>
              }
            />
            <Route path="attendance" element={<AttendanceList />} />
            <Route path="attendance/:id" element={<AttendanceDetail />} />
            {/* Time Off Module */}
            <Route path="time-off/dashboard" element={<TimeOffDashboard />} />
            <Route path="time-off/types" element={<TimeOffTypes />} />
            <Route path="time-off/types/new" element={<TimeOffTypeForm />} />
            <Route path="time-off/types/:id" element={<TimeOffTypeForm />} />
            <Route path="time-off/allocations" element={<Allocations />} />
            <Route path="time-off/allocations/new" element={<AllocationForm />} />
            <Route path="time-off/allocations/:id" element={<AllocationForm />} />
            <Route path="time-off/requests" element={<TimeOffRequests />} />
            <Route path="time-off/requests/new" element={<TimeOffRequestForm />} />
            <Route path="time-off/requests/:id" element={<TimeOffRequestForm />} />

            {/* Payroll Module (Phase 7) */}
            <Route
              path="payroll/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER']}>
                  <ComingSoon title="Payroll Dashboard" />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/structures"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER']}>
                  <SalaryStructures />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/structures/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_MANAGER']}>
                  <SalaryStructureForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/structures/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER']}>
                  <SalaryStructureForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/rules"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER']}>
                  <SalaryRules />
                </ProtectedRoute>
              }
            />
            <Route path="payroll/salary-structures" element={<Navigate to="/payroll/structures" replace />} />
            <Route path="payroll/salary-rules" element={<Navigate to="/payroll/rules" replace />} />
            <Route
              path="payroll/payruns"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <Payruns />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/payruns/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <PayrunDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/payslips"
              element={<Payslips />}
            />
            <Route
              path="payroll/payslips/:id"
              element={<PayslipDetail />}
            />
            <Route
              path="reports/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Payroll Dashboard" />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
