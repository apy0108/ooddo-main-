import React from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

export default function BalanceBanner({ allocated, taken, remaining, unit = 'DAYS' }) {
  const rem = remaining !== undefined ? remaining : (allocated || 0) - (taken || 0)
  const unitLabel = unit?.toLowerCase() === 'hours' ? 'hrs' : 'days'

  if (rem <= 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
        <AlertCircle size={16} className="text-rose-600 shrink-0" />
        <span>
          <strong>No balance available</strong> — request may be refused (0 {unitLabel} remaining).
        </span>
      </div>
    )
  }

  if (rem <= 3) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
        <span>
          <strong>Low balance:</strong> Available: {rem} {unitLabel} remaining (of {allocated} {unitLabel} allocated).
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
      <span>
        <strong>Available:</strong> {rem} {unitLabel} remaining (of {allocated} {unitLabel} allocated).
      </span>
    </div>
  )
}
