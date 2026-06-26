import { apiGet } from './http.js'

const BASE = '/api/proj/product'

export const productApi = {
  skuList: (query) => apiGet(`${BASE}/sku_list`, query),
}
