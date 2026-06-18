const { deptSchema, userSchema, roleSchema, buildSchemaModule } = require('./schemas/org')
const { buildProductMenu } = require('./schemas/product')
const { buildWarehouseMenu } = require('./schemas/warehouse')

module.exports = {
  mode: 'dashboard',
  name: '零售运营中台',
  menu: [
    buildProductMenu(),
    buildWarehouseMenu(),
    {
      key: 'org',
      name: '组织管理',
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
