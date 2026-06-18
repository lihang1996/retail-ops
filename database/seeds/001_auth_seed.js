const bcrypt = require('bcryptjs')

const TENANT_ID = 'tenant_demo_retail'
const DEFAULT_PASSWORD = 'demo123'

const PERMISSIONS = [
  { permission_id: 'perm_menu_overview', permission_code: 'menu:overview', permission_type: 'menu', description: '经营总览' },
  { permission_id: 'perm_menu_fulfillment', permission_code: 'menu:fulfillment', permission_type: 'menu', description: '履约中心' },
  { permission_id: 'perm_menu_product', permission_code: 'menu:product', permission_type: 'menu', description: '商品管理' },
  { permission_id: 'perm_menu_ai', permission_code: 'menu:ai', permission_type: 'menu', description: 'AI 工作台' },
  { permission_id: 'perm_auth_login', permission_code: 'auth:login', permission_type: 'action', description: '登录' },
]

const ROLE_DEFS = [
  { role_id: 'role_admin', role_code: 'admin', role_name: '租户管理员', perms: PERMISSIONS.map((p) => p.permission_id) },
  { role_id: 'role_ops', role_code: 'ops', role_name: '运营', perms: ['perm_menu_overview', 'perm_menu_product', 'perm_menu_fulfillment'] },
  { role_id: 'role_warehouse', role_code: 'warehouse', role_name: '仓库主管', perms: ['perm_menu_fulfillment', 'perm_menu_overview'] },
  { role_id: 'role_finance', role_code: 'finance', role_name: '财务', perms: ['perm_menu_overview'] },
  { role_id: 'role_analyst', role_code: 'analyst', role_name: '数据分析', perms: ['perm_menu_overview', 'perm_menu_ai'] },
]

const USERS = [
  { user_id: 'user_admin', account: 'admin@retail.demo', display_name: '管理员', role_id: 'role_admin' },
  { user_id: 'user_ops', account: 'ops@retail.demo', display_name: '运营', role_id: 'role_ops' },
  { user_id: 'user_warehouse', account: 'warehouse@retail.demo', display_name: '仓库主管', role_id: 'role_warehouse' },
  { user_id: 'user_finance', account: 'finance@retail.demo', display_name: '财务', role_id: 'role_finance' },
  { user_id: 'user_analyst', account: 'analyst@retail.demo', display_name: '分析师', role_id: 'role_analyst' },
]

exports.seed = async (knex) => {
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  await knex('tenants').insert({
    tenant_id: TENANT_ID,
    tenant_name: '演示零售租户',
    contact_name: 'Demo',
    status: 'active',
    plan_code: 'trial',
  }).onConflict('tenant_id').merge()

  for (const p of PERMISSIONS) {
    await knex('permissions').insert(p).onConflict('permission_id').merge()
  }

  for (const role of ROLE_DEFS) {
    const { perms, ...roleRow } = role
    await knex('roles').insert({ ...roleRow, tenant_id: TENANT_ID }).onConflict('role_id').merge()
    for (const pid of perms) {
      await knex('role_permissions')
        .insert({ role_id: role.role_id, permission_id: pid })
        .onConflict(['role_id', 'permission_id'])
        .ignore()
    }
  }

  for (const u of USERS) {
    const { role_id, ...userRow } = u
    await knex('users').insert({ ...userRow, password_hash: hash, status: 'active' }).onConflict('user_id').merge()
    await knex('tenant_members').insert({
      member_id: `member_${u.user_id}`,
      tenant_id: TENANT_ID,
      user_id: u.user_id,
      status: 'active',
    }).onConflict('member_id').merge()
    await knex('user_roles').insert({ user_id: u.user_id, role_id }).onConflict(['user_id', 'role_id']).ignore()
  }
}
