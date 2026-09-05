export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  HR_MANAGER: 'HR_MANAGER',
  HR_PAYROLL_USER: 'HR_PAYROLL_USER',
  HR_PAYROLL_MANAGER: 'HR_PAYROLL_MANAGER',
  ADMIN: 'ADMIN',
}

export const STATUS_COLORS = {
  // Employee
  ACTIVE:      'bg-green-100 text-green-700',
  INACTIVE:    'bg-gray-100 text-gray-600',
  ON_LEAVE:    'bg-amber-100 text-amber-700',
  TERMINATED:  'bg-red-100 text-red-700',
  // Contract / Payslip / Payrun
  DRAFT:       'bg-gray-100 text-gray-600',
  COMPUTED:    'bg-blue-100 text-blue-700',
  VALIDATED:   'bg-indigo-100 text-indigo-700',
  PAID:        'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-700',
  EXPIRED:     'bg-orange-100 text-orange-700',
  // Leave
  PENDING:     'bg-amber-100 text-amber-700',
  APPROVED:    'bg-green-100 text-green-700',
  REFUSED:     'bg-red-100 text-red-700',
  // Attendance
  PRESENT:     'bg-green-100 text-green-700',
  LATE:        'bg-amber-100 text-amber-700',
  ABSENT:      'bg-red-100 text-red-700',
  HALF_DAY:    'bg-orange-100 text-orange-700',
}
