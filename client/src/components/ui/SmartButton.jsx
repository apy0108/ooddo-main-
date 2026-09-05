export default function SmartButton({
  label,
  count = 0,
  onClick,
  icon: Icon,
  disabled = false,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
        count > 0
          ? 'bg-white border-gray-200 text-gray-800 hover:border-[#205493] hover:text-[#205493] hover:shadow-xs'
          : 'bg-gray-50/60 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
      }`}
    >
      {Icon && <Icon size={14} className={count > 0 ? 'text-[#205493]' : 'text-gray-400'} />}
      <span>{label}</span>
      <span
        className={`px-1.5 py-0.2 rounded text-[11px] font-bold font-mono ${
          count > 0 ? 'bg-blue-50 text-[#205493]' : 'bg-gray-200/60 text-gray-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}
