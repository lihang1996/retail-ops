/**
 * @module controller/order
 * @description 订单控制器：订单查询、Excel 导入、支付确认、手动分仓接口。
 *
 * 核心职责：
 * 1. 订单列表和详情查询
 * 2. Excel 批量导入订单
 * 3. 支付确认（锁定库存）
 * 4. 手动触发分仓
 *
 * 订单状态流转：
 * pending_payment → paid → allocated → shipped
 *
 * 关键规则：
 * - Excel 导入后订单状态为 pending_payment
 * - 支付时自动锁定库存
 * - 分仓可手动触发或在生成发货单时自动触发
 *
 * 委托给 service.order 处理业务逻辑
 */
const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class OrderController extends BaseController {
    /**
     * 订单列表查询
     * GET /api/proj/order/list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.status - 状态筛选（pending_payment/paid/allocated/shipped）
     * @param {string} ctx.request.query.order_no - 订单号模糊搜索
     * @param {string} ctx.request.query.warehouse_id - 仓库筛选
     * @returns {Object} { success, data: list, meta: { total } }
     *
     * 返回字段包含：
     * - order_no: 订单号
     * - status: 订单状态
     * - warehouse_name: 分配的仓库名称
     * - total_amount: 订单总额
     * - item_count: 明细条数
     */
    list = wrap(async function list(ctx) {
      const result = await app.service.order.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 订单详情查询
     * GET /api/proj/order
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.order_id - 订单 ID
     * @returns {Object} { success, data: { ...order, items, statusLogs } }
     *
     * 返回详情包含：
     * - order: 订单主信息
     * - items: 订单明细（SKU、数量、价格）
     * - statusLogs: 状态变更日志
     */
    get = wrap(async function get(ctx) {
      const data = await app.service.order.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    /**
     * Excel 导入订单
     * POST /api/proj/order/import
     * @param {Object} ctx.request.file - 上传的 Excel 文件
     * @returns {Object} { success, data: { batchId, total, successCount, failCount } }
     *
     * Excel 格式要求：
     * - 列：订单号、SKU编码、数量、单价、收货人、收货地址、收货电话
     * - 同订单号的多行会合并为一个订单的多个明细
     *
     * 导入规则：
     * - 验证 SKU 编码存在性
     * - 订单号重复则跳过
     * - 导入后订单状态为 pending_payment
     * - 同步处理，返回 batchId 与成功/失败明细
     */
    importFile = wrap(async function importFile(ctx) {
      const data = await app.service.order.importFile(ctx, ctx.request.file)
      this.success(ctx, data)
    })

    /**
     * 查询 Excel 导入结果
     * GET /api/proj/order/import_result
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.batch_id - 导入批次 ID
     * @returns {Object} { success, data: { batchId, total, success, fail, errors } }
     */
    importResult = wrap(async function importResult(ctx) {
      const data = await app.service.order.importResult(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    /**
     * 支付确认
     * POST /api/proj/order/pay
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.order_id - 订单 ID（必填）
     * @returns {Object} { success, data: { orderId, status, lockIds } }
     *
     * 业务流程：
     * 1. 检查订单状态为 pending_payment
     * 2. 自动选仓（调用 findWarehouseForItems）
     * 3. 锁定各 SKU 库存（调用 stock.lock）
     * 4. 订单状态 → paid
     * 5. 记录 lock_id 到 order_items（供后续出库消耗）
     *
     * 关键规则：
     * - 库存不足时支付失败
     * - 支付后 warehouse_id 固定，不再变更
     * - 锁定的库存在出库时消耗
     */
    pay = wrap(async function pay(ctx) {
      const data = await app.service.order.pay(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 手动触发分仓
     * POST /api/proj/order/allocate
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.order_id - 订单 ID（必填）
     * @returns {Object} { success, data: { orderId, warehouseId, warehouseName } }
     *
     * 业务流程：
     * 1. 检查订单状态为 paid
     * 2. 选择最优仓库（优先沿用 warehouse_id，否则自动选仓）
     * 3. 订单状态 → allocated
     * 4. 记录状态变更日志
     *
     * 分仓策略：
     * - 优先沿用支付时选定的 warehouse_id
     * - 无 warehouse_id 时自动选仓（各 SKU 均可满足且最小可用量最大）
     *
     * 触发时机：
     * - 可手动触发（本接口）
     * - 生成发货单时自动触发（未分仓的 paid 订单）
     */
    allocate = wrap(async function allocate(ctx) {
      const data = await app.service.order.allocate(ctx, ctx.request.body)
      this.success(ctx, data)
    })
  }
}
