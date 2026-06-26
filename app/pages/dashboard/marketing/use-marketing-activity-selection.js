import { ref } from 'vue'

export function useMarketingActivitySelection({ fetchDetail }) {
  const detailLoading = ref(false)
  const detail = ref(null)
  const selectedId = ref('')
  let detailRequestId = 0

  function clearSelection() {
    selectedId.value = ''
    detail.value = null
  }

  async function selectActivity(row) {
    if (!row || !row.activity_id || typeof fetchDetail !== 'function') {
      clearSelection()
      return
    }
    const requestId = ++detailRequestId
    selectedId.value = row.activity_id
    detailLoading.value = true
    try {
      const res = await fetchDetail(row.activity_id)
      if (requestId === detailRequestId && res && res.success) detail.value = res.data
    } finally {
      if (requestId === detailRequestId) detailLoading.value = false
    }
  }

  async function syncSelection(rows = []) {
    const list = Array.isArray(rows) ? rows : []
    if (!list.length) {
      clearSelection()
      return
    }
    if (!list.some((item) => item.activity_id === selectedId.value)) {
      await selectActivity(list[0])
    }
  }

  return {
    detailLoading,
    detail,
    selectedId,
    selectActivity,
    syncSelection,
    clearSelection,
  }
}
