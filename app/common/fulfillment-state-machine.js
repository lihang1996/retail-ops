/**
 * @module common/fulfillment-state-machine
 * @description 履约步骤、Tab 筛选与前端动作映射（前后端共用）
 */
const { ORDER_STATUS } = require('./order-helper')
const { buildFulfillmentRowActions } = require('./fulfillment-row-actions')

const ACTIVE_SHIPMENT_STATUSES = ['created', 'picking', 'picked']
const PAID_STATUSES = ['paid', 'allocated', 'shipped']

function resolveCurrentStep(order, shipment) {
  if (order.status === ORDER_STATUS.PENDING_PAYMENT) return 'pending_payment'
  if (order.status === ORDER_STATUS.PAID) return 'paid'
  if (order.status === ORDER_STATUS.SHIPPED) return 'shipped'
  if (!shipment) return 'await_shipment'
  if (shipment.status === 'created') return 'await_pick'
  if (shipment.status === 'picking') return 'picking'
  if (shipment.status === 'picked') return 'await_outbound'
  if (shipment.status === 'shipped') return 'shipped'
  return order.status
}

function applyFulfillmentTabFilter(qb, tab, tenantId) {
  switch (tab) {
    case 'paid_lifecycle':
      return qb.whereIn('o.status', PAID_STATUSES)
    case 'active':
      return qb
        .andWhere('o.status', ORDER_STATUS.ALLOCATED)
        .whereExists(function existsActiveShipment() {
          this.select(1)
            .from('shipments as sh')
            .whereRaw('sh.order_id = o.order_id')
            .andWhere('sh.tenant_id', tenantId)
            .whereIn('sh.status', ACTIVE_SHIPMENT_STATUSES)
        })
    case 'pending_payment':
      return qb.andWhere('o.status', ORDER_STATUS.PENDING_PAYMENT)
    case 'paid':
      return qb.andWhere('o.status', ORDER_STATUS.PAID)
    case 'shipped':
      return qb.andWhere('o.status', ORDER_STATUS.SHIPPED)
    case 'allocated':
      return qb
        .andWhere('o.status', ORDER_STATUS.ALLOCATED)
        .whereNotExists(function notExistsActiveShipment() {
          this.select(1)
            .from('shipments as sh')
            .whereRaw('sh.order_id = o.order_id')
            .andWhere('sh.tenant_id', tenantId)
            .whereIn('sh.status', ACTIVE_SHIPMENT_STATUSES)
        })
    case 'await_pick':
      return qb
        .andWhere('o.status', ORDER_STATUS.ALLOCATED)
        .whereExists(function existsAwaitPick() {
          this.select(1)
            .from('shipments as sh')
            .whereRaw('sh.order_id = o.order_id')
            .andWhere('sh.tenant_id', tenantId)
            .andWhere('sh.status', 'created')
        })
    case 'picking':
      return qb
        .andWhere('o.status', ORDER_STATUS.ALLOCATED)
        .whereExists(function existsPicking() {
          this.select(1)
            .from('shipments as sh')
            .whereRaw('sh.order_id = o.order_id')
            .andWhere('sh.tenant_id', tenantId)
            .andWhere('sh.status', 'picking')
        })
    case 'await_outbound':
      return qb
        .andWhere('o.status', ORDER_STATUS.ALLOCATED)
        .whereExists(function existsAwaitOutbound() {
          this.select(1)
            .from('shipments as sh')
            .whereRaw('sh.order_id = o.order_id')
            .andWhere('sh.tenant_id', tenantId)
            .andWhere('sh.status', 'picked')
        })
    default:
      return qb
  }
}

module.exports = {
  ACTIVE_SHIPMENT_STATUSES,
  PAID_STATUSES,
  resolveCurrentStep,
  applyFulfillmentTabFilter,
  buildFulfillmentRowActions,
}
