const bcrypt = require('bcryptjs')

const TENANT_ID = 'tenant_demo_retail'
const DEFAULT_PASSWORD = 'demo123'

const PERMISSIONS = [
  { permission_id: 'perm_menu_overview', permission_code: 'menu:overview', permission_type: 'menu', description: '经营总览' },
  { permission_id: 'perm_menu_fulfillment', permission_code: 'menu:fulfillment', permission_type: 'menu', description: '履约中心' },
  { permission_id: 'perm_menu_product', permission_code: 'menu:product', permission_type: 'menu', description: '商品管理' },
  { permission_id: 'perm_menu_ai', permission_code: 'menu:ai', permission_type: 'menu', description: 'AI 工作台' },
  { permission_id: 'perm_menu_org', permission_code: 'menu:org', permission_type: 'menu', description: '组织管理' },
  { permission_id: 'perm_menu_ops', permission_code: 'menu:ops', permission_type: 'menu', description: '运营中心' },
  { permission_id: 'perm_auth_login', permission_code: 'auth:login', permission_type: 'action', description: '登录' },
  { permission_id: 'perm_org_department_view', permission_code: 'org:department:view', permission_type: 'action', description: '查看组织' },
  { permission_id: 'perm_org_department_update', permission_code: 'org:department:update', permission_type: 'action', description: '管理部门' },
  { permission_id: 'perm_org_user_create', permission_code: 'org:user:create', permission_type: 'action', description: '创建用户' },
  { permission_id: 'perm_org_user_update', permission_code: 'org:user:update', permission_type: 'action', description: '编辑用户' },
  { permission_id: 'perm_org_user_disable', permission_code: 'org:user:disable', permission_type: 'action', description: '停用用户' },
  { permission_id: 'perm_org_role_create', permission_code: 'org:role:create', permission_type: 'action', description: '创建角色' },
  { permission_id: 'perm_org_role_update', permission_code: 'org:role:update', permission_type: 'action', description: '编辑角色' },
  { permission_id: 'perm_org_role_perm', permission_code: 'org:role:permission:update', permission_type: 'action', description: '修改角色权限' },
  { permission_id: 'perm_store_view', permission_code: 'store:view', permission_type: 'action', description: '查看店铺' },
  { permission_id: 'perm_store_create', permission_code: 'store:create', permission_type: 'action', description: '创建店铺' },
  { permission_id: 'perm_store_update', permission_code: 'store:update', permission_type: 'action', description: '编辑店铺' },
  { permission_id: 'perm_store_disable', permission_code: 'store:disable', permission_type: 'action', description: '停用店铺' },
  { permission_id: 'perm_product_view', permission_code: 'product:view', permission_type: 'action', description: '查看商品' },
  { permission_id: 'perm_product_create', permission_code: 'product:create', permission_type: 'action', description: '创建商品' },
  { permission_id: 'perm_product_update', permission_code: 'product:update', permission_type: 'action', description: '编辑商品' },
  { permission_id: 'perm_product_delete', permission_code: 'product:delete', permission_type: 'action', description: '删除商品' },
  { permission_id: 'perm_product_submit', permission_code: 'product:submit_review', permission_type: 'action', description: '提交审核' },
  { permission_id: 'perm_product_on_sale', permission_code: 'product:on_sale', permission_type: 'action', description: '上架商品' },
  { permission_id: 'perm_product_off_sale', permission_code: 'product:off_sale', permission_type: 'action', description: '下架商品' },
  { permission_id: 'perm_warehouse_view', permission_code: 'warehouse:view', permission_type: 'action', description: '查看仓库' },
  { permission_id: 'perm_warehouse_create', permission_code: 'warehouse:create', permission_type: 'action', description: '创建仓库' },
  { permission_id: 'perm_warehouse_update', permission_code: 'warehouse:update', permission_type: 'action', description: '编辑仓库' },
  { permission_id: 'perm_warehouse_loc', permission_code: 'warehouse:location:update', permission_type: 'action', description: '编辑库位' },
  { permission_id: 'perm_stock_view', permission_code: 'stock:view', permission_type: 'action', description: '查看库存' },
  { permission_id: 'perm_stock_inbound', permission_code: 'stock:inbound', permission_type: 'action', description: '入库' },
  { permission_id: 'perm_stock_lock', permission_code: 'stock:lock', permission_type: 'action', description: '锁定库存' },
  { permission_id: 'perm_stock_outbound', permission_code: 'stock:outbound', permission_type: 'action', description: '出库' },
  { permission_id: 'perm_order_view', permission_code: 'order:view', permission_type: 'action', description: '查看订单' },
  { permission_id: 'perm_order_import', permission_code: 'order:import', permission_type: 'action', description: '导入订单' },
  { permission_id: 'perm_order_pay', permission_code: 'order:pay', permission_type: 'action', description: '订单支付' },
  { permission_id: 'perm_order_allocate', permission_code: 'order:allocate', permission_type: 'action', description: '订单分仓' },
  { permission_id: 'perm_shipment_view', permission_code: 'shipment:view', permission_type: 'action', description: '查看发货单' },
  { permission_id: 'perm_shipment_create', permission_code: 'shipment:create', permission_type: 'action', description: '创建发货单' },
  { permission_id: 'perm_shipment_pick', permission_code: 'shipment:pick', permission_type: 'action', description: '拣货' },
  { permission_id: 'perm_shipment_ship', permission_code: 'shipment:ship', permission_type: 'action', description: '出库发货' },
  { permission_id: 'perm_approval_submit', permission_code: 'approval:submit', permission_type: 'action', description: '提交审批' },
  { permission_id: 'perm_approval_view', permission_code: 'approval:view', permission_type: 'action', description: '查看审批' },
  { permission_id: 'perm_approval_approve', permission_code: 'approval:approve', permission_type: 'action', description: '审批通过/驳回' },
  { permission_id: 'perm_audit_view', permission_code: 'audit:view', permission_type: 'action', description: '查看审计日志' },
  { permission_id: 'perm_customer_view', permission_code: 'customer:view', permission_type: 'action', description: '查看客户' },
  { permission_id: 'perm_customer_phone', permission_code: 'customer:phone:view', permission_type: 'action', description: '查看客户手机号' },
  { permission_id: 'perm_finance_view', permission_code: 'finance:view', permission_type: 'action', description: '查看财务报表' },
  { permission_id: 'perm_marketing_view', permission_code: 'marketing:view', permission_type: 'action', description: '查看营销活动' },
  { permission_id: 'perm_ai_query', permission_code: 'ai:query', permission_type: 'action', description: 'AI 查询' },
]

