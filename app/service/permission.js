const { ensureDb } = require('../common/org-helper')

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class PermissionService extends BaseService {
    async listAll() {
      const db = ensureDb(app)
      return db('permissions').orderBy('permission_code', 'asc')
    }

    async listTree() {
      const rows = await this.listAll()
      const groups = {}
      rows.forEach((item) => {
        const type = item.permission_type || 'other'
        if (!groups[type]) groups[type] = []
        groups[type].push({
          permissionId: item.permission_id,
          permissionCode: item.permission_code,
          description: item.description,
        })
      })
      return groups
    }

    async getRolePermissionIds({ tenantId, roleId }) {
      const db = ensureDb(app)
      const role = await db('roles').where({ tenant_id: tenantId, role_id: roleId }).first()
      if (!role) return null

      const rows = await db('role_permissions').where({ role_id: roleId }).select('permission_id')
      return rows.map((item) => item.permission_id)
    }

    async updateRolePermissions({ tenantId, roleId, permissionIds = [] }) {
      const db = ensureDb(app)
      const role = await db('roles').where({ tenant_id: tenantId, role_id: roleId }).first()
      if (!role) return { ok: false, code: 40400, message: '角色不存在' }

      const uniqueIds = [...new Set(permissionIds.filter(Boolean))]
      const validIds = uniqueIds.length
        ? await db('permissions').whereIn('permission_id', uniqueIds).pluck('permission_id')
        : []

      await db.transaction(async (trx) => {
        await trx('role_permissions').where({ role_id: roleId }).del()
        if (validIds.length) {
          await trx('role_permissions').insert(
            validIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId }))
          )
        }
      })

      return { ok: true, permissionIds: validIds }
    }
  }
}
