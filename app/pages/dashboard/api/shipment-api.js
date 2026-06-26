import { apiGet, apiPost } from './http.js'

const BASE = '/api/proj/shipment'

export const shipmentApi = {
  createFromOrder: (data) => apiPost(`${BASE}/create_from_order`, data),
  startPick: (data) => apiPost(`${BASE}/start_pick`, data),
  confirmPick: (data) => apiPost(`${BASE}/confirm_pick`, data),
  ship: (data) => apiPost(`${BASE}/ship`, data),
  pickingRoute: (query) => apiGet(`${BASE}/picking_route`, query),
}
