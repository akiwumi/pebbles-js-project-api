import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../app/config/constants'
import { useAuth } from '../app/hooks/useAuth'
import { useToast } from '../app/hooks/useToast'
import { Input, Spinner, Toast } from '../components/common'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const { register, loading, error: authError } = useAuth()
  const { toast, show: showToast } = useToast()
  const navigate = useNavigate()

  const validate = () => {
    const nextErrors = {}

    if (!name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!email) {
      nextErrors.email = 'Email is required.'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters long.'
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
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
      await register(name.trim(), email, password)
      showToast('Registration successful.', 'success')
      navigate(ROUTES.THOUGHTS)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || authError || 'Registration failed.'
      showToast(message, 'error')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">Pebbles</p>
        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-copy">Join the feed and start sharing concise thoughts.</p>

        {authError && <div className="auth-alert">{authError}</div>}

        <form onSubmit={handleSubmit}>
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setErrors((current) => ({ ...current, name: '' }))
            }}
            error={errors.name}
            placeholder="Alex Rivers"
          />
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
            placeholder="At least 6 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setErrors((current) => ({ ...current, confirmPassword: '' }))
            }}
            error={errors.confirmPassword}
            placeholder="Repeat your password"
          />

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <Spinner /> : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to={ROUTES.LOGIN} className="auth-link">Login</Link>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
