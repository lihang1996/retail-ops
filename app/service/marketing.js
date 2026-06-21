/**
 * @module service/marketing
 * @description 营销活动查询服务：活动列表与详情（含关联商品）。
 * 关键规则：活动与商品映射均按 tenant_id 隔离。
 */
const { ensureDb, getTenantId, getOperatorId, bizError, idGen } = require('../common/org-helper')

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class MarketingService extends BaseService {
    /** 列出当前租户营销活动 */
    async listActivities(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('marketing_activities').where({ tenant_id: tenantId })
      if (query.status) qb = qb.andWhere({ status: query.status })
      const list = await qb.orderBy('created_at', 'desc')
      return { list, total: list.length }
    }

    /** 获取活动详情及关联商品列表 */
    async getActivity(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { activity_id: activityId } = query
      if (!activityId) bizError('activity_id 不能为空')

      const activity = await db('marketing_activities')
        .where({ tenant_id: tenantId, activity_id: activityId })
        .first()
      if (!activity) bizError('活动不存在', 40400)

      const products = await db('marketing_activity_products as map')
        .leftJoin('products as p', 'map.product_id', 'p.product_id')
        .where('map.tenant_id', tenantId)
        .andWhere('map.activity_id', activityId)
        .select('map.*', 'p.product_name')

      return { ...activity, products }
    }
  }
}
