import { apiGet } from './http.js'

const BASE = '/api/proj/workbench'

export const workbenchApi = {
  fulfillment: (query) => apiGet(`${BASE}/fulfillment`, query),
  ops: (query) => apiGet(`${BASE}/ops`, query),
}
