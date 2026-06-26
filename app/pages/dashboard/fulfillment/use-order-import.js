import { ref } from 'vue'
import { orderApi } from '../api/order-api.js'
import { useToast } from '../common/use-toast.js'

/**
 * 订单文件导入（履约工作台）
 */
export function useOrderImport({ loadWorkbench, onImported } = {}) {
  const importing = ref(false)
  const importResult = ref(null)
  const { toast } = useToast()

  async function importFile(file, { activeTab, page } = {}) {
    if (!file) return false
    importing.value = true
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await orderApi.importFile(form)
      if (res && res.success) {
        importResult.value = res.data
        toast(`导入完成：成功 ${res.data.success}，失败 ${res.data.fail}`)
        if (activeTab) activeTab.value = 'pending_payment'
        if (page) page.value = 1
        if (loadWorkbench) await loadWorkbench()
        if (onImported) onImported(res.data)
        return true
      }
      toast((res && res.message) || '导入失败', 'error')
      return false
    } catch (e) {
      toast((e && e.message) || '导入失败', 'error')
      return false
    } finally {
      importing.value = false
    }
  }

  async function onFileInput(event, ctx = {}) {
    const file = event.target && event.target.files && event.target.files[0]
    if (event.target) event.target.value = ''
    return importFile(file, ctx)
  }

  function clearImportResult() {
    importResult.value = null
  }

  return {
    importing,
    importResult,
    importFile,
    onFileInput,
    clearImportResult,
  }
}
