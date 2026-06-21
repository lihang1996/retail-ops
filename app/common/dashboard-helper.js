const { ensureDb, getTenantId } = require('./org-helper')

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

function canView(permSet, code) {
  return permSet.has(code)
}

module.exports = {
  getUserPermissionCodes,
  canView,
}
