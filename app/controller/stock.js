/**
 * @module controller/stock
 * @description 库存控制器：库存查询、入库、锁定/解锁、出库接口。
 *
 * 核心职责：
 * 1. 库存查询（仓库级、库位级、流水）
 * 2. 库存变更操作（入库、出库）
 * 3. 库存锁定管理（锁定、解锁）
 *
 * 关键规则：
 * - 所有库存变更必须经过 stockService（库存红线）
 * - 使用乐观锁（version）防止并发冲突
 * - 所有操作自动记录 stock_logs 流水
 *
 * 委托给 service.stock 处理业务逻辑
 */
const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class StockController extends BaseController {
    /**
     * 库存列表查询（仓库-SKU 汇总级别）
     * GET /api/proj/stock/list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.warehouse_id - 仓库筛选
     * @param {string} ctx.request.query.warehouse_name - 仓库名称模糊筛选
     * @param {string} ctx.request.query.location_code - 库位编码模糊筛选
     * @param {string} ctx.request.query.sku_id - SKU 筛选
     * @param {string} ctx.request.query.sku_code - SKU 编码模糊搜索
     * @param {string} ctx.request.query.risk - 风险筛选（'low' 表示低库存）
     * @returns {Object} { success, data: list, meta: { total } }
     *
     * 返回字段：
     * - total_qty: 总库存
     * - available_qty: 可用库存
     * - locked_qty: 锁定库存
     * - stock_risk: 库存风险（none/has_risk/normal）
     */
    list = wrap(async function list(ctx) {
      const result = await app.service.stock.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 库位级库存查询（库位-SKU 明细级别）
     * GET /api/proj/stock/location_list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.warehouse_id - 仓库筛选
     * @param {string} ctx.request.query.sku_id - SKU 筛选
     * @returns {Object} { success, data: list, meta: { total } }
     *
     * 返回字段：
     * - location_code: 库位编码
     * - sku_code: SKU 编码
     * - qty: 当前 SKU 在库位中的数量
     * - location_total_qty: 库位全部 SKU 合计数量
     * - capacity_used_pct/risk_level: 与 3D 风险地图一致的库位占用率与风险
     */
    locationList = wrap(async function locationList(ctx) {
      const result = await app.service.stock.listLocations(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 库存流水查询（变动历史记录）
     * GET /api/proj/stock/log_list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.sku_id - SKU 筛选
     * @param {string} ctx.request.query.warehouse_id - 仓库筛选
     * @param {string} ctx.request.query.action_type - 操作类型筛选（inbound/outbound/lock/unlock）
     * @returns {Object} { success, data: list, meta: { total } }
     *
     * 流水记录包含：
     * - action_type: 操作类型
     * - qty_change: 数量变化（正数增加，负数减少）
     * - before_qty: 操作前数量
     * - after_qty: 操作后数量
     * - ref_type/ref_id: 关联单据（order/shipment 等）
     */
    logList = wrap(async function logList(ctx) {
      const result = await app.service.stock.listLogs(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 入库操作（增加 total_qty 和 available_qty）
     * POST /api/proj/stock/inbound
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.warehouse_id - 仓库 ID（必填）
     * @param {string} ctx.request.body.location_id - 库位 ID（可选）
     * @param {string} ctx.request.body.sku_id - SKU ID（必填）
     * @param {number} ctx.request.body.qty - 入库数量（必填，>0）
     * @param {string} ctx.request.body.remark - 备注
     * @returns {Object} { success, data: { skuId, warehouseId, qty } }
     *
     * 业务规则：
     * - 自动创建或更新 stocks 记录
     * - 同时更新库位级库存（stock_locations）
     * - 记录 stock_logs 流水
     * - 使用乐观锁防止并发冲突
     */
    inbound = wrap(async function inbound(ctx) {
      const data = await app.service.stock.inbound(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 锁定库存（available_qty → locked_qty）
     * POST /api/proj/stock/lock
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.warehouse_id - 仓库 ID（必填）
     * @param {string} ctx.request.body.sku_id - SKU ID（必填）
     * @param {number} ctx.request.body.qty - 锁定数量（必填，>0）
     * @param {string} ctx.request.body.ref_type - 关联类型（默认 'order'）
     * @param {string} ctx.request.body.ref_id - 关联单据 ID（必填）
     * @returns {Object} { success, data: { skuId, warehouseId, qty, lockId } }
     *
     * 业务规则：
     * - 检查 available_qty 是否足够
     * - available_qty 减少，locked_qty 增加
     * - 创建 stock_locks 记录（status='active'）
     * - 记录 stock_logs 流水
     * - 返回 lockId 供后续解锁或出库使用
     */
    lock = wrap(async function lock(ctx) {
      const data = await app.service.stock.lock(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 释放锁定（locked_qty → available_qty）
     * POST /api/proj/stock/unlock
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.lock_id - 锁定记录 ID（必填）
     * @returns {Object} { success, data: { lockId } }
     *
     * 业务规则：
     * - 查询 stock_locks 记录（status='active'）
     * - locked_qty 减少，available_qty 增加
     * - 更新 stock_locks.status='released'
     * - 记录 stock_logs 流水
     * - 通常用于订单取消场景
     */
    unlock = wrap(async function unlock(ctx) {
      const data = await app.service.stock.unlock(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 出库操作（扣减 total_qty）
     * POST /api/proj/stock/outbound
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.warehouse_id - 仓库 ID（必填）
     * @param {string} ctx.request.body.sku_id - SKU ID（必填）
     * @param {number} ctx.request.body.qty - 出库数量（必填，>0）
     * @param {string} ctx.request.body.lock_id - 锁定记录 ID（可选）
     * @param {string} ctx.request.body.ref_type - 关联类型（默认 'shipment'）
     * @param {string} ctx.request.body.ref_id - 关联单据 ID
     * @returns {Object} { success, data: { skuId, warehouseId, qty } }
     *
     * 业务规则：
     * - 优先消耗锁定量：有 lock_id 则扣 locked_qty，否则扣 available_qty
     * - total_qty 总是减少
     * - 更新 stock_locks 记录（qty 减少或 status='consumed'）
     * - 记录 stock_logs 流水
     * - 通常用于发货出库场景
     */
    outbound = wrap(async function outbound(ctx) {
      const data = await app.service.stock.outbound(ctx, ctx.request.body)
      this.success(ctx, data)
    })
  }
}
