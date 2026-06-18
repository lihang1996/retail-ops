// API 路径 -> 权限点映射（null = 登录即可；undefined = 开发期放行）
module.exports = {
  'GET /api/auth/me': null,
  'GET /api/auth/permissions': null,
  'POST /api/auth/logout': null,

  'GET /api/proj/org/department/list': 'org:department:view',
  'GET /api/proj/org/department': 'org:department:view',
  'POST /api/proj/org/department': 'org:department:update',
  'PUT /api/proj/org/department': 'org:department:update',
  'DELETE /api/proj/org/department': 'org:department:update',
  'POST /api/proj/org/department/disable': 'org:department:update',

  'GET /api/proj/org/user/list': 'org:department:view',
  'GET /api/proj/org/user': 'org:department:view',
  'POST /api/proj/org/user': 'org:user:create',
  'PUT /api/proj/org/user': 'org:user:update',
  'POST /api/proj/org/user/reset_password': 'org:user:update',
  'POST /api/proj/org/user/lock': 'org:user:disable',
  'POST /api/proj/org/user/unlock': 'org:user:update',

  'GET /api/proj/org/role/list': 'org:department:view',
  'GET /api/proj/org/role': 'org:department:view',
  'POST /api/proj/org/role': 'org:role:create',
  'PUT /api/proj/org/role': 'org:role:update',
  'GET /api/proj/org/role_permissions': 'org:role:permission:update',
  'POST /api/proj/org/role_permissions': 'org:role:permission:update',

  'GET /api/proj/permission/list': 'org:role:permission:update',
  'GET /api/proj/permission/tree': 'org:role:permission:update',
}
