const { buildSchemaModule } = require('./org')

const warehouseSchema = {
  type: 'object',
  properties: {
    warehouse_id: { type: 'string', label: '仓库ID', tableOption: { width: 160 }, editFormOption: { comType: 'input', disabled: true } },
    warehouse_name: { type: 'string', label: '仓库名称', tableOption: { width: 140 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    warehouse_code: { type: 'string', label: '仓库编码', tableOption: { width: 120 }, searchOption: { comType: 'input', placeholder: '输入仓库编码', clearable: true }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input', disabled: true } },
    address: { type: 'string', label: '地址', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    location_count: { type: 'number', label: '库位数', tableOption: { width: 90 } },
    stocked_location_count: { type: 'number', label: '有货库位', tableOption: { width: 100 } },
    location_fill_rate: { type: 'number', label: '库位使用率%', tableOption: { width: 120 } },
    stock_sku_count: { type: 'number', label: '库存SKU', tableOption: { width: 100 } },
    available_qty: { type: 'number', label: '可用库存', tableOption: { width: 110 } },
    locked_qty: { type: 'number', label: '锁定库存', tableOption: { width: 110 } },
    risk_sku_count: { type: 'number', label: '风险SKU', tableOption: { width: 100 } },
    active_shipment_count: { type: 'number', label: '待履约单', tableOption: { width: 100 } },
    status: {
      type: 'string',
      label: '状态',
      tableOption: { width: 80 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'disabled' },
        ],
      },
    },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 170 } },
  },
  required: ['warehouse_name', 'warehouse_code'],
}

