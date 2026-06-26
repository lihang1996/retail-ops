/**
 * 从 curl / fetch 异常或接口响应中提取可读错误信息
 */
export function getApiErrorMessage(error, fallback = '操作失败') {
  if (!error) return fallback
  if (typeof error === 'string') return error
  return error.data?.message
    || error.response?.data?.message
    || error.message
    || fallback
}
