import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { orderApi } from '../api/order-api.js'
import { shipmentApi } from '../api/shipment-api.js'
import { buildWarehouse3dPath, getProjKey } from '../common/nav.js'
import { buildFulfillmentRowActions } from '../../../common/fulfillment-row-actions.js'
import { useToast } from '../common/use-toast.js'

export function useFulfillmentActions({ loadWorkbench, onDetailRefresh } = {}) {
  const route = useRoute()
  const { toast } = useToast()
  const importing = ref(false)
  const actionId = ref('')
  const drawerVisible = ref(false)
  const drawerTitle = ref('订单详情')
  const detailLoading = ref(false)
  const detail = ref(null)

  function rowActions(row) {
    const handlers = {
      pay,
      alloc: allocate,
      'ship-create': createShipment,
      pick: startPick,
      confirm: confirmPick,
      out: ship,
      '3d': open3d,
    }
    return buildFulfillmentRowActions(row).map((action) => ({
      ...action,
      handler: handlers[action.key],
    }))
  }

  function getActionSplit(row) {
    const all = rowActions(row)
    return { primary: all[0] || null, more: all.slice(1) }
  }

  function isActionLoading(row, action) {
    if (!action) return false
    return actionId.value === `${action.key}-${row.order_id || row.shipment_id}`
  }

  function actionLoadingLabel(row, action) {
    return isActionLoading(row, action) ? '处理中…' : action.label
  }

  function runMoreAction(key, row) {
    const action = rowActions(row).find((item) => item.key === key)
    if (action && action.handler) action.handler(row)
  }

  async function runAction(key, row, request) {
    actionId.value = `${key}-${row.order_id || row.shipment_id}`
    try {
      const res = await request()
      if (res && res.success) {
        toast(res.message || '操作成功')
        await loadWorkbench()
        if (drawerVisible.value && row.order_id) await openDetail(row)
        return true
      }
      toast((res && res.message) || '操作失败', 'error')
      return false
    } finally {
      actionId.value = ''
    }
  }

  async function pay(row) {
    await runAction('pay', row, () => orderApi.pay({ order_id: row.order_id }))
  }

  async function allocate(row) {
    await runAction('alloc', row, () => orderApi.allocate({ order_id: row.order_id }))
  }

  async function createShipment(row) {
    const res = await shipmentApi.createFromOrder({ order_id: row.order_id })
    if (res && res.success) {
      toast(`发货单已创建：${res.data.shipmentNo}`)
      await loadWorkbench()
    } else {
      toast((res && res.message) || '创建失败', 'error')
    }
  }

  async function startPick(row) {
    await runAction('pick', row, () => shipmentApi.startPick({ shipment_id: row.shipment_id }))
  }

  async function confirmPick(row) {
    await runAction('confirm', row, () => shipmentApi.confirmPick({ shipment_id: row.shipment_id }))
  }

  async function ship(row) {
    await runAction('out', row, () => shipmentApi.ship({ shipment_id: row.shipment_id }))
  }

  function open3d(row) {
    const query = { shipment_id: row.shipment_id || '' }
    if (row.warehouse_id) query.warehouse_id = row.warehouse_id
    window.open(buildWarehouse3dPath({ projKey: getProjKey(route), query }), '_blank')
  }

  async function openDetail(row) {
    if (!row || !row.order_id) return
    drawerVisible.value = true
    drawerTitle.value = `订单 ${row.order_no}`
    detailLoading.value = true
    detail.value = null
    try {
      const res = await orderApi.get({ order_id: row.order_id })
      if (res && res.success) detail.value = res.data
      if (onDetailRefresh && res && res.data) onDetailRefresh(res.data)
    } finally {
      detailLoading.value = false
    }
  }

  return {
    importing,
    actionId,
    drawerVisible,
    drawerTitle,
    detailLoading,
    detail,
    rowActions,
    getActionSplit,
    isActionLoading,
    actionLoadingLabel,
    runMoreAction,
    pay,
    allocate,
    createShipment,
    startPick,
    confirmPick,
    ship,
    open3d,
    openDetail,
    toast,
  }
}
