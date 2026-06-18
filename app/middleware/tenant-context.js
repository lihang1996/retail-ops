module.exports = (app) => {
  return async (ctx, next) => {
    const user = ctx.state.user
    if (!user?.tenant_id) {
      return next()
    }

    const tenant = app.db
      ? await app.db('tenants').where({ tenant_id: user.tenant_id }).first()
      : { tenant_id: user.tenant_id, status: 'active' }

    if (!tenant) {
      ctx.status = 200
      ctx.body = { success: false, code: 50000, message: '租户不存在' }
      return
    }

    if (tenant.status === 'disabled') {
      ctx.status = 200
      ctx.body = { success: false, code: 40301, message: '租户已停用' }
      return
    }

    ctx.state.tenant = {
      tenantId: tenant.tenant_id,
      tenantName: tenant.tenant_name,
      status: tenant.status,
    }

    // 冻结/欠费租户限制写操作
    const writeMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
    if (writeMethods.includes(ctx.method) && ['frozen', 'overdue'].includes(tenant.status)) {
      if (ctx.path.indexOf('/api/auth/logout') < 0) {
        ctx.status = 200
        ctx.body = { success: false, code: 40301, message: '租户状态限制写操作' }
        return
      }
    }

    await next()
  }
}
