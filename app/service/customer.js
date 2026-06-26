/**
 * @module service/customer
 * @description 客户查询服务：租户内客户列表与详情，支持敏感信息权限控制。
 *
 * 核心职责：
 * 1. 客户列表查询（支持名称模糊搜索）
 * 2. 客户详情查询
 * 3. 手机号脱敏（基于权限控制）
 *
 * 权限控制：
 * - customer:phone:view: 查看完整手机号权限
 * - 无权限时返回脱敏手机号（138****1234）
 *
 * 关键规则：
 * - 手机号按 customer:phone:view 权限脱敏
 * - 无权限时返回 maskPhone 结果
 * - 返回 phone_masked 标识是否已脱敏
 *
 * 使用场景：
 * - 客户管理
 * - 订单客户信息查询
 * - 客户数据统计
 */
const { ensureDb, getTenantId, bizError } = require('../common/org-helper')
const { getUserPermissionCodes, canView } = require('../common/dashboard-helper')
const { paginateQuery } = require('../common/pagination')
const { applyFilters } = require('../common/apply-filters')

const CUSTOMER_LIST_FILTERS = [
  { key: 'customer_name', column: 'c.customer_name', op: 'like' },
  { key: 'phone', column: 'c.phone', op: 'like' },
  { key: 'address', column: 'c.address', op: 'like' },
]

/**
 * 手机号脱敏处理
 * @param {string} phone - 原始手机号
 * @returns {string} 脱敏后的手机号
 *
 * 脱敏规则：
 * - 保留前 3 位和后 4 位
 * - 中间用 **** 替换
 *
 * @example
 * maskPhone('13812341234') // => '138****1234'
 * maskPhone('12345')       // => '***'
 * maskPhone(null)          // => null
 */
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone ? '***' : null
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class CustomerService extends BaseService {
    /**
     * 列出客户，按权限决定是否展示完整手机号
     * @param {Object} ctx - Koa 上下文
     * @param {Object} query - 查询参数
     * @param {string} query.customer_name - 客户名称模糊搜索
     * @returns {Object} { list, total }
     *
     * 返回字段：
     * - customer_id: 客户 ID
     * - customer_name: 客户姓名
     * - phone: 手机号（根据权限决定是否脱敏）
     * - phone_masked: 是否已脱敏（true/false）
     * - email: 邮箱
     * - address: 地址
     * - created_at: 创建时间
     *
     * 权限控制：
     * - 有 customer:phone:view 权限：返回完整手机号
     * - 无权限：返回脱敏手机号
     */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = ctx.state.user?.user_id

      // 查询用户权限
      const perms = await getUserPermissionCodes(db, userId, tenantId)
      const showPhone = canView(perms, 'customer:phone:view')

      const orderAgg = db('orders')
        .where({ tenant_id: tenantId })
        .select('customer_id')
        .count({ order_count: 'order_id' })
        .sum({ total_spent: 'total_amount' })
        .max({ last_order_at: 'created_at' })
        .groupBy('customer_id')

      // 构建查询
      let qb = db('customers as c')
        .leftJoin(orderAgg.as('os'), 'c.customer_id', 'os.customer_id')
        .where('c.tenant_id', tenantId)
        .select(
          'c.*',
          db.raw('COALESCE(os.order_count, 0) as order_count'),
          db.raw('COALESCE(os.total_spent, 0) as total_spent'),
          'os.last_order_at'
        )

      qb = applyFilters(qb, query, CUSTOMER_LIST_FILTERS)
      if (query.customer_segment === 'vip') {
        qb = qb.andWhere(function matchVip() {
          this.whereRaw('COALESCE(os.order_count, 0) >= 5')
            .orWhereRaw('COALESCE(os.total_spent, 0) >= 1000')
        })
      }
      if (query.customer_segment === 'repeat') {
        qb = qb.andWhereRaw('COALESCE(os.order_count, 0) >= 2')
          .andWhereRaw('COALESCE(os.order_count, 0) < 5')
          .andWhereRaw('COALESCE(os.total_spent, 0) < 1000')
      }
      if (query.customer_segment === 'active') {
        qb = qb.andWhereRaw('COALESCE(os.order_count, 0) = 1')
          .andWhereRaw('COALESCE(os.total_spent, 0) < 1000')
      }
      if (query.customer_segment === 'new') qb = qb.andWhereRaw('COALESCE(os.order_count, 0) = 0')

      const result = await paginateQuery(qb.orderBy('c.created_at', 'desc'), query, { countColumn: 'c.customer_id' })

      // 根据权限处理手机号
      const list = result.list.map((row) => {
        const orderCount = parseInt(row.order_count, 10) || 0
        const totalSpent = parseFloat(row.total_spent) || 0
        let customerSegment = 'new'
        if (orderCount >= 5 || totalSpent >= 1000) customerSegment = 'vip'
        else if (orderCount >= 2) customerSegment = 'repeat'
        else if (orderCount === 1) customerSegment = 'active'
        return {
          ...row,
          phone: showPhone ? row.phone : maskPhone(row.phone),
          phone_masked: !showPhone,
          order_count: orderCount,
          total_spent: totalSpent,
          avg_order_value: orderCount > 0 ? totalSpent / orderCount : 0,
          last_order_at: row.last_order_at || null,
          customer_segment: customerSegment,
        }
      })

      return { list, total: result.total }
    }

    /**
     * 获取单个客户详情，手机号同样受权限控制
     * @param {Object} ctx - Koa 上下文
     * @param {Object} query - 查询参数
     * @param {string} query.customer_id - 客户 ID（必填）
     * @returns {Object} 客户详情（含脱敏标识）
     *
     * 返回字段：
     * - customer_id: 客户 ID
     * - customer_name: 客户姓名
     * - phone: 手机号（根据权限决定是否脱敏）
     * - phone_masked: 是否已脱敏（true/false）
     * - email: 邮箱
     * - address: 详细地址
     * - level: 客户等级
     * - points: 积分
     * - created_at: 创建时间
     */
    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = ctx.state.user?.user_id

      // 查询用户权限
      const perms = await getUserPermissionCodes(db, userId, tenantId)
      const showPhone = canView(perms, 'customer:phone:view')

      const { customer_id: customerId } = query
      if (!customerId) bizError('customer_id 不能为空')

      // 查询客户信息
      const row = await db('customers').where({ tenant_id: tenantId, customer_id: customerId }).first()
      if (!row) bizError('客户不存在', 40400)

      // 根据权限处理手机号
      return {
        ...row,
        phone: showPhone ? row.phone : maskPhone(row.phone),
        phone_masked: !showPhone,
      }
    }
  }
}
