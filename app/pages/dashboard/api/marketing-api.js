import { apiGet } from './http.js'

const BASE = '/api/proj/marketing/activity'

export const marketingApi = {
  list: (query) => apiGet(`${BASE}/list`, query),
  get: (query) => apiGet(BASE, query),
}
