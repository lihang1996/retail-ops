import { apiGet } from './http.js'
import { apiList } from './http.js'

const BASE = '/api/proj/warehouse'

export const warehouseApi = {
  list: (query) => apiList(BASE, query),
  layout: (query) => apiGet(`${BASE}/layout`, query),
  riskMap: (query) => apiGet(`${BASE}/risk_map`, query),
  location: (query) => apiGet(`${BASE}/location`, query),
  locationList: (query) => apiGet(`${BASE}/location/list`, query),
}
