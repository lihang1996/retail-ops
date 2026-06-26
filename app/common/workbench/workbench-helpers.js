const { ORDER_STATUS } = require('../order-helper')
const { ACTIVE_SHIPMENT_STATUSES } = require('../fulfillment-state-machine')

function buildCountMap(rows, field = 'status') {
  return rows.reduce((map, row) => {
    map[row[field]] = parseInt(row.cnt, 10) || 0
    return map
  }, {})
}

function summarizeItems(items = []) {
  if (!items.length) return '—'
  const first = items[0]
  const extra = items.length - 1
  const label = `${first.sku_code || first.product_name || 'SKU'} × ${first.qty}`
  return extra > 0 ? `${label} 等 ${items.length} 项` : label
}

async function countAllocatedOrders(db, tenantId) {
  const row = await db('orders as o')
    .where('o.tenant_id', tenantId)
    .whereNot('o.status', 'cancelled')
    .andWhere('o.status', ORDER_STATUS.ALLOCATED)
    .whereNotExists(function notExistsActiveShipment() {
      this.select(1)
        .from('shipments as sh')
        .whereRaw('sh.order_id = o.order_id')
        .andWhere('sh.tenant_id', tenantId)
        .whereIn('sh.status', ACTIVE_SHIPMENT_STATUSES)
    })
    .count('o.order_id as cnt')
    .first()
  return parseInt(row && row.cnt, 10) || 0
}

module.exports = {
  buildCountMap,
  summarizeItems,
  countAllocatedOrders,
}
