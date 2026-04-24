import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './app/providers/AuthProvider'
import { PublicOnlyRoute } from './app/guards/ProtectedRoute'
import { ROUTES } from './app/config/constants'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ThoughtsPage from './pages/ChatPage'
import NotFoundPage from './pages/NotFoundPage'
import './styles.css'

function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.THOUGHTS} replace />} />
      <Route
        path={ROUTES.LOGIN}
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path={ROUTES.REGISTER}
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route path={ROUTES.THOUGHTS} element={<ThoughtsPage />} />
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
