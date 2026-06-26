import { apiGet, apiPost, apiUpload } from './http.js'

const BASE = '/api/proj/order'

export const orderApi = {
  get: (query) => apiGet(BASE, query),
  importFile: (formData) => apiUpload(`${BASE}/import`, formData),
  pay: (data) => apiPost(`${BASE}/pay`, data),
  allocate: (data) => apiPost(`${BASE}/allocate`, data),
}
