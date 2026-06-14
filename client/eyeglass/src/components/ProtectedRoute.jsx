import { Navigate, useLocation } from 'react-router-dom'

const isAdminUser = (user) => {
  if (!user || typeof user !== 'object') return false
  const raw = user.isAdmin ?? user.is_admin
  return raw === true || raw === 1 || raw === '1' || raw === 'true'
}

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const location = useLocation()
  const token = localStorage.getItem('token')
  let user = null

  try {
    const stored = localStorage.getItem('user')
    user = stored ? JSON.parse(stored) : null
  } catch {
    user = null
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireAdmin && !isAdminUser(user)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
