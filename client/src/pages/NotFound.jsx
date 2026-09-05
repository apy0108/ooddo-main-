import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-8xl font-bold text-indigo-600 mb-2">404</div>
      <p className="text-xl text-gray-600 mt-2 mb-6">Page not found</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
      >
        <Home size={16} />
        Go home
      </Link>
    </div>
  )
}
