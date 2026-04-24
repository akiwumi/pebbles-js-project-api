import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROUTES } from '../config/constants'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-shell page-shell--centered">
        <div className="panel panel--loading">Loading...</div>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to={ROUTES.LOGIN} replace />
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-shell page-shell--centered">
        <div className="panel panel--loading">Loading...</div>
      </div>
    )
  }

  return isAuthenticated ? <Navigate to={ROUTES.THOUGHTS} replace /> : children
}
