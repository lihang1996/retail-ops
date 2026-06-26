import { apiGet, apiPost } from './http.js'

const BASE = '/api/proj/org'

export const orgApi = {
  roleList: (query) => apiGet(`${BASE}/role/list`, query),
  permissionTree: (query) => apiGet('/api/proj/permission/tree', query),
  rolePermissions: (query) => apiGet(`${BASE}/role_permissions`, query),
  saveRolePermissions: (data) => apiPost(`${BASE}/role_permissions`, data),
}
