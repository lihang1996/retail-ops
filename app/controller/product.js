/**
 * @module controller/product
 * @description 商品控制器：商品与 SKU 的 CRUD、上下架流程接口。
 *
 * 核心职责：
 * 1. 商品基础 CRUD（创建、查询、修改、删除）
 * 2. SKU 管理（创建、修改、删除 SKU）
 * 3. 商品状态流转（提交审核、上架、下架）
 *
 * 状态流转：
 * draft → pending_review → on_sale ↔ off_sale
 *
 * 关键规则：
 * - 已上架商品不可直接编辑 SKU（须先下架）
 * - 上架需通过审批流程
 * - 删除仅限草稿状态商品
 */
const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class ProductController extends BaseController {
    /**
     * 商品列表查询
     * GET /api/proj/product/list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.status - 商品状态筛选
     * @param {string} ctx.request.query.product_name - 商品名称模糊搜索
     * @param {string} ctx.request.query.category_id - 类目筛选
     * @param {string} ctx.request.query.stock_risk - 库存风险筛选（normal/has_risk/none）
     * @param {string} ctx.request.query.approval_status - 审批状态筛选（pending/none）
     * @returns {Object} { success, data: list, meta: { total } }
     */
    list = wrap(async function list(ctx) {
      const result = await app.service.product.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 商品详情查询
     * GET /api/proj/product
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.product_id - 商品 ID
     * @returns {Object} { success, data: { ...product, skus } }
     */
    get = wrap(async function get(ctx) {
      const data = await app.service.product.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    /**
     * 创建商品（初始状态：draft）
     * POST /api/proj/product
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.product_name - 商品名称（必填）
     * @param {string} ctx.request.body.category_id - 类目 ID
     * @param {string} ctx.request.body.brand_id - 品牌 ID
     * @param {string} ctx.request.body.main_image - 主图 URL
     * @param {string} ctx.request.body.description - 商品描述
     * @returns {Object} { success, data: { productId } }
     */
    create = wrap(async function create(ctx) {
      const data = await app.service.product.create(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 更新商品资料（仅限草稿或下架商品）
     * PUT /api/proj/product
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.product_id - 商品 ID（必填）
     * @param {string} ctx.request.body.product_name - 新商品名称
     * @param {string} ctx.request.body.category_id - 新类目 ID
     * @param {string} ctx.request.body.brand_id - 新品牌 ID
     * @param {string} ctx.request.body.main_image - 新主图 URL
     * @param {string} ctx.request.body.description - 新描述
     * @returns {Object} { success, data: { productId } }
     */
    update = wrap(async function update(ctx) {
      const data = await app.service.product.update(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 删除商品（仅限草稿状态）
     * DELETE /api/proj/product
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.product_id - 商品 ID
     * @returns {Object} { success, data: { productId } }
     */
    remove = wrap(async function remove(ctx) {
      const data = await app.service.product.delete(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 查询 SKU 列表（可按商品筛选，或返回租户下全部 SKU 供入库等场景选择）
     * GET /api/proj/product/sku_list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.product_id - 商品 ID（可选）
     * @param {string} ctx.request.query.keyword - SKU 编码/名称模糊搜索
     * @returns {Object} { success, data: list, meta: { total } }
     */
    skuList = wrap(async function skuList(ctx) {
      const result = await app.service.product.listSkus(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 为商品创建 SKU（仅限草稿或下架商品）
     * POST /api/proj/product/sku
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.product_id - 商品 ID（必填）
     * @param {string} ctx.request.body.sku_code - SKU 编码（必填，租户内唯一）
     * @param {string} ctx.request.body.barcode - 条码
     * @param {Object} ctx.request.body.spec_json - 规格 JSON（如 {颜色: '红色', 尺码: 'L'}）
     * @param {number} ctx.request.body.sale_price - 售价
     * @param {number} ctx.request.body.cost_price - 成本价
     * @returns {Object} { success, data: { skuId } }
     */
    skuCreate = wrap(async function skuCreate(ctx) {
      const data = await app.service.product.createSku(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 更新 SKU 信息
     * PUT /api/proj/product/sku
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.sku_id - SKU ID（必填）
     * @param {string} ctx.request.body.barcode - 新条码
     * @param {Object} ctx.request.body.spec_json - 新规格 JSON
     * @param {number} ctx.request.body.sale_price - 新售价
     * @param {number} ctx.request.body.cost_price - 新成本价
     * @param {string} ctx.request.body.status - 新状态（active/disabled）
     * @returns {Object} { success, data: { skuId } }
     */
    skuUpdate = wrap(async function skuUpdate(ctx) {
      const data = await app.service.product.updateSku(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 删除 SKU（仅限草稿或下架商品）
     * DELETE /api/proj/product/sku
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.sku_id - SKU ID
     * @returns {Object} { success, data: { skuId } }
     */
    skuRemove = wrap(async function skuRemove(ctx) {
      const data = await app.service.product.deleteSku(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 提交上架审批（draft/off_sale → pending_review）
     * POST /api/proj/product/submit_review
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.product_id - 商品 ID
     * @returns {Object} { success, data: { approvalId } }
     */
    submitReview = wrap(async function submitReview(ctx) {
      const { product_id: productId } = ctx.request.body
      // 委托给审批服务创建审批单
      const data = await app.service.approval.submit(ctx, {
        ref_type: 'product_on_sale', // 审批类型：商品上架
        ref_id: productId,
      })
      this.success(ctx, data)
    })

    /**
     * 商品上架（pending_review → on_sale）
     * POST /api/proj/product/on_sale
     * 前置条件：须有已通过的审批记录
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.product_id - 商品 ID
     * @returns {Object} { success, data: { productId, status } }
     */
    onSale = wrap(async function onSale(ctx) {
      const data = await app.service.product.onSale(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 商品下架（on_sale → off_sale）
     * POST /api/proj/product/off_sale
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.product_id - 商品 ID
     * @returns {Object} { success, data: { productId, status } }
     */
    offSale = wrap(async function offSale(ctx) {
      const data = await app.service.product.offSale(ctx, ctx.request.body)
      this.success(ctx, data)
    })
  }
}
