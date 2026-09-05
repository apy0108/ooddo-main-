export default function FormField({
  label,
  error,
  required,
  children,
  hint,
  className = '',
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
        </div>
      )}
      {children}
      {error && (
        <p className="text-[11px] font-medium text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
