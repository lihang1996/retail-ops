import { apiGet, apiPost } from './http.js'

export const authApi = {
  me: () => apiGet('/api/auth/me'),
  permissions: () => apiGet('/api/auth/permissions'),
  logout: () => apiPost('/api/auth/logout'),
}
