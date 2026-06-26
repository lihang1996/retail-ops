/**
 * @module common/fulfillment-row-actions
 * @description 履约行操作按钮（纯函数，前后端共用，无 Node 依赖）
 */

function buildFulfillmentRowActions(row) {
  const actions = []
  if (row.order_status === 'pending_payment') actions.push({ key: 'pay', label: '支付', type: 'primary' })
  if (row.order_status === 'paid') actions.push({ key: 'alloc', label: '分仓', type: 'primary' })
  if (row.order_status === 'allocated' && !row.shipment_id) actions.push({ key: 'ship-create', label: '发货单', type: 'primary' })
  if (row.shipment_status === 'created') actions.push({ key: 'pick', label: '拣货', type: 'primary' })
  if (row.shipment_status === 'picking') actions.push({ key: 'confirm', label: '确认', type: 'primary' })
  if (row.shipment_status === 'picked') actions.push({ key: 'out', label: '发货', type: 'primary' })
  if (['created', 'picking', 'picked'].includes(row.shipment_status)) actions.push({ key: '3d', label: '3D', type: 'muted' })
  return actions
}

module.exports = {
  buildFulfillmentRowActions,
}
