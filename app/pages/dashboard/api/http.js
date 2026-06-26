import $curl from '$elpisCommon/curl.js'
import { getApiErrorMessage } from '../common/api-error.js'

export function apiGet(url, query) {
  return $curl({ method: 'get', url, query })
}

export function apiPost(url, data) {
  return $curl({ method: 'post', url, data })
}

export function apiPut(url, data) {
  return $curl({ method: 'put', url, data })
}

export function apiDelete(url, data) {
  return $curl({ method: 'delete', url, data })
}

export function apiUpload(url, formData) {
  return $curl({ method: 'post', url, data: formData })
}

export function apiList(baseUrl, query = {}) {
  return apiGet(`${baseUrl}/list`, query)
}

/**
 * 统一解析列表响应：data[] + metadata.total
 */
export function parseListResponse(res, fallbackMessage = '列表加载失败') {
  if (!res || !res.success) {
    return {
      ok: false,
      rows: [],
      total: 0,
      message: getApiErrorMessage(res, fallbackMessage),
      raw: res,
    }
  }
  const rows = Array.isArray(res.data) ? res.data : []
  const metaTotal = res.metadata && res.metadata.total
  const total = metaTotal != null ? Number(metaTotal) : rows.length
  return { ok: true, rows, total, raw: res }
}

export function unwrapData(res, fallback = null) {
  if (res && res.success) {
    return res.data != null ? res.data : fallback
  }
  return fallback
}

export function assertApiSuccess(res, fallbackMessage = '操作失败') {
  if (res && res.success) return res
  const error = new Error(getApiErrorMessage(res, fallbackMessage))
  error.response = res
  throw error
}
