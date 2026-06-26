/**
 * @module middleware/permission
 * @description 接口权限中间件：基于 RBAC 校验用户操作权限。
 *
 * 核心职责：
 * 1. 从 permission-map 获取接口所需的权限码
 * 2. 查询用户在当前租户下是否拥有该权限
 * 3. 权限不足返回 40301 错误
 *
 * 权限映射规则（permission-map.js）：
 * - undefined：未映射，开发期自动放行
 * - null：仅需登录态，无需特定权限
 * - 'permission:code'：需要特定权限码
 * - ['permission:a', 'permission:b']：满足任一权限即可
 *
 * RBAC 权限链：
 * user → user_roles → role_permissions → permissions
 * 特别注意：role.tenant_id 必须匹配当前用户租户，防止跨租户权限绕过
 *
 * 示例：
 * - 'GET /api/proj/product/list': 'product:view'
 * - 'POST /api/proj/stock/inbound': 'stock:inbound'
 * - 'GET /api/proj/product/sku_list': ['product:view', 'stock:inbound']
 * - 'GET /api/auth/me': null（仅需登录）
 */
const permissionMap = require('../common/permission-map')
const { userHasAnyPermission } = require('../common/permission-resolver')

const isProd = ['production', 'prod'].includes(process.env.NODE_ENV)

module.exports = (app) => {
  return async (ctx, next) => {
    // 1. 仅检查 API 路径，非 API 跳过
    if (ctx.path.indexOf('/api/') < 0) {
      return next()
    }

    // 2. 构建映射键：METHOD + PATH（如 'GET /api/proj/product/list'）
    const key = `${ctx.method} ${ctx.path}`
    const required = permissionMap[key]

    // 3. undefined 表示未映射，开发期自动放行（生产建议改为拒绝）
    if (required === undefined) {
      if (isProd) {
        ctx.status = 200
        ctx.body = { success: false, code: 40301, message: '接口未配置权限' }
        return
      }
      return next()
    }

    // 4. null 表示仅需登录态，无需特定权限
    if (required === null) {
      return next()
    }

    // 5. 提取当前用户和租户信息
    const userId = ctx.state.user?.user_id
    const tenantId = ctx.state.user?.tenant_id
    if (!userId || !tenantId) {
      ctx.status = 200
      ctx.body = { success: false, code: 40101, message: '登录信息不完整，请重新登录' }
      return
    }

    if (!app.db) {
      ctx.status = 200
      ctx.body = { success: false, code: 50000, message: '权限服务不可用' }
      return
    }

    // 6. 查询用户是否拥有所需权限
    // RBAC 权限链：user → user_roles → role_permissions → permissions
    const requiredList = Array.isArray(required) ? required : [required]
    let allowed = false
    try {
      allowed = await userHasAnyPermission(app.db, userId, tenantId, requiredList)
    } catch (error) {
      app.logger?.error?.('[permission] check failed', error)
      ctx.status = 200
      ctx.body = { success: false, code: 50000, message: '权限校验失败' }
      return
    }

    if (!allowed) {
      ctx.status = 200
      ctx.body = { success: false, code: 40301, message: '无权限执行该操作' }
      return
    }

    // 8. 权限校验通过，继续处理请求
    await next()
  }
}