const ORG_PERMS = [
  'perm_menu_org',
  'perm_org_department_view',
  'perm_org_department_update',
  'perm_org_user_create',
  'perm_org_user_update',
  'perm_org_user_disable',
  'perm_org_role_create',
  'perm_org_role_update',
  'perm_org_role_perm',
]

const PRODUCT_PERMS = [
  'perm_store_view',
  'perm_store_create',
  'perm_store_update',
  'perm_product_view',
  'perm_product_create',
  'perm_product_update',
  'perm_product_delete',
  'perm_product_submit',
  'perm_product_on_sale',
  'perm_product_off_sale',
  'perm_approval_submit',
  'perm_approval_view',
  'perm_approval_approve',
  'perm_order_view',
  'perm_order_import',
  'perm_order_pay',
  'perm_order_allocate',
]

const WAREHOUSE_PERMS = [
  'perm_warehouse_view',
  'perm_warehouse_create',
  'perm_warehouse_update',
  'perm_warehouse_loc',
  'perm_stock_view',
  'perm_stock_inbound',
  'perm_stock_lock',
  'perm_stock_outbound',
  'perm_product_view',
  'perm_order_view',
  'perm_order_allocate',
  'perm_shipment_view',
  'perm_shipment_create',
  'perm_shipment_pick',
  'perm_shipment_ship',
]

const ROLE_DEFS = [
  {
    role_id: 'role_admin',
    role_code: 'admin',
    role_name: '租户管理员',
    perms: PERMISSIONS.map((p) => p.permission_id),
  },
  {
    role_id: 'role_ops',
    role_code: 'ops',
    role_name: '运营',
    perms: ['perm_menu_overview', 'perm_menu_product', 'perm_menu_fulfillment', 'perm_menu_ops', ...PRODUCT_PERMS, 'perm_audit_view', 'perm_customer_view', 'perm_finance_view', 'perm_marketing_view'],
  },
  {
    role_id: 'role_warehouse',
    role_code: 'warehouse',
    role_name: '仓库主管',
    perms: ['perm_menu_fulfillment', 'perm_menu_overview', ...WAREHOUSE_PERMS],
  },
  {
    role_id: 'role_finance',
    role_code: 'finance',
    role_name: '财务',
    perms: ['perm_menu_overview', 'perm_finance_view', 'perm_order_view', 'perm_menu_ops', 'perm_customer_view'],
  },
  {
    role_id: 'role_analyst',
    role_code: 'analyst',
    role_name: '数据分析',
    perms: ['perm_menu_overview', 'perm_menu_ai', 'perm_ai_query', 'perm_product_view', 'perm_stock_view', 'perm_order_view'],
  },
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

  await knex('departments').insert({
    dept_id: 'dept_hq',
    tenant_id: TENANT_ID,
    parent_id: null,
    dept_name: '总部',
    status: 'active',
  }).onConflict('dept_id').merge()

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
      dept_id: u.user_id === 'user_admin' ? 'dept_hq' : null,
      status: 'active',
    }).onConflict('member_id').merge()
    await knex('user_roles').insert({ user_id: u.user_id, role_id }).onConflict(['user_id', 'role_id']).ignore()
  }
}

exports.ORG_PERMS = ORG_PERMS
