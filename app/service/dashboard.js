/**
 * @module service/dashboard
 * @description 经营总览服务：GMV、订单数、库存风险、履约待办、出入库与库位利用率。
 */
const { ensureDb, getTenantId } = require('../common/org-helper')
const { getUserPermissionCodes, canView } = require('../common/dashboard-helper')
const { PAID_ORDER_STATUSES } = require('../common/domain-constants')
const { todayStart, localDateKey } = require('../common/date-helper')

const PAID_STATUSES = PAID_ORDER_STATUSES

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
      const showAudit = canView(perms, 'audit:view')

      const result = {
        gmv: null,
        orderCount: null,
        avgOrderValue: null,
        paidOrderCount: null,
        pendingPaymentOrderCount: null,
        allocatedOrderCount: null,
        stockRiskSkuCount: null,
        stockOutOfStockSkuCount: null,
        stockIssueSkuCount: null,
        stockSkuCount: null,
        stockHealthRate: null,
        pendingShipmentCount: null,
        pickingShipmentCount: null,
        pickedShipmentCount: null,
        awaitPickCount: null,
        todayInboundQty: null,
        todayOutboundQty: null,
        locationUtilization: null,
        recentAuditLogs: [],
        trend: [],
        visibility: {
          gmv: showGmv,
          orderCount: showOrderDetail,
          stockRisk: showStock,
          pendingShipment: showShipments,
          trend: showGmv,
          stockOps: showStock,
          audit: showAudit,
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

          const statusRows = await db('orders')
            .where({ tenant_id: tenantId })
            .select('status')
            .count('order_id as cnt')
            .groupBy('status')
          const orderStatusMap = new Map(statusRows.map((r) => [r.status, parseInt(r.cnt, 10) || 0]))
          result.paidOrderCount = orderStatusMap.get('paid') || 0
          result.pendingPaymentOrderCount = orderStatusMap.get('pending_payment') || 0
          result.allocatedOrderCount = orderStatusMap.get('allocated') || 0
          result.avgOrderValue = result.orderCount > 0 ? result.gmv / result.orderCount : 0
        }

        const since = new Date()
        since.setDate(since.getDate() - 6)
        since.setHours(0, 0, 0, 0)

        const trendRows = await db('orders')
          .where({ tenant_id: tenantId })
          .where('created_at', '>=', since)
          .select(db.raw('DATE_FORMAT(created_at, "%Y-%m-%d") as day'))
          .count('order_id as order_count')
          .sum('total_amount as gmv')
          .groupByRaw('DATE_FORMAT(created_at, "%Y-%m-%d")')
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
          const key = localDateKey(d)
          const row = trendMap.get(key) || { orderCount: 0, gmv: 0 }
          result.trend.push({ date: key, ...row })
        }
      }

      if (showStock) {
        const riskRow = await db('stocks')
          .where({ tenant_id: tenantId })
          .where('available_qty', '>', 0)
          .whereRaw('available_qty <= warning_qty')
          .count('sku_id as cnt')
          .first()
        result.stockRiskSkuCount = parseInt(riskRow?.cnt, 10) || 0

        const outOfStockRow = await db('stocks')
          .where({ tenant_id: tenantId })
          .where('available_qty', '<=', 0)
          .count('sku_id as cnt')
          .first()
        result.stockOutOfStockSkuCount = parseInt(outOfStockRow?.cnt, 10) || 0
        result.stockIssueSkuCount = result.stockRiskSkuCount + result.stockOutOfStockSkuCount

        const stockRow = await db('stocks')
          .where({ tenant_id: tenantId })
          .countDistinct('sku_id as cnt')
          .first()
        result.stockSkuCount = parseInt(stockRow?.cnt, 10) || 0
        result.stockHealthRate = result.stockSkuCount > 0
          ? Math.max(0, Math.round(((result.stockSkuCount - result.stockIssueSkuCount) / result.stockSkuCount) * 100))
          : 100

        const sinceToday = todayStart()
        const inboundRow = await db('stock_logs')
          .where({ tenant_id: tenantId, action_type: 'inbound' })
          .where('created_at', '>=', sinceToday)
          .sum('qty_change as total')
          .first()
        const outboundRow = await db('stock_logs')
          .where({ tenant_id: tenantId, action_type: 'outbound' })
          .where('created_at', '>=', sinceToday)
          .sum('qty_change as total')
          .first()
        result.todayInboundQty = parseInt(inboundRow?.total, 10) || 0
        result.todayOutboundQty = Math.abs(parseInt(outboundRow?.total, 10) || 0)

        const locUtilRow = await db('stock_locations as sl')
          .join('warehouse_locations as loc', 'sl.location_id', 'loc.location_id')
          .where('sl.tenant_id', tenantId)
          .where('loc.capacity', '>', 0)
          .select(db.raw('AVG(sl.qty / loc.capacity) as utilization'))
          .first()
        result.locationUtilization = Math.round((parseFloat(locUtilRow?.utilization) || 0) * 100)
      }

      if (showShipments) {
        const shipRows = await db('shipments')
          .where({ tenant_id: tenantId })
          .whereIn('status', ['created', 'picking', 'picked'])
          .select('status')
          .count('shipment_id as cnt')
          .groupBy('status')
        const shipmentStatusMap = new Map(shipRows.map((r) => [r.status, parseInt(r.cnt, 10) || 0]))
        result.pendingShipmentCount = shipRows.reduce((sum, row) => sum + (parseInt(row.cnt, 10) || 0), 0)
        result.pickingShipmentCount = shipmentStatusMap.get('picking') || 0
        result.pickedShipmentCount = shipmentStatusMap.get('picked') || 0
        result.awaitPickCount = shipmentStatusMap.get('created') || 0
      }

      if (showAudit) {
        const sinceToday = todayStart()
        const todayAuditRow = await db('audit_logs')
          .where({ tenant_id: tenantId })
          .where('created_at', '>=', sinceToday)
          .count('audit_id as cnt')
          .first()
        result.todayAuditCount = parseInt(todayAuditRow?.cnt, 10) || 0

        result.recentAuditLogs = await db('audit_logs as a')
          .leftJoin('users as u', 'a.operator_id', 'u.user_id')
          .where('a.tenant_id', tenantId)
          .select(
            'a.action_code',
            'a.object_type',
            'a.object_id',
            'a.detail_json',
            'a.created_at',
            'u.display_name as operator_name'
          )
          .orderBy('a.created_at', 'desc')
          .limit(8)
      }

      return result
    }
  }
}
