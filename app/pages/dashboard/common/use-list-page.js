import { ref } from 'vue'
import { useRemoteTable, cleanQueryParams } from './use-remote-table.js'
import { parseListResponse } from '../api/http.js'

/**
 * 列表页标准组合：远程分页 + 筛选参数 + 统一列表解析
 */
export function useListPage({
  fetchPage,
  initialPageSize = 20,
  buildQuery = () => ({}),
  keepPreviousData = true,
  onError,
} = {}) {
  const listLoading = ref(false)
  const listError = ref(null)

  const table = useRemoteTable({
    initialPageSize,
    keepPreviousData,
    onError: (err) => {
      listError.value = err
      if (onError) onError(err)
    },
    fetchPage: async ({ page, pageSize }) => {
      listLoading.value = true
      try {
        const res = await fetchPage({
          page,
          pageSize,
          query: cleanQueryParams(buildQuery()),
        })
        const parsed = Array.isArray(res && res.rows)
          ? { ok: true, rows: res.rows, total: res.total }
          : parseListResponse(res)
        if (!parsed.ok) throw new Error(parsed.message)
        listError.value = null
        return { rows: parsed.rows, total: parsed.total }
      } finally {
        listLoading.value = false
      }
    },
  })

  async function search() {
    table.currentPage.value = 1
    return table.load()
  }

  async function resetAndLoad(resetFn) {
    if (resetFn) resetFn()
    table.currentPage.value = 1
    return table.load()
  }

  return {
    ...table,
    list: table.rows,
    listLoading,
    listError,
    search,
    resetAndLoad,
  }
}
