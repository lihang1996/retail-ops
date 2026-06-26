import { apiGet, apiPost } from './http.js'

const BASE = '/api/proj/stock'

export const stockApi = {
  inbound: (data) => apiPost(`${BASE}/inbound`, data),
  logList: (query) => apiGet(`${BASE}/log_list`, query),
}