const locationSchema = {
  type: 'object',
  properties: {
    location_id: { type: 'string', label: '库位ID', tableOption: { width: 160 }, editFormOption: { comType: 'input', disabled: true } },
    warehouse_name: { type: 'string', label: '仓库', tableOption: { width: 120 }, searchOption: { comType: 'input', placeholder: '输入仓库名称', clearable: true } },
    location_code: { type: 'string', label: '库位编码', tableOption: { width: 120 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input', disabled: true } },
    warehouse_id: { type: 'string', label: '仓库ID', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input', disabled: true } },
    capacity: { type: 'number', label: '容量', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    current_qty: { type: 'number', label: '当前库存', tableOption: { width: 100 } },
    sku_count: { type: 'number', label: 'SKU数', tableOption: { width: 90 } },
    capacity_used_pct: { type: 'number', label: '占用率%', tableOption: { width: 100 } },
    risk_level: { type: 'string', label: '库位风险', tableOption: { width: 100 } },
    pos_x: { type: 'number', label: 'X', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    pos_y: { type: 'number', label: 'Y', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    pos_z: { type: 'number', label: 'Z', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    status: {
      type: 'string',
      label: '状态',
      tableOption: { width: 80 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'disabled' },
        ],
      },
    },
  },
  required: ['warehouse_id', 'location_code'],
}

const stockSchema = {
  type: 'object',
  properties: {
    stock_id: { type: 'string', label: '库存ID', tableOption: { width: 160, 'show-overflow-tooltip': true } },
    keyword: {
      type: 'string',
      label: 'SKU / 商品',
      searchOption: {
        comType: 'input',
        placeholder: '输入 SKU 编码或商品名称',
        clearable: true,
        style: { width: '240px' },
      },
    },
    sku_code: { type: 'string', label: 'SKU编码', tableOption: { width: 130 } },
    product_name: { type: 'string', label: '商品', tableOption: { width: 160 } },
    warehouse_name: {
      type: 'string',
      label: '仓库',
      tableOption: { width: 120 },
      searchOption: {
        comType: 'input',
        placeholder: '输入仓库名称',
        clearable: true,
      },
    },
    total_qty: { type: 'number', label: '总量', tableOption: { width: 80 } },
    available_qty: { type: 'number', label: '可用', tableOption: { width: 80 } },
    locked_qty: { type: 'number', label: '锁定', tableOption: { width: 80 } },
    warning_qty: { type: 'number', label: '预警值', tableOption: { width: 80 } },
    stock_risk: { type: 'string', label: '风险', tableOption: { width: 90 } },
    risk: {
      type: 'string',
      label: '库存风险',
      searchOption: {
        comType: 'filterSelect',
        default: 'all',
        resetDefault: 'all',
        enumList: [
          { label: '全部库存', value: 'all' },
          { label: '库存异常', value: 'abnormal' },
          { label: '风险库存', value: 'low' },
          { label: '无库存', value: 'out_of_stock' },
          { label: '正常库存', value: 'normal' },
        ],
      },
    },
    updated_at: { type: 'string', label: '更新时间', tableOption: { width: 170 } },
  },
}

const stockLocationSchema = {
  type: 'object',
  properties: {
    stock_location_id: { type: 'string', label: 'ID', tableOption: { width: 160 } },
    keyword: {
      type: 'string',
      label: 'SKU / 商品',
      searchOption: {
        comType: 'input',
        placeholder: '输入 SKU 编码或商品名称',
        clearable: true,
        style: { width: '240px' },
      },
    },
    location_code: { type: 'string', label: '库位', tableOption: { width: 120 }, searchOption: { comType: 'input' } },
    sku_code: { type: 'string', label: 'SKU', tableOption: { width: 130 } },
    product_name: { type: 'string', label: '商品', tableOption: { width: 180 } },
    warehouse_name: { type: 'string', label: '仓库', tableOption: { width: 120 }, searchOption: { comType: 'input' } },
    qty: { type: 'number', label: 'SKU数量', tableOption: { width: 90 } },
    location_total_qty: { type: 'number', label: '库位总量', tableOption: { width: 100 } },
    location_sku_count: { type: 'number', label: '库位SKU数', tableOption: { width: 100 } },
    capacity: { type: 'number', label: '库位容量', tableOption: { width: 100 } },
    capacity_used_pct: { type: 'number', label: '占用率%', tableOption: { width: 100 } },
    risk_level: { type: 'string', label: '风险', tableOption: { width: 90 } },
  },
}

const stockLogSchema = {
  type: 'object',
  properties: {
    log_id: { type: 'string', label: '流水ID', tableOption: { width: 150, 'show-overflow-tooltip': true } },
    keyword: {
      type: 'string',
      label: 'SKU / 商品',
      searchOption: {
        comType: 'input',
        placeholder: '输入 SKU 编码或商品名称',
        clearable: true,
        style: { width: '240px' },
      },
    },
    action_type: {
      type: 'string',
      label: '动作',
      tableOption: { width: 100 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: 'all' },
          { label: '入库', value: 'inbound' },
          { label: '锁库', value: 'lock' },
          { label: '解锁', value: 'unlock' },
          { label: '出库', value: 'outbound' },
        ],
      },
    },
    sku_code: { type: 'string', label: 'SKU', tableOption: { width: 140 } },
    product_name: { type: 'string', label: '商品', tableOption: { width: 180 } },
    warehouse_name: { type: 'string', label: '仓库', tableOption: { width: 130 }, searchOption: { comType: 'input', placeholder: '输入仓库名称', clearable: true } },
    location_code: { type: 'string', label: '库位', tableOption: { width: 120 }, searchOption: { comType: 'input', placeholder: '输入库位编码', clearable: true } },
    qty_change: { type: 'number', label: '数量变化', tableOption: { width: 110 } },
    before_qty: { type: 'number', label: '操作前', tableOption: { width: 90 } },
    after_qty: { type: 'number', label: '操作后', tableOption: { width: 90 } },
    ref_type: { type: 'string', label: '关联类型', tableOption: { width: 100 } },
    ref_id: { type: 'string', label: '关联单据', tableOption: { width: 150, 'show-overflow-tooltip': true }, searchOption: { comType: 'input', placeholder: '输入订单/发货单号', clearable: true } },
    operator_name: { type: 'string', label: '操作人', tableOption: { width: 100 }, searchOption: { comType: 'input', placeholder: '输入操作人', clearable: true } },
    remark: { type: 'string', label: '备注', tableOption: { width: 180, 'show-overflow-tooltip': true } },
    created_at: { type: 'string', label: '发生时间', tableOption: { width: 170 } },
  },
}

function buildWarehouseMenu() {
  return {
    key: 'warehouse',
    name: '仓储管理',
    permissionCode: 'menu:fulfillment',
    menuType: 'module',
    moduleType: 'sider',
    siderConfig: {
      menu: [
        buildSchemaModule({ key: 'wh_list', name: '仓库管理', api: '/api/proj/warehouse', schema: warehouseSchema }),
        buildSchemaModule({ key: 'wh_location', name: '库位管理', api: '/api/proj/warehouse/location', schema: locationSchema }),
        buildSchemaModule({
          key: 'stock_list',
          name: '库存汇总',
          api: '/api/proj/stock',
          schema: stockSchema,
          headerButtons: [],
          rowButtons: [],
        }),
        buildSchemaModule({
          key: 'stock_loc',
          name: '库位库存',
          api: '/api/proj/stock/location',
          schema: stockLocationSchema,
          headerButtons: [],
          rowButtons: [],
        }),
        buildSchemaModule({
          key: 'stock_log',
          name: '库存流水',
          api: '/api/proj/stock/log',
          schema: stockLogSchema,
          headerButtons: [],
          rowButtons: [],
        }),
        {
          key: 'stock_inbound',
          name: '入库作业',
          menuType: 'module',
          moduleType: 'custom',
          customConfig: { path: '/stock-inbound' },
        },
        {
          key: 'warehouse_3d',
          name: '3D 仓库',
          menuType: 'module',
          moduleType: 'custom',
          customConfig: { path: '/warehouse-3d' },
        },
      ],
    },
  }
}

module.exports = { buildWarehouseMenu, warehouseSchema, locationSchema, stockSchema, stockLocationSchema, stockLogSchema }
