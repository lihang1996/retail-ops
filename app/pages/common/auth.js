const TOKEN_KEY = 'retail_ops_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      window.__ELPIS_AUTH_TOKEN__ = token
    } else {
      localStorage.removeItem(TOKEN_KEY)
      window.__ELPIS_AUTH_TOKEN__ = ''
    }
  } catch {
    // ignore
  }
}

export function clearToken() {
  setToken('')
}

export async function apiRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  const data = await res.json()
  if (!data.success) {
    if (data.code === 40100 || data.code === 40101) {
      clearToken()
      window.location.href = '/view/login'
    }
    throw data
  }
  return data
}
