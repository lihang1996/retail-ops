/**
 * @module middleware/auth
 * @description JWT 认证中间件：校验 Bearer token 与会话有效性。
 *
 * 核心职责：
 * 1. 白名单路径（login/health/static 等）跳过认证
 * 2. API 路径必须携带有效 JWT token
 * 3. 校验 token 合法性（签名、过期时间）
 * 4. 校验会话有效性（login_sessions.status=active）
 * 5. 将解析后的用户信息注入 ctx.state.user
 *
 * 关键规则：
 * - 须 login_sessions.status=active 才视为有效登录，防止 revoked token 继续使用
 * - 认证失败返回 40100（未登录）或 40101（登录已过期）
 */
const jwt = require('jsonwebtoken')
const { ERROR_CODES } = require('../common/error-codes')
const { getPermissionSnapshotVersion } = require('../common/permission-resolver')

// 白名单：这些路径前缀跳过认证检查
const WHITE_LIST_PREFIX = [
  '/api/auth/login',  // 登录接口本身不需要认证
  '/health',          // 健康检查接口
  '/view/',           // 前端页面路由（由前端控制跳转）
  '/static/',         // 静态资源
  '/dist/',           // 构建后的前端资源
]

module.exports = (app) => {
  return async (ctx, next) => {
    // 1. 白名单路径跳过认证
    if (WHITE_LIST_PREFIX.some((p) => ctx.path.startsWith(p))) {
      return next()
    }

    // 2. 非 API 路径跳过认证（如根路径 /）
    if (ctx.path.indexOf('/api/') < 0) {
      return next()
    }

    // 3. 提取 Authorization 头中的 Bearer token
    const token = (ctx.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) {
      ctx.status = 200 // 业务错误码统一返回 200，由 body.code 区分
      ctx.body = { success: false, code: ERROR_CODES.UNAUTHORIZED, message: '未登录' }
      return
    }

    // 4. 验证 JWT token 合法性（签名、过期时间）
    let payload
    try {
      payload = jwt.verify(token, app.config.jwt.secret)
    } catch (e) {
      // token 过期或签名错误
      ctx.status = 200
      ctx.body = { success: false, code: ERROR_CODES.SESSION_EXPIRED, message: '登录已过期' }
      return
    }

    // 5. 校验会话有效性（防止 logout 后的 token 继续使用）
    if (!app.db) {
      ctx.status = 200
      ctx.body = { success: false, code: ERROR_CODES.INTERNAL, message: '认证服务不可用' }
      return
    }

    const session = await app.db('login_sessions')
      .where({ session_id: payload.session_id, status: 'active' })
      .first()
    if (!session) {
      // 会话已撤销或不存在
      ctx.status = 200
      ctx.body = { success: false, code: ERROR_CODES.SESSION_EXPIRED, message: '登录已过期' }
      return
    }

    if (!payload.permission_version) {
      ctx.status = 200
      ctx.body = { success: false, code: ERROR_CODES.SESSION_EXPIRED, message: '登录状态已升级，请重新登录' }
      return
    }

    try {
      const currentVersion = await getPermissionSnapshotVersion(app.db, payload.user_id, payload.tenant_id)
      if (currentVersion !== payload.permission_version) {
        ctx.status = 200
        ctx.body = { success: false, code: ERROR_CODES.SESSION_EXPIRED, message: '权限已更新，请重新登录' }
        return
      }
    } catch (error) {
      app.logger?.error?.('[auth] permission version check failed', error)
      ctx.status = 200
      ctx.body = { success: false, code: ERROR_CODES.INTERNAL, message: '认证服务不可用' }
      return
    }

    // 6. 认证通过，将用户信息注入上下文供后续中间件和控制器使用
    ctx.state.user = payload // { user_id, tenant_id, session_id, jti, permission_version }
    await next()
  }
}
