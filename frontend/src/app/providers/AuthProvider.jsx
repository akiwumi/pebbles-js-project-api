import React, { createContext, useEffect, useReducer } from 'react'
import { authService } from '../../services/api'

export const AuthContext = createContext()

const initialState = {
  user: null,
  token: null,
  loading: true,
  error: null,
  isAuthenticated: false,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        error: null,
        loading: false,
      }
    case 'LOGOUT':
      return { ...initialState, loading: false }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'HYDRATE':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: !!action.payload.user && !!action.payload.token,
        loading: false,
      }
    default:
      return state
  }
}

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1]
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (!token) {
      dispatch({ type: 'HYDRATE', payload: { user: null, token: null } })
      return
    }

    const payload = decodeJwtPayload(token)

    if (!payload?.sub || (payload.exp && Date.now() >= payload.exp * 1000)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      dispatch({ type: 'HYDRATE', payload: { user: null, token: null } })
      return
    }

    let user = null

    if (storedUser) {
      try {
        user = JSON.parse(storedUser)
      } catch {
        user = null
      }
    }

    if (!user) {
      user = {
        _id: payload.sub,
        name: payload.name,
        email: payload.email,
      }
      localStorage.setItem('user', JSON.stringify(user))
    }

    dispatch({ type: 'HYDRATE', payload: { user, token } })
  }, [])

  const persistSession = (data, type) => {
    if (data.token) {
      localStorage.setItem('token', data.token)
    }

    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user))
    }

    dispatch({ type, payload: data })
  }

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const data = await authService.login(email, password)
      persistSession(data, 'LOGIN_SUCCESS')
      return data
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed'
      dispatch({ type: 'SET_ERROR', payload: msg })
      throw err
    }
  }

  const register = async (name, email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const data = await authService.register(name, email, password)
      persistSession(data, 'REGISTER_SUCCESS')
      return data
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed'
      dispatch({ type: 'SET_ERROR', payload: msg })
      throw err
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    dispatch({ type: 'LOGOUT' })
  }

  const clearError = () => dispatch({ type: 'CLEAR_ERROR' })

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}
