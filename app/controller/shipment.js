/**
 * @module controller/shipment
 * @description 发货单控制器：发货单管理、拣货流程、出库发货、拣货路径接口。
 *
 * 核心职责：
 * 1. 发货单查询（列表、详情）
 * 2. 从订单生成发货单
 * 3. 拣货流程管理（开始、确认）
 * 4. 出库发货（扣库存、写物流）
 * 5. 拣货路径规划（3D 导航）
 *
 * 发货单状态流转：
 * created → picking → picked → shipped
 *
 * 关键规则：
 * - 订单须已分仓（allocated）才能生成发货单
 * - 一个订单仅允许一个未完成的发货单
 * - 发货时扣库存并更新订单状态为 shipped
 *
 * 委托给 service.shipment 处理业务逻辑
 */
const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class ShipmentController extends BaseController {
    /**
     * 发货单列表查询
     * GET /api/proj/shipment/list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.status - 状态筛选（created/picking/picked/shipped）
     * @param {string} ctx.request.query.order_id - 订单筛选
     * @returns {Object} { success, data: list, meta: { total } }
     *
     * 返回字段包含：
     * - shipment_no: 发货单号
     * - order_no: 关联订单号
     * - warehouse_name: 发货仓库
     * - status: 发货单状态
     */
    list = wrap(async function list(ctx) {
      const result = await app.service.shipment.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 发货单详情查询
     * GET /api/proj/shipment
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.shipment_id - 发货单 ID
     * @returns {Object} { success, data: { ...shipment, items, pickingTasks, logistics } }
     *
     * 返回详情包含：
     * - shipment: 发货单主信息
     * - items: 发货明细（SKU、数量、建议库位、实拣库位）
     * - pickingTasks: 拣货任务记录
     * - logistics: 物流信息
     */
    get = wrap(async function get(ctx) {
      const data = await app.service.shipment.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    /**
     * 从订单生成发货单
     * POST /api/proj/shipment/create_from_order
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.order_id - 订单 ID（必填）
     * @returns {Object} { success, data: { shipmentId, shipmentNo } }
     *
     * 业务流程：
     * 1. 检查订单状态（paid 则自动分仓，allocated 直接生成）
     * 2. 检查订单未分仓则报错
     * 3. 检查订单无未完成发货单
     * 4. 创建发货单（状态 created）
     * 5. 创建发货明细（自动建议拣货库位）
     *
     * 库位建议策略：
     * - 选择该 SKU 在仓库中 qty 最大的库位
     * - 优先拣货效率（减少移动距离）
     *
     * 关键规则：
     * - 订单须已分仓（allocated）
     * - 一订单仅允许一个未完成发货单
     * - 未分仓的 paid 订单会自动触发分仓
     */
    createFromOrder = wrap(async function createFromOrder(ctx) {
      const data = await app.service.shipment.createFromOrder(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 开始拣货
     * POST /api/proj/shipment/start_pick
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.shipment_id - 发货单 ID（必填）
     * @returns {Object} { success, data: { shipmentId, taskId } }
     *
     * 业务流程：
     * 1. 检查发货单状态为 created
     * 2. 发货单状态 → picking
     * 3. 创建 picking_task 记录（status=in_progress）
     * 4. 记录拣货员和开始时间
     *
     * 拣货任务记录用于：
     * - 追踪拣货耗时
     * - 拣货员绩效统计
     * - 拣货异常追溯
     */
    startPick = wrap(async function startPick(ctx) {
      const data = await app.service.shipment.startPick(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 确认拣货完成
     * POST /api/proj/shipment/confirm_pick
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.shipment_id - 发货单 ID（必填）
     * @returns {Object} { success, data: { shipmentId } }
     *
     * 业务流程：
     * 1. 检查发货单状态为 picking
     * 2. 记录实际拣货库位（picked_location_id）
     * 3. 发货单状态 → picked
     * 4. 更新 picking_task 状态为 done，记录完成时间
     *
     * 实拣库位 vs 建议库位：
     * - suggested_location_id: 系统建议的库位
     * - picked_location_id: 实际拣货的库位
     * - 两者可能不同（库位调整、缺货等）
     */
    confirmPick = wrap(async function confirmPick(ctx) {
      const data = await app.service.shipment.confirmPick(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 出库发货
     * POST /api/proj/shipment/ship
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.shipment_id - 发货单 ID（必填）
     * @param {string} ctx.request.body.carrier - 承运商（可选，默认 'STANDARD_EXPRESS'）
     * @param {string} ctx.request.body.tracking_no - 物流单号（可选，自动生成）
     * @returns {Object} { success, data: { shipmentId, orderId } }
     *
     * 业务流程：
     * 1. 检查发货单状态为 picked
     * 2. 查询订单明细的 lock_id（支付时锁定的库存）
     * 3. 逐 SKU 调用 stock.outbound 扣库存
     *    - 有 lock_id: 消耗 locked_qty
     *    - 无 lock_id: 扣减 available_qty
     * 4. 发货单状态 → shipped
     * 5. 创建物流记录
     * 6. 订单状态 → shipped
     * 7. 记录订单状态变更日志
     *
     * 关键规则：
     * - 出库时扣减实际库存（total_qty）
     * - 优先消耗锁定量（locked_qty）
     * - 出库完成后订单自动变为 shipped
     */
    ship = wrap(async function ship(ctx) {
      const data = await app.service.shipment.ship(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 获取拣货路径（3D 导航）
     * GET /api/proj/shipment/picking_route
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.shipment_id - 发货单 ID
     * @returns {Object} { success, data: { shipmentId, warehouseId, shipmentNo, points } }
     *
     * 返回路径点列表：
     * - points: 拣货点数组，按 (pos_x, pos_z) 排序
     * - 每个点包含：
     *   - location_id: 库位 ID
     *   - location_code: 库位编码
     *   - sku_id, sku_code: SKU 信息
     *   - qty: 拣货数量
     *   - pos_x, pos_y, pos_z: 3D 坐标
     *   - seq: 拣货顺序（1, 2, 3...）
     *
     * 路径规划策略：
     * - 按 X 轴优先、Z 轴次要排序
     * - 减少横向移动距离
     * - 适用于标准货架布局（行列排列）
     *
     * 使用场景：
     * - PDA 拣货导航
     * - 3D 仓库可视化（显示拣货路径）
     * - 拣货效率分析
     */
    pickingRoute = wrap(async function pickingRoute(ctx) {
      const data = await app.service.shipment.getPickingRoute(ctx, ctx.request.query)
      this.success(ctx, data)
    })
  }
}
