/**
 * @module middleware/tenant-context
 * @description 租户上下文中间件：加载租户信息并限制异常租户写操作。
 *
 * 核心职责：
 * 1. 从 JWT payload 提取 tenant_id 并加载租户信息
 * 2. 检查租户状态，禁止异常租户访问或写入
 * 3. 将租户信息注入 ctx.state.tenant 供后续使用
 *
 * 租户状态控制：
 * - disabled（已停用）：拒绝所有请求
 * - frozen/overdue（冻结/欠费）：禁止 POST/PUT/DELETE/PATCH 写操作，但允许 logout
 * - active（正常）：无限制
 *
 * 关键规则：
 * - 防止欠费或冻结租户继续变更业务数据
 * - logout 接口例外，确保用户始终可以登出
 */
module.exports = (app) => {
  return async (ctx, next) => {
    const user = ctx.state.user // auth 中间件注入的用户信息
    if (!user?.tenant_id) {
      // 未登录或无租户信息，跳过（依赖 auth 中间件先拦截）
      return next()
    }

    if (!app.db) {
      ctx.status = 200
      ctx.body = { success: false, code: 50000, message: '租户服务不可用' }
      return
    }

    // 从数据库加载租户完整信息
    const tenant = await app.db('tenants').where({ tenant_id: user.tenant_id }).first()

    if (!tenant) {
      ctx.status = 200
      ctx.body = { success: false, code: 50000, message: '租户不存在' }
      return
    }

    // 检查租户状态：disabled 租户拒绝所有请求
    if (tenant.status === 'disabled') {
      ctx.status = 200
      ctx.body = { success: false, code: 40301, message: '租户已停用' }
      return
    }

    // 将租户信息注入上下文供后续使用
    ctx.state.tenant = {
      tenantId: tenant.tenant_id,
      tenantName: tenant.tenant_name,
      status: tenant.status, // active/frozen/overdue/disabled
    }

    // 冻结/欠费租户限制写操作（防止继续变更业务数据）
    const writeMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
    if (writeMethods.includes(ctx.method) && ['frozen', 'overdue'].includes(tenant.status)) {
      // 例外：允许 logout，确保用户始终可以登出
      if (ctx.path.indexOf('/api/auth/logout') < 0) {
        ctx.status = 200
        ctx.body = { success: false, code: 40301, message: '租户状态限制写操作' }
        return
      }
    }

    await next()
  }
}
