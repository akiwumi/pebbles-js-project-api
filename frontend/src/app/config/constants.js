function trimTrailingSlash(value = '') {
  return value.replace(/\/+$/, '')
}

function getBrowserOrigin() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.origin
}

export const API_ROOT = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  getBrowserOrigin()
)

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  THOUGHTS: '/thoughts',
  NOT_FOUND: '*',
}

export const API_ENDPOINTS = {
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  THOUGHTS: '/thoughts',
}
