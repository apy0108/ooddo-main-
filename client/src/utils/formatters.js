import { format, parseISO } from 'date-fns'

export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount ?? 0)

// Indian Rupee formatter — output: ₹85,000 or ₹1,25,000
export const formatINR = (amount) => {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (date, fmt = 'MMM dd, yyyy') =>
  date ? format(typeof date === 'string' ? parseISO(date) : date, fmt) : '—'

// Short date format matching mockup (01-Jan-26)
export const formatDateShort = (date) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).format(new Date(date))
}

export const formatHours = (hours) =>
  hours != null ? `${hours.toFixed(2)}h` : '—'

export const getInitials = (firstName, lastName) =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
