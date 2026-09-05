import { format, parseISO } from 'date-fns'

export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount ?? 0)

export const formatDate = (date, fmt = 'MMM dd, yyyy') =>
  date ? format(typeof date === 'string' ? parseISO(date) : date, fmt) : '—'

export const formatHours = (hours) =>
  hours != null ? `${hours.toFixed(2)}h` : '—'

export const getInitials = (firstName, lastName) =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
