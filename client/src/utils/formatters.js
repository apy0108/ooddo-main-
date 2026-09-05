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

// Format large numbers as Indian Lakh format
export function formatLakh(amount) {
  if (!amount && amount !== 0) return '₹ 0'
  if (amount >= 10_00_000) {
    return `₹ ${(amount / 1_00_000).toFixed(1)}L`
  }
  if (amount >= 1_000) {
    return `₹ ${(amount / 1_000).toFixed(1)}k`
  }
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`
}

// Format for chart tooltip (full Indian format)
export function formatINRFull(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

// Format month label
export function formatMonthLabel(dateString) {
  if (!dateString) return '—'
  const [year, month] = dateString.split('-')
  const d = new Date(year, parseInt(month, 10) - 1)
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

