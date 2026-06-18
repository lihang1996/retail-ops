const { buildSchemaModule } = require('./org')

const statusEnum = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pending_review' },
  { label: '在售', value: 'on_sale' },
  { label: '下架', value: 'off_sale' },
]

const storeSchema = {
  type: 'object',
  properties: {
    store_id: { type: 'string', label: '店铺ID', tableOption: { width: 180 }, editFormOption: { comType: 'input', disabled: true } },
    store_name: { type: 'string', label: '店铺名称', tableOption: { width: 160 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    store_type: {
      type: 'string', label: '类型', tableOption: { width: 100 },
      createFormOption: { comType: 'select', enumList: [{ label: '线上', value: 'online' }, { label: '线下', value: 'offline' }, { label: '全渠道', value: 'omni' }] },
      editFormOption: { comType: 'select', enumList: [{ label: '线上', value: 'online' }, { label: '线下', value: 'offline' }, { label: '全渠道', value: 'omni' }] },
    },
    status: {
      type: 'string', label: '状态', tableOption: { width: 90 },
      searchOption: { comType: 'select', enumList: [{ label: '全部', value: '' }, { label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
      editFormOption: { comType: 'select', enumList: [{ label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
    },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 170 } },
  },
  required: ['store_name'],
}

const categorySchema = {
  type: 'object',
  properties: {
    category_id: { type: 'string', label: '类目ID', tableOption: { width: 180 }, editFormOption: { comType: 'input', disabled: true } },
    category_name: { type: 'string', label: '类目名称', tableOption: { width: 160 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    parent_id: { type: 'string', label: '上级类目', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    status: { type: 'string', label: '状态', tableOption: { width: 90 } },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 170 } },
  },
  required: ['category_name'],
}

const brandSchema = {
  type: 'object',
  properties: {
    brand_id: { type: 'string', label: '品牌ID', tableOption: { width: 180 }, editFormOption: { comType: 'input', disabled: true } },
    brand_name: { type: 'string', label: '品牌名称', tableOption: { width: 160 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    status: { type: 'string', label: '状态', tableOption: { width: 90 } },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 170 } },
  },
  required: ['brand_name'],
}

const productSchema = {
  type: 'object',
  properties: {
    product_id: { type: 'string', label: '商品ID', tableOption: { width: 180, 'show-overflow-tooltip': true }, editFormOption: { comType: 'input', disabled: true } },
    product_name: { type: 'string', label: '商品名称', tableOption: { width: 180 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    category_name: { type: 'string', label: '类目', tableOption: { width: 120 } },
    category_id: { type: 'string', label: '类目ID', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    brand_name: { type: 'string', label: '品牌', tableOption: { width: 120 } },
    brand_id: { type: 'string', label: '品牌ID', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    status: {
      type: 'string', label: '状态', tableOption: { width: 100 },
      searchOption: { comType: 'select', enumList: statusEnum },
    },
    sku_count: { type: 'number', label: 'SKU数', tableOption: { width: 80 } },
    main_image: { type: 'string', label: '主图URL', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    description: { type: 'string', label: '描述', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 170 } },
  },
  required: ['product_name'],
}

module.exports = {
  storeSchema,
  categorySchema,
  brandSchema,
  productSchema,
  buildProductMenu() {
    return {
      key: 'product',
      name: '商品管理',
      menuType: 'module',
      moduleType: 'sider',
      siderConfig: {
        menu: [
          buildSchemaModule({ key: 'store', name: '店铺管理', api: '/api/proj/store', schema: storeSchema }),
          buildSchemaModule({ key: 'category', name: '类目管理', api: '/api/proj/category', schema: categorySchema }),
          buildSchemaModule({ key: 'brand', name: '品牌管理', api: '/api/proj/brand', schema: brandSchema }),
          buildSchemaModule({
            key: 'product_item',
            name: '商品管理',
            api: '/api/proj/product',
            schema: productSchema,
            rowButtons: [
              { label: '修改', eventKey: 'showComponent', eventOption: { comName: 'editForm' }, type: 'warning' },
              { label: '删除', eventKey: 'remove', eventOption: { params: { product_id: 'schema::product_id' } }, type: 'danger' },
            ],
          }),
        ],
      },
    }
  },
}
