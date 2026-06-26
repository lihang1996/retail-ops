import { apiGet, apiPost } from './http.js'

const BASE = '/api/proj/approval'

export const approvalApi = {
  todoList: (query) => apiGet(`${BASE}/todo_list`, query),
  approve: (data) => apiPost(`${BASE}/approve`, data),
  reject: (data) => apiPost(`${BASE}/reject`, data),
}
