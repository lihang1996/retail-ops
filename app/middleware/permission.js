const permissionMap = require('../common/permission-map')

module.exports = (app) => {
  return async (ctx, next) => {
    if (ctx.path.indexOf('/api/') < 0) {
      return next()
    }

    const key = `${ctx.method} ${ctx.path}`
    const required = permissionMap[key]

    // null 表示登录即可；undefined 表示暂未配置，开发期放行
    if (required === undefined) {
      return next()
    }
    if (required === null) {
      return next()
    }

    const userId = ctx.state.user?.user_id
    if (!userId || !app.db) {
      return next()
    }

    const row = await app.db('permissions as p')
      .join('role_permissions as rp', 'p.permission_id', 'rp.permission_id')
      .join('user_roles as ur', 'rp.role_id', 'ur.role_id')
      .where('ur.user_id', userId)
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
