import { ElMessage } from 'element-plus'
import { getApiErrorMessage } from './api-error.js'

export function useToast() {
  function toast(message, type = 'success') {
    const opts = { message, showClose: true, grouping: true }
    if (type === 'error') {
      ElMessage.error({ ...opts, duration: 4500 })
      return
    }
    if (type === 'warning') {
      ElMessage.warning({ ...opts, duration: 4000 })
      return
    }
    ElMessage.success({ ...opts, duration: 3200 })
  }

  return { toast, getApiErrorMessage }
}
