/**
 * @module service/finance
 * @description 财务汇总服务：订单营收与店铺结算统计。
 *
 * 核心职责：
 * 1. 汇总租户订单总营收
 * 2. 按店铺分组统计结算数据
 *
 * 统计规则：
 * - 仅统计 paid/allocated/shipped 状态订单
 * - 退款：已取消订单 total_amount 合计
 *
 * 使用场景：
 * - 财务报表
 * - 店铺结算
 * - 营收分析
 */
const { ensureDb, getTenantId } = require('../common/org-helper')
const { PAID_ORDER_STATUSES } = require('../common/domain-constants')
const { localDateKey } = require('../common/date-helper')

const PAID_STATUSES = PAID_ORDER_STATUSES

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class FinanceService extends BaseService {
    /**
     * 汇总租户订单营收及按店铺分组结算
     * @param {Object} ctx - Koa 上下文
     * @returns {Object} 财务汇总数据
     *
     * 返回数据结构：
     * {
     *   orderRevenue: 123456.78,    // 订单总营收
     *   refundAmount: 1234.56,          // 已取消订单金额合计
     *   storeSettlement: [           // 店铺结算明细
     *     {
     *       storeId: 'store_1',
     *       storeName: '旗舰店',
     *       revenue: 50000.00,       // 店铺营收
     *       orderCount: 120          // 订单数
     *     }
     *   ]
     * }
     *
     * 统计逻辑：
     * 1. 订单总营收：sum(total_amount) where status in [paid, allocated, shipped]
     * 2. 店铺结算：按 store_id 分组统计营收和订单数
     * 3. 退款金额：已取消订单 total_amount 合计
     */
    async summary(ctx) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      // 1. 汇总订单总营收
      const revenueRow = await db('orders')
        .where({ tenant_id: tenantId })
        .whereIn('status', PAID_STATUSES)
        .sum('total_amount as total')
        .first()

      // 2. 按店铺分组统计
      const storeRows = await db('orders as o')
        .join('stores as s', 'o.store_id', 's.store_id')
        .where('o.tenant_id', tenantId)
        .whereIn('o.status', PAID_STATUSES)
        .select('o.store_id', 's.store_name')
        .sum('o.total_amount as revenue')
        .count('o.order_id as order_count')
        .groupBy('o.store_id', 's.store_name')

      // 3. 已取消订单金额计入退款（payments 表无退款流水时的合理口径）
      const refundRow = await db('orders')
        .where({ tenant_id: tenantId, status: 'cancelled' })
        .sum('total_amount as total')
        .count('order_id as cnt')
        .first()

      const paidOrderRow = await db('orders')
        .where({ tenant_id: tenantId })
        .whereIn('status', PAID_STATUSES)
        .count('order_id as cnt')
        .first()

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayRow = await db('orders')
        .where({ tenant_id: tenantId })
        .whereIn('status', PAID_STATUSES)
        .where('created_at', '>=', today)
        .sum('total_amount as total')
        .count('order_id as cnt')
        .first()

      const since = new Date()
      since.setDate(since.getDate() - 6)
      since.setHours(0, 0, 0, 0)
      const trendRows = await db('orders')
        .where({ tenant_id: tenantId })
        .whereIn('status', PAID_STATUSES)
        .where('created_at', '>=', since)
        .select(db.raw('DATE_FORMAT(created_at, "%Y-%m-%d") as day'))
        .count('order_id as order_count')
        .sum('total_amount as gmv')
        .groupByRaw('DATE_FORMAT(created_at, "%Y-%m-%d")')
        .orderBy('day', 'asc')
      const trendMap = new Map(trendRows.map((row) => [
        String(row.day).slice(0, 10),
        {
          orderCount: parseInt(row.order_count, 10) || 0,
          gmv: parseFloat(row.gmv) || 0,
        },
      ]))
      const trend = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(since)
        date.setDate(since.getDate() + index)
        const key = localDateKey(date)
        return { date: key, ...(trendMap.get(key) || { orderCount: 0, gmv: 0 }) }
      })

      const paymentRows = await db('payments')
        .where({ tenant_id: tenantId, status: 'success' })
        .select('pay_method')
        .count('payment_id as payment_count')
        .sum('amount as amount')
        .groupBy('pay_method')
        .orderBy('amount', 'desc')

      const paidOrderCount = parseInt(paidOrderRow?.cnt, 10) || 0
      const orderRevenue = parseFloat(revenueRow?.total) || 0
      const refundAmount = parseFloat(refundRow?.total) || 0

      return {
        orderRevenue,
        refundAmount,
        netRevenue: Math.max(0, orderRevenue - refundAmount),
        paidOrderCount,
        refundOrderCount: parseInt(refundRow?.cnt, 10) || 0,
        avgOrderValue: paidOrderCount > 0 ? orderRevenue / paidOrderCount : 0,
        refundRate: orderRevenue > 0 ? Math.round((refundAmount / orderRevenue) * 1000) / 10 : 0,
        todayRevenue: parseFloat(todayRow?.total) || 0,
        todayOrderCount: parseInt(todayRow?.cnt, 10) || 0,
        trend,
        paymentMethods: paymentRows.map((row) => ({
          method: row.pay_method,
          paymentCount: parseInt(row.payment_count, 10) || 0,
          amount: parseFloat(row.amount) || 0,
        })),

        // 店铺结算明细
        storeSettlement: storeRows.map((r) => ({
          storeId: r.store_id,
          storeName: r.store_name,
          revenue: parseFloat(r.revenue) || 0,
          orderCount: parseInt(r.order_count, 10) || 0,
          share: orderRevenue > 0 ? Math.round((parseFloat(r.revenue) / orderRevenue) * 1000) / 10 : 0,
        })),
      }
    }
  }
}
