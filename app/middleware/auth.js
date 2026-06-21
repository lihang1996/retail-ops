/**
 * @module middleware/auth
 * @description JWT 认证中间件：校验 Bearer token 与会话有效性。
 * 关键规则：白名单路径（login/health/static 等）跳过；API 无 token 返回 40100；
 * 须 login_sessions.status=active 才视为有效登录，防止 revoked token 继续使用。
 */
const jwt = require('jsonwebtoken')

const WHITE_LIST_PREFIX = [
  '/api/auth/login',
  '/health',
  '/view/',
  '/static/',
  '/dist/',
]

module.exports = (app) => {
  return async (ctx, next) => {
    if (WHITE_LIST_PREFIX.some((p) => ctx.path.startsWith(p))) {
      return next()
    }
    if (ctx.path.indexOf('/api/') < 0) {
      return next()
    }

    const token = (ctx.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) {
      ctx.status = 200
      ctx.body = { success: false, code: 40100, message: '未登录' }
      return
    }

    try {
      const payload = jwt.verify(token, app.config.jwt.secret)
      if (app.db) {
        const session = await app.db('login_sessions')
          .where({ session_id: payload.session_id, status: 'active' })
          .first()
        if (!session) {
          ctx.status = 200
          ctx.body = { success: false, code: 40101, message: '登录已过期' }
          return
        }
      }
      ctx.state.user = payload
      await next()
    } catch (e) {
      ctx.status = 200
      ctx.body = { success: false, code: 40101, message: '登录已过期' }
    }
  }
}
