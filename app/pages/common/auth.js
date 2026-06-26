/**
 * @module pages/common/auth
 * @description 前端认证工具：Token 存储、自动登出、API 请求封装。
 * 关键规则：
 * - Token 同时存储在 localStorage 和 window 全局变量供 elpis 框架使用
 * - 40100/40101 错误码自动清除 token 并跳转登录页
 * - logout 即使接口失败也要清理本地状态（防止用户被困在前端）
 */

// localStorage 中存储 JWT token 的键名
const TOKEN_KEY = 'retail_ops_token'

/**
 * 从 localStorage 读取 JWT token
 * @returns {string} token 字符串，不存在返回空字符串
 */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    // localStorage 可能在隐私模式下不可用
    return ''
  }
}

/**
 * 设置 JWT token 到 localStorage 和全局变量
 * @param {string} token - JWT token，空值表示清除
 */
export function setToken(token) {
  try {
    if (token) {
      // 双重存储：localStorage 持久化 + window 全局变量供 elpis 框架使用
      localStorage.setItem(TOKEN_KEY, token)
      window.__ELPIS_AUTH_TOKEN__ = token
    } else {
      // 清除两个存储位置
      localStorage.removeItem(TOKEN_KEY)
      window.__ELPIS_AUTH_TOKEN__ = ''
    }
  } catch {
    // localStorage 写入可能失败（磁盘满/隐私模式）
  }
}

/**
 * 清除本地 token（等同于 setToken('')）
 */
export function clearToken() {
  setToken('')
}

/**
 * 登出：调用后端 logout API 并清理本地登录态
 * @param {Object} options - 配置项
 * @param {string} options.redirectTo - 登出后跳转地址，默认 '/view/login'
 */
export async function logout({ redirectTo = '/view/login' } = {}) {
  try {
    // 调用后端登出接口，将会话标记为 revoked
    await apiRequest('/api/auth/logout', { method: 'POST' })
  } catch {
    // 登出接口失败时也要清理本地登录态，避免用户被困在前端。
    // 可能的失败原因：网络断开、服务端异常等
  } finally {
    // 无论接口成功与否，都清理本地 token 并跳转
    clearToken()
    if (redirectTo) window.location.href = redirectTo
  }
}

/**
 * 封装的 API 请求方法，自动带 token、处理认证失败
 * @param {string} url - 请求 URL
 * @param {Object} options - fetch 配置项
 * @returns {Promise<Object>} 响应的 data 字段
 * @throws {Object} 当 success=false 时抛出完整响应对象
 */
export async function apiRequest(url, options = {}) {
  // 构建请求头，自动附加 JWT token
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  const data = await res.json()

  // 检查业务状态码
  if (!data.success) {
    // 40100: 未登录, 40101: 登录已过期
    if (data.code === 40100 || data.code === 40101) {
      clearToken()
      window.location.href = '/view/login'
    }
    throw data
  }
  return data
}

export async function login(account, password) {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  })
  const payload = res.data || {}
  if (payload.token) setToken(payload.token)
  return payload
}

export async function getCurrentUser() {
  const res = await apiRequest('/api/auth/me')
  return res.data || {}
}

export async function getPermissions() {
  const res = await apiRequest('/api/auth/permissions')
  return res.data || {}
}
