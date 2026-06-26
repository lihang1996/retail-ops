import { apiGet } from './http.js'

const BASE = '/api/proj/audit'

export const auditApi = {
  list: (query) => apiGet(`${BASE}/list`, query),
}
