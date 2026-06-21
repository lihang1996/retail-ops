/**
 * @module service/customer
 * @description 客户查询服务：租户内客户列表与详情。
 * 关键规则：手机号按 customer:phone:view 权限脱敏，无权限时返回 maskPhone 结果。
 */
const { ensureDb, getTenantId, bizError } = require('../common/org-helper')
const { getUserPermissionCodes, canView } = require('../common/dashboard-helper')

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone ? '***' : null
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class CustomerService extends BaseService {
    /** 列出客户，按权限决定是否展示完整手机号 */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = ctx.state.user?.user_id
      const perms = await getUserPermissionCodes(db, userId, tenantId)
      const showPhone = canView(perms, 'customer:phone:view')

      let qb = db('customers').where({ tenant_id: tenantId })
      if (query.customer_name) qb = qb.andWhere('customer_name', 'like', `%${query.customer_name}%`)

      const rows = await qb.orderBy('created_at', 'desc').limit(200)
      const list = rows.map((row) => ({
        ...row,
        phone: showPhone ? row.phone : maskPhone(row.phone),
        phone_masked: !showPhone,
      }))

      return { list, total: list.length }
    }

    /** 获取单个客户详情，手机号同样受权限控制 */
    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = ctx.state.user?.user_id
      const perms = await getUserPermissionCodes(db, userId, tenantId)
      const showPhone = canView(perms, 'customer:phone:view')
      const { customer_id: customerId } = query
      if (!customerId) bizError('customer_id 不能为空')

      const row = await db('customers').where({ tenant_id: tenantId, customer_id: customerId }).first()
      if (!row) bizError('客户不存在', 40400)

      return {
        ...row,
        phone: showPhone ? row.phone : maskPhone(row.phone),
        phone_masked: !showPhone,
      }
    }
  }
}
