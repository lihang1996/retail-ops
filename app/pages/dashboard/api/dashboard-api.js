import { apiGet } from './http.js'

export const dashboardApi = {
  overview: () => apiGet('/api/proj/dashboard/overview'),
}
