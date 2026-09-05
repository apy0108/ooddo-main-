import { Construction } from 'lucide-react'

export default function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-6">
        <Construction size={40} className="text-indigo-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-500 max-w-md">
        This module is coming in a future phase. The full feature will be built step by step.
      </p>
      <div className="mt-6 px-4 py-2 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
        Phase 2+ — In Progress
      </div>
    </div>
  )
}
