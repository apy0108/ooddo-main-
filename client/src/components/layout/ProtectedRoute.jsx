import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
        <p className="text-gray-500 mb-6">
          You don't have permission to view this page.
        </p>
        <button
          onClick={() => window.history.back()}
          className="text-indigo-600 hover:underline text-sm font-medium cursor-pointer"
        >
          ← Go Back
        </button>
      </div>
    )
  }

  return children
}
