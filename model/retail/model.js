const { deptSchema, userSchema, roleSchema, buildSchemaModule } = require('./schemas/org')
const { buildProductMenu } = require('./schemas/product')
const { buildWarehouseMenu } = require('./schemas/warehouse')
const { buildOpsMenu } = require('./schemas/ops')

const customModule = ({ key, name, path, permissionCode }) => ({
  key,
  name,
  permissionCode,
  menuType: 'module',
  moduleType: 'custom',
  customConfig: { path },
})

module.exports = {
  mode: 'dashboard',
  name: '零售运营中台',
  menu: [
    customModule({
      key: 'overview',
      name: '经营总览',
      path: '/overview',
      permissionCode: 'menu:overview',
    }),
    customModule({
      key: 'fulfillment',
      name: '履约中心',
      path: '/fulfillment',
      permissionCode: 'menu:fulfillment',
    }),
    buildProductMenu(),
    buildWarehouseMenu(),
    buildOpsMenu(),
    customModule({
      key: 'ai',
      name: 'AI 业务助手',
      path: '/ai-workbench',
      permissionCode: 'menu:ai',
    }),
    {
      key: 'org',
      name: '组织管理',
      permissionCode: 'menu:org',
      menuType: 'module',
      moduleType: 'sider',
      siderConfig: {
        menu: [
          buildSchemaModule({
            key: 'org_department',
            name: '部门管理',
            api: '/api/proj/org/department',
            schema: deptSchema,
            rowButtons: [
              { label: '修改', eventKey: 'showComponent', eventOption: { comName: 'editForm' }, type: 'warning' },
              { label: '禁用', eventKey: 'remove', eventOption: { params: { dept_id: 'schema::dept_id' } }, type: 'danger' },
            ],
          }),
          buildSchemaModule({ key: 'org_user', name: '用户管理', api: '/api/proj/org/user', schema: userSchema }),
          buildSchemaModule({ key: 'org_role', name: '角色管理', api: '/api/proj/org/role', schema: roleSchema }),
          {
            key: 'org_role_perm',
            name: '角色权限',
            menuType: 'module',
            moduleType: 'custom',
            customConfig: { path: '/org-role-perm' },
          },
        ],
      },
    },
  ],
}
