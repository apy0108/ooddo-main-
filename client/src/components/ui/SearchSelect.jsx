import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export default function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  error = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => opt.value === value)

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs bg-white border rounded-lg transition outline-none cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed ${
          error
            ? 'border-red-400 focus:ring-1 focus:ring-red-400'
            : 'border-gray-200 focus:border-[#205493] focus:ring-1 focus:ring-[#205493]/20'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100 max-h-60 flex flex-col">
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#205493]"
            />
          </div>

          <div className="overflow-y-auto space-y-0.5 flex-1">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
                setQuery('')
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-50 rounded-lg transition"
            >
              -- None / Clear --
            </button>
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-[11px] text-gray-400 text-center">
                No matches found
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition flex items-center justify-between ${
                    opt.value === value
                      ? 'bg-blue-50 text-[#205493] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
