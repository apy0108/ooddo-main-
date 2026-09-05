import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Users from './pages/admin/Users'
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
                  <ComingSoon title="Employees" />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Employee Detail" />
                </ProtectedRoute>
              }
            />
            <Route
              path="contracts"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Contracts" />
                </ProtectedRoute>
              }
            />
            <Route
              path="working-schedules"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Working Schedules" />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Attendance" />
                </ProtectedRoute>
              }
            />
            <Route
              path="time-off/types"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Time Off Types" />
                </ProtectedRoute>
              }
            />
            <Route
              path="time-off/allocations"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Allocations" />
                </ProtectedRoute>
              }
            />
            <Route
              path="time-off/requests"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Time Off Requests" />
                </ProtectedRoute>
              }
            />

            {/* Payroll & Reports */}
            <Route
              path="payroll/salary-structures"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Salary Structures" />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/salary-rules"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Salary Rules" />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/payruns"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Payruns" />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/payruns/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER']}>
                  <ComingSoon title="New Payrun" />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/payruns/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Payrun Detail" />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/payslips"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Payslips" />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/payslips/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}>
                  <ComingSoon title="Payslip Detail" />
                </ProtectedRoute>
              }
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
