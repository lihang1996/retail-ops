import { reactive, ref } from 'vue'
import { stockApi } from '../api/stock-api.js'
import { cleanQueryParams } from '../common/use-remote-table.js'
import { getApiErrorMessage } from '../common/api-error.js'

export function useInboundLogs() {
  const tableLoading = ref(false)
  const pageError = ref('')
  const logs = ref([])
  const logFilters = reactive({
    keyword: '',
    warehouse_name: '',
    location_code: '',
    operator_name: '',
  })

  async function loadInboundLogs() {
    tableLoading.value = true
    pageError.value = ''
    try {
      const res = await stockApi.logList(cleanQueryParams({
        action_type: 'inbound',
        limit: 200,
        keyword: logFilters.keyword,
        warehouse_name: logFilters.warehouse_name,
        location_code: logFilters.location_code,
        operator_name: logFilters.operator_name,
      }))
      if (res?.success) {
        logs.value = res.data || []
        return
      }
      logs.value = []
      pageError.value = res?.message || '入库流水加载失败'
    } catch (error) {
      logs.value = []
      pageError.value = getApiErrorMessage(error, '入库流水加载失败')
    } finally {
      tableLoading.value = false
    }
  }

  function searchInboundLogs() {
    return loadInboundLogs()
  }

  function resetInboundLogFilters() {
    logFilters.keyword = ''
    logFilters.warehouse_name = ''
    logFilters.location_code = ''
    logFilters.operator_name = ''
    return loadInboundLogs()
  }

  return {
    tableLoading,
    pageError,
    logs,
    logFilters,
    loadInboundLogs,
    searchInboundLogs,
    resetInboundLogFilters,
  }
}
