const bcrypt = require('bcryptjs')
const {
  ensureDb,
  getTenantId,
  getOperatorId,
  bizError,
  audit,
  idGen,
  syncUserRoles,
  assertDeptInTenant,
} = require('../common/org-helper')

const DEFAULT_PASSWORD = 'demo123'

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class OrgService extends BaseService {
    async listDepartments(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('departments').where({ tenant_id: tenantId })
      if (query.status) qb = qb.andWhere({ status: query.status })
      if (query.dept_name) qb = qb.andWhere('dept_name', 'like', `%${query.dept_name}%`)
      const list = await qb.orderBy('created_at', 'desc')
      return { list, total: list.length }
    }

    async getDepartment(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { dept_id: deptId } = query
      if (!deptId) bizError('dept_id 不能为空')
      const row = await db('departments').where({ tenant_id: tenantId, dept_id: deptId }).first()
      if (!row) bizError('部门不存在', 40400)
      return row
    }

    async createDepartment(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { dept_name: deptName, parent_id: parentId } = body
      if (!deptName) bizError('部门名称不能为空')

      if (parentId) {
        const parent = await db('departments').where({ tenant_id: tenantId, dept_id: parentId }).first()
        if (!parent) bizError('上级部门不存在', 40400)
      }

      const deptId = idGen.next('dept')
      await db('departments').insert({
        dept_id: deptId,
        tenant_id: tenantId,
        parent_id: parentId || null,
        dept_name: deptName,
        status: 'active',
      })

      await audit(app, ctx, {
        actionCode: 'org:department:update',
        objectType: 'department',
        objectId: deptId,
        detail: { deptName },
      })

      return { deptId }
    }

    async updateDepartment(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { dept_id: deptId, dept_name: deptName, parent_id: parentId, status } = body
      if (!deptId) bizError('dept_id 不能为空')

      const dept = await db('departments').where({ tenant_id: tenantId, dept_id: deptId }).first()
      if (!dept) bizError('部门不存在', 40400)

      const patch = {}
      if (deptName) patch.dept_name = deptName
      if (parentId !== undefined) {
        if (parentId && parentId === deptId) bizError('上级部门不能是自己')
        patch.parent_id = parentId || null
      }
      if (status) patch.status = status

      await db('departments').where({ dept_id: deptId }).update(patch)
      await audit(app, ctx, {
        actionCode: 'org:department:update',
        objectType: 'department',
        objectId: deptId,
        detail: patch,
      })
      return { deptId }
    }

    async disableDepartment(ctx, body = {}) {
      return this.updateDepartment(ctx, { ...body, status: 'disabled' })
    }

    async deleteDepartment(ctx, body = {}) {
      return this.disableDepartment(ctx, body)
    }

    async listUsers(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('tenant_members as tm')
        .join('users as u', 'tm.user_id', 'u.user_id')
        .leftJoin('departments as d', 'tm.dept_id', 'd.dept_id')
        .where('tm.tenant_id', tenantId)
        .select(
          'u.user_id',
          'u.account',
          'u.display_name',
          'u.status',
          'u.created_at',
          'tm.dept_id',
          'd.dept_name',
          'tm.status as member_status'
        )

      if (query.account) qb = qb.andWhere('u.account', 'like', `%${query.account}%`)
      if (query.status) qb = qb.andWhere('u.status', query.status)

      const list = await qb.orderBy('u.created_at', 'desc')
      const roleRows = await db('user_roles as ur')
        .join('roles as r', 'ur.role_id', 'r.role_id')
        .where('r.tenant_id', tenantId)
        .select('ur.user_id', 'r.role_id', 'r.role_name', 'r.role_code')

      const roleMap = {}
      roleRows.forEach((item) => {
        if (!roleMap[item.user_id]) roleMap[item.user_id] = []
        roleMap[item.user_id].push({
          roleId: item.role_id,
          roleName: item.role_name,
          roleCode: item.role_code,
        })
      })

      return {
        list: list.map((item) => ({
          ...item,
          roles: roleMap[item.user_id] || [],
        })),
        total: list.length,
      }
    }

    async getUser(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { user_id: userId } = query
      if (!userId) bizError('user_id 不能为空')

      const row = await db('tenant_members as tm')
        .join('users as u', 'tm.user_id', 'u.user_id')
        .leftJoin('departments as d', 'tm.dept_id', 'd.dept_id')
        .where({ 'tm.tenant_id': tenantId, 'u.user_id': userId })
        .select(
          'u.user_id',
          'u.account',
          'u.display_name',
          'u.status',
          'tm.dept_id',
          'd.dept_name'
        )
        .first()

      if (!row) bizError('用户不存在', 40400)
      return row
    }

    async createUser(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const {
        account,
        display_name: displayName,
        password,
        dept_id: deptId,
        role_ids: roleIds = [],
      } = body

      if (!account || !displayName) bizError('账号和姓名不能为空')
      await assertDeptInTenant(db, tenantId, deptId)
      const exists = await db('users').where({ account }).first()
      if (exists) bizError('账号已存在', 40900)

      const userId = idGen.next('user')
      const memberId = idGen.next('member')
      const passwordHash = await bcrypt.hash(password || DEFAULT_PASSWORD, 10)

      await db.transaction(async (trx) => {
        await trx('users').insert({
          user_id: userId,
          account,
          display_name: displayName,
          password_hash: passwordHash,
          status: 'active',
        })
        await trx('tenant_members').insert({
          member_id: memberId,
          tenant_id: tenantId,
          user_id: userId,
          dept_id: deptId || null,
          status: 'active',
        })
        await syncUserRoles(trx, tenantId, userId, roleIds)
      })

      await audit(app, ctx, {
        actionCode: 'org:user:create',
        objectType: 'user',
        objectId: userId,
        detail: { account, roleIds },
      })

      return { userId }
    }

    async updateUser(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const {
        user_id: userId,
        display_name: displayName,
        dept_id: deptId,
        role_ids: roleIds,
        status,
      } = body
      if (!userId) bizError('user_id 不能为空')

      const member = await db('tenant_members').where({ tenant_id: tenantId, user_id: userId }).first()
      if (!member) bizError('用户不存在', 40400)

      if (deptId !== undefined) {
        await assertDeptInTenant(db, tenantId, deptId)
      }

      await db.transaction(async (trx) => {
        const userPatch = {}
        if (displayName) userPatch.display_name = displayName
        if (status) userPatch.status = status
        if (Object.keys(userPatch).length) {
          await trx('users').where({ user_id: userId }).update(userPatch)
        }

        if (deptId !== undefined) {
          await trx('tenant_members').where({ member_id: member.member_id }).update({ dept_id: deptId || null })
        }

        if (Array.isArray(roleIds)) {
          await syncUserRoles(trx, tenantId, userId, roleIds)
        }
      })

      await audit(app, ctx, {
        actionCode: 'org:user:update',
        objectType: 'user',
        objectId: userId,
        detail: { displayName, deptId, roleIds, status },
      })

      return { userId }
    }

    async resetUserPassword(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { user_id: userId, password } = body
      if (!userId) bizError('user_id 不能为空')

      const member = await db('tenant_members').where({ tenant_id: tenantId, user_id: userId }).first()
      if (!member) bizError('用户不存在', 40400)

      const passwordHash = await bcrypt.hash(password || DEFAULT_PASSWORD, 10)
      await db('users').where({ user_id: userId }).update({
        password_hash: passwordHash,
        login_fail_count: 0,
        locked_until: null,
        status: 'active',
      })

      await audit(app, ctx, {
        actionCode: 'org:user:update',
        objectType: 'user',
        objectId: userId,
        detail: { action: 'reset_password' },
      })

      return { userId }
    }

    async lockUser(ctx, body = {}) {
      return this._setUserLockState(ctx, body, true)
    }

    async unlockUser(ctx, body = {}) {
      return this._setUserLockState(ctx, body, false)
    }

    async _setUserLockState(ctx, body, locked) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { user_id: userId } = body
      if (!userId) bizError('user_id 不能为空')
      if (userId === getOperatorId(ctx) && locked) bizError('不能锁定当前登录账号')

      const member = await db('tenant_members').where({ tenant_id: tenantId, user_id: userId }).first()
      if (!member) bizError('用户不存在', 40400)

      await db('users').where({ user_id: userId }).update({
        status: locked ? 'locked' : 'active',
        locked_until: locked ? new Date(Date.now() + 30 * 60 * 1000) : null,
        login_fail_count: 0,
      })

      await audit(app, ctx, {
        actionCode: locked ? 'org:user:disable' : 'org:user:update',
        objectType: 'user',
        objectId: userId,
        detail: { action: locked ? 'lock' : 'unlock' },
      })

      return { userId }
    }

    async listRoles(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('roles').where({ tenant_id: tenantId })
      if (query.status) qb = qb.andWhere({ status: query.status })
      if (query.role_name) qb = qb.andWhere('role_name', 'like', `%${query.role_name}%`)
      const list = await qb.orderBy('created_at', 'desc')
      return { list, total: list.length }
    }

    async getRole(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { role_id: roleId } = query
      if (!roleId) bizError('role_id 不能为空')
      const row = await db('roles').where({ tenant_id: tenantId, role_id: roleId }).first()
      if (!row) bizError('角色不存在', 40400)
      return row
    }

    async createRole(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { role_code: roleCode, role_name: roleName } = body
      if (!roleCode || !roleName) bizError('角色编码和名称不能为空')

      const exists = await db('roles').where({ tenant_id: tenantId, role_code: roleCode }).first()
      if (exists) bizError('角色编码已存在', 40900)

      const roleId = idGen.next('role')
      await db('roles').insert({
        role_id: roleId,
        tenant_id: tenantId,
        role_code: roleCode,
        role_name: roleName,
        status: 'active',
      })

      await audit(app, ctx, {
        actionCode: 'org:role:create',
        objectType: 'role',
        objectId: roleId,
        detail: { roleCode, roleName },
      })

      return { roleId }
    }

    async updateRole(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { role_id: roleId, role_name: roleName, status } = body
      if (!roleId) bizError('role_id 不能为空')

      const role = await db('roles').where({ tenant_id: tenantId, role_id: roleId }).first()
      if (!role) bizError('角色不存在', 40400)

      const patch = {}
      if (roleName) patch.role_name = roleName
      if (status) patch.status = status
      await db('roles').where({ role_id: roleId }).update(patch)

      await audit(app, ctx, {
        actionCode: 'org:role:update',
        objectType: 'role',
        objectId: roleId,
        detail: patch,
      })

      return { roleId }
    }
  }
}
