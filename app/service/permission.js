/**
 * @module service/permission
 * @description 权限配置服务：全局权限点列表、按类型分组、角色权限绑定。
 * 关键规则：更新角色权限时先清空再写入，且 permission_id 须在 permissions 表中存在；
 * 角色归属校验通过 tenant_id 保证租户隔离。
 */
const { ensureDb } = require('../common/org-helper')

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class PermissionService extends BaseService {
    /** 列出系统全部权限点（全局，非租户级） */
    async listAll() {
      const db = ensureDb(app)
      return db('permissions').orderBy('permission_code', 'asc')
    }

    /** 按 permission_type 分组返回权限树 */
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

    /** 获取角色已绑定的 permission_id 列表，角色须属指定租户 */
    async getRolePermissionIds({ tenantId, roleId }) {
      const db = ensureDb(app)
      const role = await db('roles').where({ tenant_id: tenantId, role_id: roleId }).first()
      if (!role) return null

      const rows = await db('role_permissions').where({ role_id: roleId }).select('permission_id')
      return rows.map((item) => item.permission_id)
    }

    /** 全量替换角色权限绑定，忽略无效 permission_id */
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
