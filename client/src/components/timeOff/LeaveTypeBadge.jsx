import React from 'react'

const COLOR_MAP = {
  blue: '#3B82F6',
  red: '#EF4444',
  green: '#22C55E',
  orange: '#F97316',
  purple: '#A855F7',
  yellow: '#EAB308',
}

export default function LeaveTypeBadge({ color = 'blue', name }) {
  const hexColor = COLOR_MAP[color?.toLowerCase()] || color || '#3B82F6'

  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: hexColor }}
        aria-hidden="true"
      />
      <span>{name}</span>
    </span>
  )
}
