const { ensureDb, getTenantId } = require('../common/org-helper')

const PAID_STATUSES = ['paid', 'allocated', 'shipped']

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class FinanceService extends BaseService {
    async summary(ctx) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      const revenueRow = await db('orders')
        .where({ tenant_id: tenantId })
        .whereIn('status', PAID_STATUSES)
        .sum('total_amount as total')
        .first()

      const storeRows = await db('orders as o')
        .join('stores as s', 'o.store_id', 's.store_id')
        .where('o.tenant_id', tenantId)
        .whereIn('o.status', PAID_STATUSES)
        .select('o.store_id', 's.store_name')
        .sum('o.total_amount as revenue')
        .count('o.order_id as order_count')
        .groupBy('o.store_id', 's.store_name')

      return {
        orderRevenue: parseFloat(revenueRow?.total) || 0,
        refundAmount: 0,
        storeSettlement: storeRows.map((r) => ({
          storeId: r.store_id,
          storeName: r.store_name,
          revenue: parseFloat(r.revenue) || 0,
          orderCount: parseInt(r.order_count, 10) || 0,
        })),
      }
    }
  }
}
