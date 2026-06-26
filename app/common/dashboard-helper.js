/**
 * @module common/dashboard-helper
 * @description 仪表盘权限辅助：查询用户权限码集合、判断字段是否可见。
 */
const { getUserPermissionCodes } = require('./permission-resolver')

/** 判断权限集合是否包含指定权限码 */
function canView(permSet, code) {
  return permSet.has(code)
}

module.exports = {
  getUserPermissionCodes,
  canView,
}
