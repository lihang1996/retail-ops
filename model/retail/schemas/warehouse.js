const { buildSchemaModule } = require('./org')

const warehouseSchema = {
  type: 'object',
  properties: {
    warehouse_id: { type: 'string', label: '仓库ID', tableOption: { width: 160 }, editFormOption: { comType: 'input', disabled: true } },
    warehouse_name: { type: 'string', label: '仓库名称', tableOption: { width: 140 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    warehouse_code: { type: 'string', label: '仓库编码', tableOption: { width: 120 }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input', disabled: true } },
    address: { type: 'string', label: '地址', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    status: { type: 'string', label: '状态', tableOption: { width: 80 } },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 170 } },
  },
  required: ['warehouse_name', 'warehouse_code'],
}

const locationSchema = {
  type: 'object',
  properties: {
    location_id: { type: 'string', label: '库位ID', tableOption: { width: 160 }, editFormOption: { comType: 'input', disabled: true } },
    warehouse_name: { type: 'string', label: '仓库', tableOption: { width: 120 } },
    location_code: { type: 'string', label: '库位编码', tableOption: { width: 120 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input', disabled: true } },
    warehouse_id: { type: 'string', label: '仓库ID', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input', disabled: true } },
    capacity: { type: 'number', label: '容量', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    pos_x: { type: 'number', label: 'X', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    pos_y: { type: 'number', label: 'Y', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    pos_z: { type: 'number', label: 'Z', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    status: { type: 'string', label: '状态', tableOption: { width: 80 } },
  },
  required: ['warehouse_id', 'location_code'],
}

const stockSchema = {
  type: 'object',
  properties: {
    stock_id: { type: 'string', label: '库存ID', tableOption: { width: 160, 'show-overflow-tooltip': true } },
    sku_code: { type: 'string', label: 'SKU编码', tableOption: { width: 130 }, searchOption: { comType: 'input' } },
    product_name: { type: 'string', label: '商品', tableOption: { width: 160 } },
    warehouse_name: { type: 'string', label: '仓库', tableOption: { width: 120 } },
    total_qty: { type: 'number', label: '总量', tableOption: { width: 80 } },
    available_qty: { type: 'number', label: '可用', tableOption: { width: 80 } },
    locked_qty: { type: 'number', label: '锁定', tableOption: { width: 80 } },
    warning_qty: { type: 'number', label: '预警值', tableOption: { width: 80 } },
    updated_at: { type: 'string', label: '更新时间', tableOption: { width: 170 } },
  },
}

const stockLocationSchema = {
  type: 'object',
  properties: {
    stock_location_id: { type: 'string', label: 'ID', tableOption: { width: 160 } },
    location_code: { type: 'string', label: '库位', tableOption: { width: 120 } },
    sku_code: { type: 'string', label: 'SKU', tableOption: { width: 130 } },
    warehouse_name: { type: 'string', label: '仓库', tableOption: { width: 120 } },
    qty: { type: 'number', label: '数量', tableOption: { width: 80 } },
  },
}

function buildWarehouseMenu() {
  return {
    key: 'warehouse',
    name: '仓储管理',
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
        {
          key: 'stock_inbound',
          name: '商品入库',
          menuType: 'module',
          moduleType: 'custom',
          customConfig: { path: '/stock-inbound' },
        },
      ],
    },
  }
}

module.exports = { buildWarehouseMenu, warehouseSchema, locationSchema, stockSchema }
