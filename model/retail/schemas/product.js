/**
 * @module model/retail/schemas/product
 * @description 商品中心前端 Schema 定义：店铺、类目、品牌、商品的表格和表单配置。
 *
 * 核心职责：
 * 1. 定义表格列配置（tableOption）
 * 2. 定义搜索表单配置（searchOption）
 * 3. 定义创建/编辑表单配置（createFormOption/editFormOption）
 * 4. 构建商品管理菜单结构
 *
 * Schema 驱动：
 * - elpis 框架根据 schema 自动生成表格、表单、搜索框
 * - 减少前端重复代码，统一 UI 风格
 *
 * 使用场景：
 * - 商品管理模块的 CRUD 界面
 * - 与 dict-service/dict-controller 配合使用
 */
const { buildSchemaModule } = require('./org')

// 商品状态枚举（用于下拉选择和状态筛选）
const statusEnum = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pending_review' },
  { label: '在售', value: 'on_sale' },
  { label: '下架', value: 'off_sale' },
]

/**
 * 店铺 Schema
 * 表：stores
 * 字段：store_id, store_name, store_type, status
 */
const storeSchema = {
  type: 'object',
  properties: {
    store_id: { type: 'string', label: '店铺ID', tableOption: { width: 180 }, editFormOption: { comType: 'input', disabled: true } },
    store_name: { type: 'string', label: '店铺名称', tableOption: { width: 160 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    store_type: {
      type: 'string', label: '渠道类型', tableOption: { width: 112 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: 'all' },
          { label: '线上', value: 'online' },
          { label: '线下', value: 'offline' },
          { label: '全渠道', value: 'omni' },
        ],
      },
      createFormOption: { comType: 'select', enumList: [{ label: '线上', value: 'online' }, { label: '线下', value: 'offline' }, { label: '全渠道', value: 'omni' }] },
      editFormOption: { comType: 'select', enumList: [{ label: '线上', value: 'online' }, { label: '线下', value: 'offline' }, { label: '全渠道', value: 'omni' }] },
    },
    status: {
      type: 'string', label: '状态', tableOption: { width: 96 },
      searchOption: { comType: 'select', enumList: [{ label: '全部', value: 'all' }, { label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
      createFormOption: { comType: 'select', enumList: [{ label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
      editFormOption: { comType: 'select', enumList: [{ label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
    },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 176 } },
  },
  required: ['store_name'], // 必填字段
}

/**
 * 类目 Schema
 * 表：categories
 * 字段：category_id, category_name, parent_id, status
 * 支持树形结构（parent_id）
 */
const categorySchema = {
  type: 'object',
  properties: {
    category_id: { type: 'string', label: '类目ID', tableOption: { width: 180 }, editFormOption: { comType: 'input', disabled: true } },
    category_name: { type: 'string', label: '类目名称', tableOption: { width: 160 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    parent_id: { type: 'string', label: '上级类目', tableOption: { width: 150 }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    status: {
      type: 'string', label: '状态', tableOption: { width: 96 },
      searchOption: { comType: 'select', enumList: [{ label: '全部', value: 'all' }, { label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
      editFormOption: { comType: 'select', enumList: [{ label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
    },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 176 } },
  },
  required: ['category_name'],
}

/**
 * 品牌 Schema
 * 表：brands
 * 字段：brand_id, brand_name, status
 */
const brandSchema = {
  type: 'object',
  properties: {
    brand_id: { type: 'string', label: '品牌ID', tableOption: { width: 180 }, editFormOption: { comType: 'input', disabled: true } },
    brand_name: { type: 'string', label: '品牌名称', tableOption: { width: 160 }, searchOption: { comType: 'input' }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    status: {
      type: 'string', label: '状态', tableOption: { width: 96 },
      searchOption: { comType: 'select', enumList: [{ label: '全部', value: 'all' }, { label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
      editFormOption: { comType: 'select', enumList: [{ label: '启用', value: 'active' }, { label: '停用', value: 'disabled' }] },
    },
    created_at: { type: 'string', label: '创建时间', tableOption: { width: 176 } },
  },
  required: ['brand_name'],
}

/**
 * 商品 Schema
 * 表：products
 * 字段：product_id, product_name, category_id, brand_id, status, main_image, description
 * 扩展字段（查询时 join）：category_name, brand_name, sku_count, stock_total, stock_risk, approval_status
 */
const productSchema = {
  type: 'object',
  properties: {
    // 基础信息
    product_id: { type: 'string', label: '商品ID', tableOption: { width: 180, 'show-overflow-tooltip': true }, editFormOption: { comType: 'input', disabled: true } },
    keyword: {
      type: 'string',
      label: '商品关键字',
      searchOption: {
        comType: 'input',
        placeholder: '商品名称 / 类目 / 品牌',
        clearable: true,
        style: { width: '240px' },
      },
    },
    product_name: { type: 'string', label: '商品名称', tableOption: { width: 200, 'show-overflow-tooltip': true }, createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },

    // 类目（关联查询）
    category_name: { type: 'string', label: '类目', tableOption: { width: 120 }, searchOption: { comType: 'input', placeholder: '输入类目名称', clearable: true } },
    category_id: { type: 'string', label: '类目ID', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },

    // 品牌（关联查询）
    brand_name: { type: 'string', label: '品牌', tableOption: { width: 120 }, searchOption: { comType: 'input', placeholder: '输入品牌名称', clearable: true } },
    brand_id: { type: 'string', label: '品牌ID', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },

    // 商品状态
    status: {
      type: 'string', label: '状态', tableOption: { width: 100 },
      searchOption: { comType: 'select', enumList: statusEnum },
    },

    // 统计字段（service 层计算）
    sku_count: { type: 'number', label: 'SKU数', tableOption: { width: 80 } },
    stock_total: { type: 'number', label: '可用库存', tableOption: { width: 100 } },
    stock_risk: {
      type: 'string', label: '库存风险', tableOption: { width: 108 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: 'all' },
          { label: '正常', value: 'normal' },
          { label: '有风险', value: 'has_risk' }, // available_qty <= warning_qty
          { label: '无库存', value: 'none' },
        ],
      },
    },
    approval_status: {
      type: 'string', label: '审批状态', tableOption: { width: 108 },
      searchOption: {
        comType: 'select',
        enumList: [
          { label: '全部', value: 'all' },
          { label: '待审批', value: 'pending' },
          { label: '无', value: 'none' },
        ],
      },
    },

    // 商品资料
    main_image: { type: 'string', label: '主图URL', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },
    description: { type: 'string', label: '描述', createFormOption: { comType: 'input' }, editFormOption: { comType: 'input' } },

    created_at: { type: 'string', label: '创建时间', tableOption: { width: 170, visible: false } },
  },
  required: ['product_name'],
}

module.exports = {
  storeSchema,
  categorySchema,
  brandSchema,
  productSchema,

  /**
   * 构建商品管理菜单（包含店铺、类目、品牌、商品四个子菜单）
   * @returns {Object} elpis 菜单配置对象
   */
  buildProductMenu() {
    return {
      key: 'product',
      name: '商品管理',
      permissionCode: 'menu:product', // 菜单权限码
      menuType: 'module',
      moduleType: 'sider', // 侧边栏菜单
      siderConfig: {
        menu: [
          // 店铺管理
          buildSchemaModule({ key: 'store', name: '店铺管理', api: '/api/proj/store', schema: storeSchema }),

          // 类目管理
          buildSchemaModule({ key: 'category', name: '类目管理', api: '/api/proj/category', schema: categorySchema }),

          // 品牌管理
          buildSchemaModule({ key: 'brand', name: '品牌管理', api: '/api/proj/brand', schema: brandSchema }),

          // 商品管理（带自定义行按钮）
          buildSchemaModule({
            key: 'product_item',
            name: '商品列表',
            api: '/api/proj/product',
            schema: productSchema,
            rowButtons: [
              { label: '修改', eventKey: 'showComponent', eventOption: { comName: 'editForm' }, type: 'primary' },
              { label: '删除', eventKey: 'remove', eventOption: { params: { product_id: 'schema::product_id' } }, type: 'danger' },
            ],
          }),
        ],
      },
    }
  },
}
