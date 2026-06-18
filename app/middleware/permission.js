const permissionMap = require('../common/permission-map')

module.exports = (app) => {
  return async (ctx, next) => {
    if (ctx.path.indexOf('/api/') < 0) {
      return next()
    }

    const key = `${ctx.method} ${ctx.path}`
    const required = permissionMap[key]

    if (required === undefined) {
      return next()
    }
    if (required === null) {
      return next()
    }

    const userId = ctx.state.user?.user_id
    const tenantId = ctx.state.user?.tenant_id
    if (!userId || !tenantId || !app.db) {
      return next()
    }

    const row = await app.db('permissions as p')
      .join('role_permissions as rp', 'p.permission_id', 'rp.permission_id')
      .join('user_roles as ur', 'rp.role_id', 'ur.role_id')
      .join('roles as r', 'ur.role_id', 'r.role_id')
      .where('ur.user_id', userId)
      .andWhere('r.tenant_id', tenantId)
      .andWhere('p.permission_code', required)
      .first()

    if (!row) {
      ctx.status = 200
      ctx.body = { success: false, code: 40301, message: '无权限执行该操作' }
      return
    }

    await next()
  }
}
