import api from '../app/config/axios'
import { API_ENDPOINTS } from '../app/config/constants'

export const authService = {
  register: async (name, email, password) => {
    const res = await api.post(API_ENDPOINTS.AUTH_REGISTER, { name, email, password })
    return res.data
  },

  login: async (email, password) => {
    const res = await api.post(API_ENDPOINTS.AUTH_LOGIN, { email, password })
    const { token, user } = res.data
    if (token) localStorage.setItem('token', token)
    if (user) localStorage.setItem('user', JSON.stringify(user))
    return res.data
  },
}

export const thoughtService = {
  getThoughts: async () => {
    const res = await api.get(API_ENDPOINTS.THOUGHTS)
    return res.data
  },

  createThought: async (text) => {
    const res = await api.post(API_ENDPOINTS.THOUGHTS, { text })
    return res.data
  },

  updateThought: async (thoughtId, text) => {
    const res = await api.put(`${API_ENDPOINTS.THOUGHTS}/${thoughtId}`, { text })
    return res.data
  },

  deleteThought: async (thoughtId) => {
    await api.delete(`${API_ENDPOINTS.THOUGHTS}/${thoughtId}`)
  },

  likeThought: async (thoughtId) => {
    const res = await api.post(`${API_ENDPOINTS.THOUGHTS}/${thoughtId}/like`)
    return res.data
  },
}
