/**
 * @module service/marketing
 * @description 营销活动查询服务：活动列表与详情（含关联商品）。
 *
 * 核心职责：
 * 1. 营销活动列表查询（支持状态筛选）
 * 2. 营销活动详情查询（含关联商品）
 *
 * 业务规则：
 * - 活动与商品映射均按 tenant_id 隔离
 * - 一个活动可关联多个商品
 * - 商品可参与多个活动
 *
 * 数据模型：
 * - marketing_activities: 活动主表
 * - marketing_activity_products: 活动-商品关联表（多对多）
 * - products: 商品表
 *
 * 使用场景：
 * - 营销活动管理
 * - 活动商品配置
 * - 促销活动分析
 */
const { ensureDb, getTenantId, getOperatorId, bizError, idGen } = require('../common/org-helper')
const { paginateQuery } = require('../common/pagination')
const { applyEndingSoonEndAtFilter, getActivityDaysRemaining } = require('../common/marketing-helper')
const { applyFilters } = require('../common/apply-filters')

const MARKETING_ACTIVITY_FILTERS = [
  { key: 'status', column: 'a.status' },
  { key: 'activity_name', column: 'a.activity_name', op: 'like' },
  { key: 'activity_type', column: 'a.activity_type' },
]

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class MarketingService extends BaseService {
    /**
     * 列出当前租户营销活动
     * @param {Object} ctx - Koa 上下文
     * @param {Object} query - 查询参数
     * @param {string} query.status - 状态筛选（active/inactive/expired）
     * @returns {Object} { list, total }
     *
     * 返回字段：
     * - activity_id: 活动 ID
     * - activity_name: 活动名称
     * - activity_type: 活动类型（discount/gift/bundle）
     * - status: 活动状态
     * - start_time: 开始时间
     * - end_time: 结束时间
     */
    async listActivities(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('marketing_activities as a')
        .where('a.tenant_id', tenantId)
        .select('a.*')

      qb = applyFilters(qb, query, MARKETING_ACTIVITY_FILTERS)
      if (query.ending_soon === '1') {
        qb = applyEndingSoonEndAtFilter(qb.andWhere('a.status', 'active'), 'a.end_at')
      }

      const result = await paginateQuery(qb.orderBy('a.created_at', 'desc'), query, { countColumn: 'a.activity_id' })
      const activityIds = result.list.map((row) => row.activity_id)
      const productRows = activityIds.length
        ? await db('marketing_activity_products')
          .where({ tenant_id: tenantId })
          .whereIn('activity_id', activityIds)
          .select('activity_id')
          .countDistinct({ product_count: 'product_id' })
          .groupBy('activity_id')
        : []
      const productMap = productRows.reduce((map, row) => {
        map[row.activity_id] = parseInt(row.product_count, 10) || 0
        return map
      }, {})
      const now = Date.now()
      return {
        ...result,
        list: result.list.map((row) => {
          const start = row.start_at ? new Date(row.start_at).getTime() : null
          const end = row.end_at ? new Date(row.end_at).getTime() : null
          let lifecycle = row.status
          if (start && start > now) lifecycle = 'scheduled'
          else if (end && end < now) lifecycle = 'expired'
          else if (row.status === 'active') lifecycle = 'active'
          return {
            ...row,
            product_count: productMap[row.activity_id] || 0,
            lifecycle,
            days_remaining: getActivityDaysRemaining(row.end_at, new Date(now)),
          }
        }),
      }
    }

    /**
     * 获取活动详情及关联商品列表
     * @param {Object} ctx - Koa 上下文
     * @param {Object} query - 查询参数
     * @param {string} query.activity_id - 活动 ID（必填）
     * @returns {Object} { ...activity, products }
     *
     * 返回详情包含：
     * - activity: 活动基本信息
     * - products: 关联商品列表（含商品名称）
     *
     * 商品字段：
     * - product_id: 商品 ID
     * - product_name: 商品名称
     * - discount_rate: 折扣率
     * - gift_qty: 赠品数量
     */
    async getActivity(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { activity_id: activityId } = query
      if (!activityId) bizError('activity_id 不能为空')

      // 查询活动基本信息
      const activity = await db('marketing_activities')
        .where({ tenant_id: tenantId, activity_id: activityId })
        .first()
      if (!activity) bizError('活动不存在', 40400)

      // 查询关联商品列表
      const products = await db('marketing_activity_products as map')
        .leftJoin('products as p', 'map.product_id', 'p.product_id')
        .leftJoin('product_skus as sku', 'map.sku_id', 'sku.sku_id')
        .where('map.tenant_id', tenantId)
        .andWhere('map.activity_id', activityId)
        .select('map.*', 'p.product_name', 'sku.sku_code', 'sku.sale_price')

      return { ...activity, products }
    }
  }
}
