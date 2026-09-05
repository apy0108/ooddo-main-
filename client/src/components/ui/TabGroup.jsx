export default function TabGroup({ tabs = [], activeTab, onChange }) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`py-3 px-1 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'border-[#205493] text-[#205493]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon && <tab.icon size={15} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-blue-100 text-[#205493]' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
