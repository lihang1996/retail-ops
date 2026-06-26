/**
 * 查询用户在租户下的权限码集合
 */
const crypto = require('crypto')

function userPermissionQuery(db, userId, tenantId) {
  return db('permissions as p')
    .join('role_permissions as rp', 'p.permission_id', 'rp.permission_id')
    .join('user_roles as ur', 'rp.role_id', 'ur.role_id')
    .join('roles as r', 'ur.role_id', 'r.role_id')
    .where('ur.user_id', userId)
    .andWhere('r.tenant_id', tenantId)
    .andWhere('r.status', 'active')
}

async function getUserPermissionRows(db, userId, tenantId) {
  return userPermissionQuery(db, userId, tenantId)
    .select('p.permission_code', 'p.permission_type', 'r.role_id')
}

async function getUserPermissionCodes(db, userId, tenantId) {
  const rows = await userPermissionQuery(db, userId, tenantId)
    .select('p.permission_code')
  return new Set(rows.map((r) => r.permission_code))
}

/**
 * 判断用户是否拥有任一所需权限
 */
async function userHasAnyPermission(db, userId, tenantId, requiredList) {
  const row = await userPermissionQuery(db, userId, tenantId)
    .whereIn('p.permission_code', requiredList)
    .first()
  return Boolean(row)
}

/**
 * 生成当前用户权限快照版本。
 * 角色或权限关系发生变化后，该版本会变化，可用于 JWT 失效判断。
 */
async function getPermissionSnapshotVersion(db, userId, tenantId) {
  const rows = await getUserPermissionRows(db, userId, tenantId)
  const source = rows
    .map((row) => `${row.role_id}:${row.permission_type}:${row.permission_code}`)
    .sort()
    .join('|')
  return crypto
    .createHash('sha256')
    .update(source || `${userId}:${tenantId}:empty`)
    .digest('hex')
    .slice(0, 16)
}

module.exports = {
  getUserPermissionRows,
  getUserPermissionCodes,
  getPermissionSnapshotVersion,
  userHasAnyPermission,
}
