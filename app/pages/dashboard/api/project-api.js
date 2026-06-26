import { apiGet } from './http.js'

export const projectApi = {
  list: (query) => apiGet('/api/project/list', query),
  get: (query) => apiGet('/api/project', query),
}
