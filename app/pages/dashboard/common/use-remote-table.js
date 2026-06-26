import { onBeforeUnmount, ref } from 'vue'

import { hasFilterValue, cleanQueryParams } from './filter-value.js'

export { hasFilterValue, cleanQueryParams }

/**
 * 远程分页列表：防抖请求 + 最小 loading 时长 + 最后请求胜出 + 错误态
 */
export function useRemoteTable(options = {}) {
  const {
    fetchPage,
    debounceMs = 120,
    minLoadingVisibleMs = 360,
    initialPage = 1,
    initialPageSize = 20,
    keepPreviousData = false,
    onError,
  } = options

  const loading = ref(false)
  const error = ref(null)
  const rows = ref([])
  const currentPage = ref(initialPage)
  const pageSize = ref(initialPageSize)
  const total = ref(0)

  let timerId
  let loadingTimerId
  let timerResolve
  let requestId = 0
  let loadingStartedAt = 0

  const showLoading = () => {
    if (loadingTimerId) {
      clearTimeout(loadingTimerId)
      loadingTimerId = undefined
    }
    loadingStartedAt = Date.now()
    loading.value = true
  }

  const hideLoading = ({ immediate = false } = {}) => {
    if (loadingTimerId) {
      clearTimeout(loadingTimerId)
      loadingTimerId = undefined
    }
    const elapsed = Date.now() - loadingStartedAt
    const delay = immediate ? 0 : Math.max(minLoadingVisibleMs - elapsed, 0)
    if (delay <= 0) {
      loading.value = false
      return
    }
    loadingTimerId = setTimeout(() => {
      loading.value = false
      loadingTimerId = undefined
    }, delay)
  }

  const runFetch = async (activeRequest) => {
    if (!fetchPage) {
      rows.value = []
      total.value = 0
      error.value = null
      if (activeRequest === requestId) hideLoading({ immediate: true })
      return
    }

    if (!loading.value) showLoading()

    try {
      const result = await fetchPage({
        page: currentPage.value,
        pageSize: pageSize.value,
      })
      if (activeRequest !== requestId) return
      error.value = null
      rows.value = Array.isArray(result && result.rows) ? result.rows : []
      total.value = Number((result && result.total != null) ? result.total : rows.value.length)
    } catch (err) {
      if (activeRequest !== requestId) return
      const normalized = err instanceof Error ? err : new Error('列表加载失败')
      error.value = normalized
      if (typeof onError === 'function') onError(normalized)
      if (!keepPreviousData) {
        rows.value = []
        total.value = 0
      }
    } finally {
      if (activeRequest === requestId) hideLoading()
    }
  }

  const load = () => {
    if (timerId) {
      clearTimeout(timerId)
      timerId = undefined
      if (timerResolve) timerResolve()
    }

    const activeRequest = ++requestId
    showLoading()
    return new Promise((resolve) => {
      timerResolve = resolve
      timerId = setTimeout(async () => {
        timerId = undefined
        timerResolve = undefined
        await runFetch(activeRequest)
        resolve()
      }, debounceMs)
    })
  }

  const reset = async () => {
    currentPage.value = initialPage
    await load()
  }

  const retry = () => load()

  const onPageChange = (page) => {
    currentPage.value = page
    return load()
  }

  const onPageSizeChange = (size) => {
    pageSize.value = size
    currentPage.value = initialPage
    return load()
  }

  onBeforeUnmount(() => {
    if (timerId) clearTimeout(timerId)
    if (loadingTimerId) clearTimeout(loadingTimerId)
    if (timerResolve) timerResolve()
    requestId += 1
  })

  return {
    loading,
    error,
    rows,
    currentPage,
    pageSize,
    total,
    load,
    reset,
    retry,
    onPageChange,
    onPageSizeChange,
    showLoading,
    hideLoading,
  }
}
