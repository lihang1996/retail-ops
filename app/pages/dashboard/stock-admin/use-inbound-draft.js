import { computed, reactive, ref } from 'vue'
import { stockApi } from '../api/stock-api.js'
import { useToast } from '../common/use-toast.js'

export function useInboundDraft({ warehouses, locations, findSku, loadLocations, loadInboundLogs }) {
  const { toast, getApiErrorMessage } = useToast()
  const saving = ref(false)
  const drawerVisible = ref(false)
  const lines = ref([])

  const form = reactive({
    warehouse_id: '',
    location_id: '',
    remark: '',
  })

  const lineForm = reactive({
    sku_id: '',
    qty: 10,
  })

  const activeStep = computed(() => {
    if (!form.warehouse_id) return 0
    if (!lines.value.length) return 1
    return 2
  })

  const selectedWarehouse = computed(() => (
    warehouses.value.find((item) => item.warehouse_id === form.warehouse_id)
  ))

  const selectedLocation = computed(() => (
    locations.value.find((item) => item.location_id === form.location_id)
  ))

  const selectedTotalQty = computed(() => (
    lines.value.reduce((sum, line) => sum + Number(line.qty || 0), 0)
  ))

  async function onWarehouseChange() {
    form.location_id = ''
    await loadLocations(form.warehouse_id, { currentLocationId: '' })
  }

  function addLine() {
    const skuId = String(lineForm.sku_id || '').trim()
    const qty = parseInt(lineForm.qty, 10)
    if (!skuId) {
      toast('请先选择或输入 SKU', 'warning')
      return
    }
    if (!qty || qty <= 0) {
      toast('入库数量必须大于 0', 'warning')
      return
    }

    const sku = findSku(skuId)
    const existing = lines.value.find((line) => line.sku_id === skuId)
    if (existing) {
      existing.qty += qty
    } else {
      lines.value.push({
        sku_id: skuId,
        sku_code: sku?.sku_code || skuId,
        product_name: sku?.product_name || '',
        qty,
      })
    }
    lineForm.sku_id = ''
    lineForm.qty = 10
  }

  function removeLine(index) {
    lines.value.splice(index, 1)
  }

  function resetDraft() {
    lines.value = []
    lineForm.sku_id = ''
    lineForm.qty = 10
    form.remark = ''
    saving.value = false
  }

  async function submitInbound() {
    if (!form.warehouse_id) {
      toast('请选择入库仓库', 'warning')
      return
    }
    if (!lines.value.length) {
      toast('请至少添加一条入库明细', 'warning')
      return
    }

    saving.value = true
    try {
      for (let index = 0; index < lines.value.length; index += 1) {
        const line = lines.value[index]
        const res = await stockApi.inbound({
          warehouse_id: form.warehouse_id,
          location_id: form.location_id || '',
          sku_id: line.sku_id,
          qty: line.qty,
          remark: form.remark || `入库作业：${line.sku_code || line.sku_id}`,
        })
        if (!res?.success) {
          throw new Error(`第 ${index + 1} 行入库失败：${res?.message || '服务异常'}`)
        }
      }

      toast('入库成功，库存与流水已更新')
      drawerVisible.value = false
      await Promise.allSettled([loadInboundLogs(), loadLocations(form.warehouse_id, { currentLocationId: form.location_id })])
    } catch (error) {
      toast(getApiErrorMessage(error, '入库失败'), 'error')
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
    drawerVisible,
    lines,
    form,
    lineForm,
    activeStep,
    selectedWarehouse,
    selectedLocation,
    selectedTotalQty,
    onWarehouseChange,
    addLine,
    removeLine,
    resetDraft,
    submitInbound,
  }
}
