import { apiGet, apiPost } from './http.js'

export const aiApi = {
  history: (query) => apiGet('/api/proj/ai/history', query),
  query: (data) => apiPost('/api/proj/ai/query', data),
  suggestions: () => apiGet('/api/proj/ai/suggestions'),
}
