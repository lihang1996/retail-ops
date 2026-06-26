import { apiGet } from './http.js'

const BASE = '/api/proj/customer'

export const customerApi = {
  list: (query) => apiGet(`${BASE}/list`, query),
}
