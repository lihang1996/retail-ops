const deptSchema = {
  type: 'object',
  properties: {
    dept_id: {
      type: 'string',
      label: '部门ID',
      tableOption: { width: 200, 'show-overflow-tooltip': true },
      editFormOption: { comType: 'input', disabled: true },
    },
    dept_name: {
      type: 'string',
      label: '部门名称',
      tableOption: { width: 180 },
      searchOption: { comType: 'input' },
      createFormOption: { comType: 'input' },
      editFormOption: { comType: 'input' },
    },
    parent_id: {
      type: 'string',
      label: '上级部门ID',
      tableOption: { width: 160 },
      createFormOption: { comType: 'input' },
      editFormOption: { comType: 'input' },
    },
    status: {
      type: 'string',
      label: '状态',
      tableOption: { width: 100 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: '' },
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'disabled' },
        ],
      },
      editFormOption: {
        comType: 'select',
        enumList: [
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'disabled' },
        ],
      },
    },
    created_at: {
      type: 'string',
      label: '创建时间',
      tableOption: { width: 180 },
    },
  },
  required: ['dept_name'],
}

const userSchema = {
  type: 'object',
  properties: {
    user_id: {
      type: 'string',
      label: '用户ID',
      tableOption: { width: 200, 'show-overflow-tooltip': true },
      editFormOption: { comType: 'input', disabled: true },
    },
    account: {
      type: 'string',
      label: '账号',
      tableOption: { width: 180 },
      searchOption: { comType: 'input' },
      createFormOption: { comType: 'input' },
      editFormOption: { comType: 'input', disabled: true },
    },
    display_name: {
      type: 'string',
      label: '姓名',
      tableOption: { width: 120 },
      createFormOption: { comType: 'input' },
      editFormOption: { comType: 'input' },
    },
    dept_name: {
      type: 'string',
      label: '部门',
      tableOption: { width: 140 },
    },
    dept_id: {
      type: 'string',
      label: '部门ID',
      createFormOption: { comType: 'input' },
      editFormOption: { comType: 'input' },
    },
    status: {
      type: 'string',
      label: '状态',
      tableOption: { width: 100 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: '' },
          { label: '正常', value: 'active' },
          { label: '锁定', value: 'locked' },
        ],
      },
      editFormOption: {
        comType: 'select',
        enumList: [
          { label: '正常', value: 'active' },
          { label: '锁定', value: 'locked' },
        ],
      },
    },
    created_at: {
      type: 'string',
      label: '创建时间',
      tableOption: { width: 180 },
    },
  },
  required: ['account', 'display_name'],
}

const roleSchema = {
  type: 'object',
  properties: {
    role_id: {
      type: 'string',
      label: '角色ID',
      tableOption: { width: 200, 'show-overflow-tooltip': true },
      editFormOption: { comType: 'input', disabled: true },
    },
    role_code: {
      type: 'string',
      label: '角色编码',
      tableOption: { width: 140 },
      createFormOption: { comType: 'input' },
      editFormOption: { comType: 'input', disabled: true },
    },
    role_name: {
      type: 'string',
      label: '角色名称',
      tableOption: { width: 160 },
      searchOption: { comType: 'input' },
      createFormOption: { comType: 'input' },
      editFormOption: { comType: 'input' },
    },
    status: {
      type: 'string',
      label: '状态',
      tableOption: { width: 100 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: '' },
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'disabled' },
        ],
      },
      editFormOption: {
        comType: 'select',
        enumList: [
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'disabled' },
        ],
      },
    },
    created_at: {
      type: 'string',
      label: '创建时间',
      tableOption: { width: 180 },
    },
  },
  required: ['role_code', 'role_name'],
}

function buildSchemaModule({ key, name, api, schema, rowButtons, headerButtons }) {
  const mainKey = Object.keys(schema.properties).find((k) => k.endsWith('_id'))
  const defaultHeader = [
    {
      label: `新增${name.replace('管理', '')}`,
      eventKey: 'showComponent',
      eventOption: { comName: 'createForm' },
      type: 'primary',
      plain: true,
    },
  ]
  return {
    key,
    name,
    menuType: 'module',
    moduleType: 'schema',
    schemaConfig: {
      api,
      schema,
      tableConfig: {
        headerButtons: headerButtons !== undefined ? headerButtons : defaultHeader,
        rowButtons: rowButtons || [
          {
            label: '修改',
            eventKey: 'showComponent',
            eventOption: { comName: 'editForm' },
            type: 'warning',
          },
        ],
      },
      componentConfig: {
        createForm: { title: `新增${name.replace('管理', '')}`, saveBtnText: '保存' },
        editForm: {
          mainKey,
          title: `编辑${name.replace('管理', '')}`,
          saveBtnText: '保存',
        },
      },
    },
  }
}

module.exports = {
  deptSchema,
  userSchema,
  roleSchema,
  buildSchemaModule,
}
