/**
 * @module common/permission-map
 * @description API 路由与权限点映射表，供 permission 中间件校验。
 *
 * 映射规则：
 * - null：登录即可访问，无需特定权限
 * - undefined：未映射，开发期自动放行（生产建议改为拒绝）
 * - 'permission:code'：需要特定权限码（字符串值）
 *
 * 键格式：'{HTTP_METHOD} {API_PATH}'
 * 例如：'GET /api/proj/product/list'、'POST /api/proj/order/import'
 *
 * 权限码命名规范：
 * - menu:xxx - 菜单权限（控制导航显示）
 * - {module}:view - 查看权限
 * - {module}:create - 创建权限
 * - {module}:update - 更新权限
 * - {module}:delete - 删除权限
 * - {module}:{action} - 特定操作权限（如 order:pay, stock:inbound）
 */

module.exports = {
  // ==================== 认证相关（登录即可） ====================
  'POST /api/auth/login': null, // 登录（无需已登录态）
  'GET /api/auth/me': null, // 获取当前用户信息
  'GET /api/auth/permissions': null, // 获取当前用户权限快照
  'POST /api/auth/logout': null, // 登出

  // ==================== 项目配置（登录即可） ====================
  'GET /api/project/list': null,
  'GET /api/project': null,

  // ==================== 经营总览（登录即可） ====================
  'GET /api/proj/dashboard/overview': null, // 经营总览看板（内部按权限显示不同指标）

  // ==================== 工作台 ====================
  'GET /api/proj/workbench/fulfillment': 'order:view', // 履约工作台
  'GET /api/proj/workbench/ops': 'menu:ops', // 运营工作台

  // ==================== 组织管理 ====================
  // 部门管理
  'GET /api/proj/org/department/list': 'org:department:view',
  'GET /api/proj/org/department': 'org:department:view',
  'POST /api/proj/org/department': 'org:department:update',
  'PUT /api/proj/org/department': 'org:department:update',
  'DELETE /api/proj/org/department': 'org:department:update',
  'POST /api/proj/org/department/disable': 'org:department:update',

  // 用户管理
  'GET /api/proj/org/user/list': 'org:department:view',
  'GET /api/proj/org/user': 'org:department:view',
  'POST /api/proj/org/user': 'org:user:create',
  'PUT /api/proj/org/user': 'org:user:update',
  'POST /api/proj/org/user/reset_password': 'org:user:update',
  'POST /api/proj/org/user/lock': 'org:user:disable',
  'POST /api/proj/org/user/unlock': 'org:user:update',

  // 角色管理
  'GET /api/proj/org/role/list': 'org:department:view',
  'GET /api/proj/org/role': 'org:department:view',
  'POST /api/proj/org/role': 'org:role:create',
  'PUT /api/proj/org/role': 'org:role:update',
  'GET /api/proj/org/role_permissions': 'org:role:permission:update',
  'POST /api/proj/org/role_permissions': 'org:role:permission:update',

  // 权限管理
  'GET /api/proj/permission/list': 'org:role:permission:update',
  'GET /api/proj/permission/tree': 'org:role:permission:update',

  // ==================== 店铺管理 ====================
  'GET /api/proj/store/list': 'store:view',
  'GET /api/proj/store': 'store:view',
  'POST /api/proj/store': 'store:create',
  'PUT /api/proj/store': 'store:update',
  'DELETE /api/proj/store': 'store:disable',

  // ==================== 商品中心 ====================
  // 类目管理
  'GET /api/proj/category/list': 'product:view',
  'GET /api/proj/category': 'product:view',
  'POST /api/proj/category': 'product:create',
  'PUT /api/proj/category': 'product:update',

  // 品牌管理
  'GET /api/proj/brand/list': 'product:view',
  'GET /api/proj/brand': 'product:view',
  'POST /api/proj/brand': 'product:create',
  'PUT /api/proj/brand': 'product:update',

  // 商品管理
  'GET /api/proj/product/list': 'product:view',
  'GET /api/proj/product': 'product:view',
  'POST /api/proj/product': 'product:create',
  'PUT /api/proj/product': 'product:update',
  'DELETE /api/proj/product': 'product:delete',

  // SKU 管理
  // 入库页面也需要选择 SKU；仓储角色拥有 stock:inbound 时允许读取 SKU 选项
  'GET /api/proj/product/sku_list': ['product:view', 'stock:inbound'],
  'POST /api/proj/product/sku': 'product:update',
  'PUT /api/proj/product/sku': 'product:update',
  'DELETE /api/proj/product/sku': 'product:update',

  // 商品上下架
  'POST /api/proj/product/submit_review': 'product:submit_review',
  'POST /api/proj/product/on_sale': 'product:on_sale',
  'POST /api/proj/product/off_sale': 'product:off_sale',

  // ==================== 仓储管理 ====================
  // 仓库管理
  'GET /api/proj/warehouse/list': 'warehouse:view',
  'GET /api/proj/warehouse': 'warehouse:view',
  'POST /api/proj/warehouse': 'warehouse:create',
  'PUT /api/proj/warehouse': 'warehouse:update',
  'GET /api/proj/warehouse/layout': 'warehouse:view',
  'GET /api/proj/warehouse/risk_map': 'warehouse:view',

  // 库位管理
  'GET /api/proj/warehouse/location/list': 'warehouse:view',
  'GET /api/proj/warehouse/location': 'warehouse:view',
  'POST /api/proj/warehouse/location': 'warehouse:location:update',
  'PUT /api/proj/warehouse/location': 'warehouse:location:update',

  // ==================== 库存管理 ====================
  'GET /api/proj/stock/list': 'stock:view',
  'GET /api/proj/stock/location_list': 'stock:view',
  'GET /api/proj/stock/location/list': 'stock:view',
  'GET /api/proj/stock/log_list': 'stock:view',
  'GET /api/proj/stock/log/list': 'stock:view',
  'POST /api/proj/stock/inbound': 'stock:inbound', // 入库
  'POST /api/proj/stock/lock': 'stock:lock', // 锁定库存
  'POST /api/proj/stock/unlock': 'stock:lock', // 解锁库存
  'POST /api/proj/stock/outbound': 'stock:outbound', // 出库

  // ==================== 订单履约 ====================
  'GET /api/proj/order/list': 'order:view',
  'GET /api/proj/order': 'order:view',
  'POST /api/proj/order/import': 'order:import', // Excel 导入订单
  'GET /api/proj/order/import_result': 'order:view',
  'POST /api/proj/order/pay': 'order:pay', // 支付确认
  'POST /api/proj/order/allocate': 'order:allocate', // 手动分仓

  // ==================== 发货管理 ====================
  'GET /api/proj/shipment/list': 'shipment:view',
  'GET /api/proj/shipment': 'shipment:view',
  'POST /api/proj/shipment/create_from_order': 'shipment:create', // 从订单创建发货单
  'POST /api/proj/shipment/start_pick': 'shipment:pick', // 开始拣货
  'POST /api/proj/shipment/confirm_pick': 'shipment:pick', // 确认拣货
  'POST /api/proj/shipment/ship': 'shipment:ship', // 发货出库
  'GET /api/proj/shipment/picking_route': 'shipment:view', // 拣货路径（3D 可视化）

  // ==================== 审批中心 ====================
  'POST /api/proj/approval/submit': 'approval:submit', // 提交审批
  'GET /api/proj/approval/todo_list': 'approval:view', // 待办列表
  'POST /api/proj/approval/approve': 'approval:approve', // 审批通过
  'POST /api/proj/approval/reject': 'approval:approve', // 审批拒绝

  // ==================== 审计日志 ====================
  'GET /api/proj/audit/list': 'audit:view',

  // ==================== 客户管理 ====================
  'GET /api/proj/customer/list': 'customer:view',
  'GET /api/proj/customer': 'customer:view',

  // ==================== 财务管理 ====================
  'GET /api/proj/finance/summary': 'finance:view',

  // ==================== 营销管理 ====================
  'GET /api/proj/marketing/activity/list': 'marketing:view',
  'GET /api/proj/marketing/activity': 'marketing:view',

  // ==================== AI 业务助手 ====================
  'POST /api/proj/ai/query': 'ai:query', // AI 查询
  'GET /api/proj/ai/history': 'ai:query', // 查询历史
  'GET /api/proj/ai/suggestions': 'ai:query', // 推荐问题
}
