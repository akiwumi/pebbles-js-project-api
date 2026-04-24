import React from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../app/config/constants'

export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card--compact not-found-card">
        <h1 className="not-found-code">404</h1>
        <p className="not-found-copy">Page not found</p>
        <Link to={ROUTES.THOUGHTS} className="auth-link not-found-link">Go to thoughts</Link>
      </div>
    </div>
  )
}
