const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const idGen = require('../common/id')

const MAX_LOGIN_FAIL = 5

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class AuthService extends BaseService {
    async login({ account, password, ip, userAgent }) {
      const db = app.db
      if (!db) throw new Error('数据库未配置')

      const user = await db('users').where({ account }).first()
      if (!user) {
        await this._logLogin({ account, action: 'login', ip, userAgent, result: 'fail', reason: 'invalid' })
        return { ok: false, code: 40100, message: '账号或密码错误' }
      }

      if (user.status === 'locked' || (user.locked_until && new Date(user.locked_until) > new Date())) {
        return { ok: false, code: 40100, message: '账号已锁定' }
      }

      const match = await bcrypt.compare(password, user.password_hash)
      if (!match) {
        const failCount = (user.login_fail_count || 0) + 1
        const patch = { login_fail_count: failCount }
        if (failCount >= MAX_LOGIN_FAIL) {
          patch.status = 'locked'
          patch.locked_until = new Date(Date.now() + 30 * 60 * 1000)
        }
        await db('users').where({ user_id: user.user_id }).update(patch)
        await this._logLogin({ account, userId: user.user_id, action: 'login', ip, userAgent, result: 'fail' })
        return { ok: false, code: 40100, message: '账号或密码错误' }
      }

      const member = await db('tenant_members').where({ user_id: user.user_id, status: 'active' }).first()
      if (!member) {
        return { ok: false, code: 40100, message: '账号或密码错误' }
      }

      const tenant = await db('tenants').where({ tenant_id: member.tenant_id }).first()
      if (!tenant || tenant.status === 'disabled') {
        return { ok: false, code: 40100, message: '租户不可用' }
      }

      await db('users').where({ user_id: user.user_id }).update({ login_fail_count: 0, status: 'active', locked_until: null })

      const sessionId = idGen.next('sess')
      const jti = idGen.next('jti')
      const expiresIn = app.config.jwt?.expiresIn || '7d'
      const token = jwt.sign(
        { user_id: user.user_id, tenant_id: member.tenant_id, session_id: sessionId, jti },
        app.config.jwt.secret,
        { expiresIn }
      )

      const decoded = jwt.decode(token)
      await db('login_sessions').insert({
        session_id: sessionId,
        user_id: user.user_id,
        tenant_id: member.tenant_id,
        token_jti: jti,
        expires_at: new Date(decoded.exp * 1000),
        status: 'active',
      })

      await this._logLogin({
        account,
        userId: user.user_id,
        tenantId: member.tenant_id,
        action: 'login',
        ip,
        userAgent,
        result: 'success',
      })

      if (app.service?.audit) {
        await app.service.audit.record({
          tenantId: member.tenant_id,
          operatorId: user.user_id,
          actionCode: 'auth:login',
          detail: { account },
        })
      }

      return {
        ok: true,
        token,
        user: {
          userId: user.user_id,
          account: user.account,
          displayName: user.display_name,
        },
        tenant: {
          tenantId: tenant.tenant_id,
          tenantName: tenant.tenant_name,
          status: tenant.status,
        },
        defaultEntry: '/view/project-list',
      }
    }

    async logout({ sessionId, userId }) {
      if (!app.db || !sessionId) return
      await app.db('login_sessions').where({ session_id: sessionId, user_id: userId }).update({ status: 'revoked' })
    }

    async getCurrentUser({ userId, tenantId }) {
      const user = await app.db('users').where({ user_id: userId }).first()
      const tenant = await app.db('tenants').where({ tenant_id: tenantId }).first()
      return {
        user: {
          userId: user.user_id,
          account: user.account,
          displayName: user.display_name,
        },
        tenant: {
          tenantId: tenant.tenant_id,
          tenantName: tenant.tenant_name,
          status: tenant.status,
        },
      }
    }

    async getPermissionSnapshot({ userId }) {
      const rows = await app.db('permissions as p')
        .join('role_permissions as rp', 'p.permission_id', 'rp.permission_id')
        .join('user_roles as ur', 'rp.role_id', 'ur.role_id')
        .where('ur.user_id', userId)
        .select('p.permission_code', 'p.permission_type')

      const menus = []
      const actions = []
      rows.forEach((r) => {
        if (r.permission_type === 'menu') menus.push(r.permission_code)
        else if (r.permission_type === 'action') actions.push(r.permission_code)
      })
      return { menus, actions, fields: {}, dataScope: {} }
    }

    async _logLogin(payload) {
      if (!app.db) return
      await app.db('login_logs').insert({
        account: payload.account,
        user_id: payload.userId || null,
        tenant_id: payload.tenantId || null,
        action: payload.action,
        ip: payload.ip,
        user_agent: payload.userAgent,
        result: payload.result,
        reason: payload.reason || null,
      })
    }
  }
}
