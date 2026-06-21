const { ensureDb, getTenantId } = require('../common/org-helper')
const { getUserPermissionCodes, canView } = require('../common/dashboard-helper')

const PAID_STATUSES = ['paid', 'allocated', 'shipped']

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class DashboardService extends BaseService {
    async overview(ctx) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = ctx.state.user?.user_id
      const perms = await getUserPermissionCodes(db, userId, tenantId)

      const showOrderDetail = canView(perms, 'order:view')
      const showGmv = showOrderDetail || canView(perms, 'menu:overview')
      const showStock = canView(perms, 'stock:view')
      const showShipments = canView(perms, 'shipment:view')

      const result = {
        gmv: null,
        orderCount: null,
        stockRiskSkuCount: null,
        pendingShipmentCount: null,
        trend: [],
        visibility: {
          gmv: showGmv,
          orderCount: showOrderDetail,
          stockRisk: showStock,
          pendingShipment: showShipments,
          trend: showGmv,
        },
      }

      if (showGmv) {
        const gmvRow = await db('orders')
          .where({ tenant_id: tenantId })
          .whereIn('status', PAID_STATUSES)
          .sum('total_amount as total')
          .first()
        result.gmv = parseFloat(gmvRow?.total) || 0

        if (showOrderDetail) {
          const countRow = await db('orders')
            .where({ tenant_id: tenantId })
            .whereNot('status', 'cancelled')
            .count('order_id as cnt')
            .first()
          result.orderCount = parseInt(countRow?.cnt, 10) || 0
        }

        const since = new Date()
        since.setDate(since.getDate() - 6)
        since.setHours(0, 0, 0, 0)

        const trendRows = await db('orders')
          .where({ tenant_id: tenantId })
          .where('created_at', '>=', since)
          .select(db.raw('DATE(created_at) as day'))
          .count('order_id as order_count')
          .sum('total_amount as gmv')
          .groupByRaw('DATE(created_at)')
          .orderBy('day', 'asc')

        const trendMap = new Map(
          trendRows.map((r) => [
            String(r.day).slice(0, 10),
            {
              orderCount: parseInt(r.order_count, 10) || 0,
              gmv: parseFloat(r.gmv) || 0,
            },
          ])
        )

        result.trend = []
        for (let i = 0; i < 7; i += 1) {
          const d = new Date(since)
          d.setDate(since.getDate() + i)
          const key = d.toISOString().slice(0, 10)
          const row = trendMap.get(key) || { orderCount: 0, gmv: 0 }
          result.trend.push({ date: key, ...row })
        }
      }

      if (showStock) {
        const riskRow = await db('stocks')
          .where({ tenant_id: tenantId })
          .whereRaw('available_qty <= warning_qty')
          .count('sku_id as cnt')
          .first()
        result.stockRiskSkuCount = parseInt(riskRow?.cnt, 10) || 0
      }

      if (showShipments) {
        const shipRow = await db('shipments')
          .where({ tenant_id: tenantId })
          .whereIn('status', ['created', 'picking', 'picked'])
          .count('shipment_id as cnt')
          .first()
        result.pendingShipmentCount = parseInt(shipRow?.cnt, 10) || 0
      }

      return result
    }
  }
}
