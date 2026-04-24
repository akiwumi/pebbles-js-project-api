import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../app/config/constants'
import { useAuth } from '../app/hooks/useAuth'
import { useToast } from '../app/hooks/useToast'
import { Input, Spinner, Toast } from '../components/common'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const { login, loading, error: authError } = useAuth()
  const { toast, show: showToast } = useToast()
  const navigate = useNavigate()

  const validate = () => {
    const nextErrors = {}

    if (!email) {
      nextErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    }

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    try {
      await login(email, password)
      showToast('Login successful.', 'success')
      navigate(ROUTES.THOUGHTS)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || authError || 'Login failed.'
      showToast(message, 'error')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">Pebbles</p>
        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-copy">Sign in to post new thoughts and manage your own entries.</p>

        {authError && <div className="auth-alert">{authError}</div>}

        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setErrors((current) => ({ ...current, email: '' }))
            }}
            error={errors.email}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setErrors((current) => ({ ...current, password: '' }))
            }}
            error={errors.password}
            placeholder="••••••••"
          />

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <Spinner /> : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to={ROUTES.REGISTER} className="auth-link">Register</Link>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
