import { apiGet } from './http.js'

export const financeApi = {
  summary: () => apiGet('/api/proj/finance/summary'),
}
