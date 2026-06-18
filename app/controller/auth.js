module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class AuthController extends BaseController {
    async login(ctx) {
      const { account, password } = ctx.request.body || {}
      const result = await app.service.auth.login({
        account,
        password,
        ip: ctx.ip,
        userAgent: ctx.headers['user-agent'],
      })
      if (!result.ok) {
        return this.fail(ctx, result.message, result.code)
      }
      this.success(ctx, {
        token: result.token,
        user: result.user,
        tenant: result.tenant,
        defaultEntry: result.defaultEntry,
      })
    }

    async logout(ctx) {
      const user = ctx.state.user
      if (user) {
        await app.service.auth.logout({ sessionId: user.session_id, userId: user.user_id })
      }
      this.success(ctx, { ok: true })
    }

    async me(ctx) {
      const user = ctx.state.user
      const data = await app.service.auth.getCurrentUser({
        userId: user.user_id,
        tenantId: user.tenant_id,
      })
      this.success(ctx, data)
    }

    async permissions(ctx) {
      const user = ctx.state.user
      const data = await app.service.auth.getPermissionSnapshot({
        userId: user.user_id,
        tenantId: user.tenant_id,
      })
      this.success(ctx, data)
    }
  }
}
