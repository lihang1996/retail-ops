/**
 * @module common/dashboard-helper
 * @description 仪表盘权限辅助：查询用户权限码集合、判断字段是否可见。
 * 关键规则：权限通过 user_roles → role_permissions 关联，且 role 须属当前 tenant_id。
 */
const { ensureDb, getTenantId } = require('./org-helper')

/** 获取用户在指定租户下的全部 permission_code 集合 */
async function getUserPermissionCodes(db, userId, tenantId) {
  const rows = await db('permissions as p')
    .join('role_permissions as rp', 'p.permission_id', 'rp.permission_id')
    .join('user_roles as ur', 'rp.role_id', 'ur.role_id')
    .join('roles as r', 'ur.role_id', 'r.role_id')
    .where('ur.user_id', userId)
    .andWhere('r.tenant_id', tenantId)
    .select('p.permission_code')
  return new Set(rows.map((r) => r.permission_code))
}

/** 判断权限集合是否包含指定权限码 */
function canView(permSet, code) {
  return permSet.has(code)
}

module.exports = {
  getUserPermissionCodes,
  canView,
}
