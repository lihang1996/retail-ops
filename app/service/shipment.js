/**
 * @module service/shipment
 * @description 发货单服务：从订单生成发货单、拣货、出库发货。
 * 状态流转：created → picking → picked → shipped；发货时扣库存并将订单置为 shipped。
 * 关键规则：订单须已分仓（allocated）；一订单仅允许一个未完成发货单；未分仓时自动触发分仓。
 */
const {
  ensureDb,
  getTenantId,
  getOperatorId,
  getRequestScope,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
} = require('../common/org-helper')
const {
  ORDER_STATUS,
  SHIPMENT_STATUS,
  writeOrderStatusLog,
  assertOrderStatus,
  suggestLocationForSku,
  resolveWarehouseForOrder,
} = require('../common/order-helper')
const { outboundStock } = require('../common/stock-helper')
const { paginateQuery } = require('../common/pagination')
const { applyFilters } = require('../common/apply-filters')

const SHIPMENT_LIST_FILTERS = [
  { key: 'status', column: 'sh.status' },
  { key: 'order_id', column: 'sh.order_id' },
]
const { generateShipmentNo } = require('../common/business-no')
const { ERROR_CODES } = require('../common/error-codes')
module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class ShipmentService extends BaseService {
    /** 列出发货单及关联订单号、仓库 */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('shipments as sh')
        .join('orders as o', 'sh.order_id', 'o.order_id')
        .leftJoin('warehouses as w', 'sh.warehouse_id', 'w.warehouse_id')
        .where('sh.tenant_id', tenantId)
        .select('sh.*', 'o.order_no', 'w.warehouse_name')

      qb = applyFilters(qb, query, SHIPMENT_LIST_FILTERS)

      return paginateQuery(qb.orderBy('sh.created_at', 'desc'), query, { countColumn: 'sh.shipment_id' })
    }

    /** 获取发货单详情含明细、拣货任务、物流信息 */
    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { shipment_id: shipmentId } = query
      if (!shipmentId) bizError('shipment_id 不能为空')

      const shipment = await assertRowInTenant(db, 'shipments', tenantId, 'shipment_id', shipmentId, '发货单')
      const items = await db('shipment_items as si')
        .leftJoin('warehouse_locations as loc', 'si.suggested_location_id', 'loc.location_id')
        .leftJoin('warehouse_locations as ploc', 'si.picked_location_id', 'ploc.location_id')
        .leftJoin('product_skus as sku', 'si.sku_id', 'sku.sku_id')
        .where('si.tenant_id', tenantId)
        .andWhere('si.shipment_id', shipmentId)
        .select('si.*', 'sku.sku_code', 'loc.location_code as suggested_location_code', 'ploc.location_code as picked_location_code')

      const tasks = await db('picking_tasks').where({ tenant_id: tenantId, shipment_id: shipmentId })
      const logistics = await db('logistics').where({ tenant_id: tenantId, shipment_id: shipmentId }).first()

      return { ...shipment, items, pickingTasks: tasks, logistics }
    }

    /** 从已分仓订单生成发货单，自动建议拣货库位 */
    async createFromOrder(ctx, body = {}) {
      const { db, tenantId, operatorId } = getRequestScope(app, ctx)
      const { order_id: orderId } = body
      if (!orderId) bizError('order_id 不能为空')

      let result

      await db.transaction(async (trx) => {
        let order = await trx('orders')
          .where({ tenant_id: tenantId, order_id: orderId })
          .forUpdate()
          .first()
        if (!order) bizError('订单不存在', ERROR_CODES.NOT_FOUND)

        if (order.status === ORDER_STATUS.PAID) {
          const items = await trx('order_items').where({ tenant_id: tenantId, order_id: orderId })
          const { warehouse, reason } = await resolveWarehouseForOrder(trx, tenantId, order, items)
          const allocated = await trx('orders')
            .where({ tenant_id: tenantId, order_id: orderId, status: ORDER_STATUS.PAID })
            .update({
              status: ORDER_STATUS.ALLOCATED,
              warehouse_id: warehouse.warehouse_id,
            })
          if (allocated !== 1) bizError('订单状态已变更，无法分仓', ERROR_CODES.CONFLICT)
          await writeOrderStatusLog(trx, {
            tenantId,
            orderId,
            fromStatus: ORDER_STATUS.PAID,
            toStatus: ORDER_STATUS.ALLOCATED,
            remark: reason,
            operatorId,
          })
          order = {
            ...order,
            status: ORDER_STATUS.ALLOCATED,
            warehouse_id: warehouse.warehouse_id,
          }
        }

        assertOrderStatus(order, [ORDER_STATUS.ALLOCATED], '生成发货单')
        if (!order.warehouse_id) bizError('订单未分仓', ERROR_CODES.CONFLICT)

        const existing = await trx('shipments')
          .where({ tenant_id: tenantId, order_id: orderId })
          .whereNot('status', SHIPMENT_STATUS.SHIPPED)
          .first()
        if (existing) bizError('该订单已有未完成发货单', ERROR_CODES.CONFLICT)

        const orderItems = await trx('order_items').where({ tenant_id: tenantId, order_id: orderId })
        const shipmentId = idGen.next('ship')
        const shipmentNo = generateShipmentNo()

        try {
          await trx('shipments').insert({
            shipment_id: shipmentId,
            tenant_id: tenantId,
            order_id: orderId,
            warehouse_id: order.warehouse_id,
            shipment_no: shipmentNo,
            status: SHIPMENT_STATUS.CREATED,
          })
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
            bizError('该订单已存在发货单', ERROR_CODES.CONFLICT)
          }
          throw e
        }

        const shipmentItems = []
        for (const item of orderItems) {
          const suggestedLocationId = await suggestLocationForSku(
            trx,
            tenantId,
            order.warehouse_id,
            item.sku_id,
          )
          shipmentItems.push({
            item_id: idGen.next('sitem'),
            tenant_id: tenantId,
            shipment_id: shipmentId,
            sku_id: item.sku_id,
            qty: item.qty,
            suggested_location_id: suggestedLocationId,
          })
        }
        await trx('shipment_items').insert(shipmentItems)

        result = { shipmentId, shipmentNo }
      })

      await audit(app, ctx, {
        actionCode: 'shipment:create',
        objectType: 'shipment',
        objectId: result.shipmentId,
        detail: { orderId, shipmentNo: result.shipmentNo },
      })

      return result
    }

    /** 开始拣货：状态 created → picking，创建 picking_task */
    async startPick(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { shipment_id: shipmentId } = body
      if (!shipmentId) bizError('shipment_id 不能为空')

      const taskId = idGen.next('pick')

      await db.transaction(async (trx) => {
        const affected = await trx('shipments')
          .where({
            tenant_id: tenantId,
            shipment_id: shipmentId,
            status: SHIPMENT_STATUS.CREATED,
          })
          .update({ status: SHIPMENT_STATUS.PICKING })
        if (affected !== 1) bizError('发货单状态已变更，无法开始拣货', ERROR_CODES.CONFLICT)

        try {
          await trx('picking_tasks').insert({
            task_id: taskId,
            tenant_id: tenantId,
            shipment_id: shipmentId,
            status: 'in_progress',
            picker_id: operatorId,
            started_at: trx.fn.now(),
          })
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
            bizError('拣货任务已存在', ERROR_CODES.CONFLICT)
          }
          throw e
        }
      })

      return { shipmentId, taskId }
    }

    /** 确认拣货完成：记录 picked_location，状态 → picked */
    async confirmPick(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { shipment_id: shipmentId } = body
      if (!shipmentId) bizError('shipment_id 不能为空')

      await db.transaction(async (trx) => {
        const affected = await trx('shipments')
          .where({
            tenant_id: tenantId,
            shipment_id: shipmentId,
            status: SHIPMENT_STATUS.PICKING,
          })
          .update({ status: SHIPMENT_STATUS.PICKED })
        if (affected !== 1) bizError('发货单状态已变更，无法确认拣货', ERROR_CODES.CONFLICT)

        const items = await trx('shipment_items').where({ tenant_id: tenantId, shipment_id: shipmentId })
        for (const item of items) {
          await trx('shipment_items').where({ item_id: item.item_id }).update({
            picked_location_id: item.suggested_location_id,
          })
        }

        const taskUpdated = await trx('picking_tasks')
          .where({ tenant_id: tenantId, shipment_id: shipmentId, status: 'in_progress' })
          .update({ status: 'done', finished_at: trx.fn.now() })
        if (taskUpdated !== 1) bizError('拣货任务状态已变更', ERROR_CODES.CONFLICT)
      })

      return { shipmentId }
    }

    /** 出库发货：扣库存、写物流、订单 → shipped */
    async ship(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { shipment_id: shipmentId, carrier, tracking_no: trackingNo } = body
      if (!shipmentId) bizError('shipment_id 不能为空')

      let orderId

      await db.transaction(async (trx) => {
        const shipment = await trx('shipments')
          .where({ tenant_id: tenantId, shipment_id: shipmentId })
          .forUpdate()
          .first()
        if (!shipment) bizError('发货单不存在', ERROR_CODES.NOT_FOUND)
        if (shipment.status !== SHIPMENT_STATUS.PICKED) {
          bizError(`发货单状态为 ${shipment.status}，无法出库发货`, ERROR_CODES.CONFLICT)
        }

        const shipped = await trx('shipments')
          .where({
            tenant_id: tenantId,
            shipment_id: shipmentId,
            status: SHIPMENT_STATUS.PICKED,
          })
          .update({ status: SHIPMENT_STATUS.SHIPPED })
        if (shipped !== 1) bizError('发货单状态已变更，无法出库发货', ERROR_CODES.CONFLICT)

        const shipmentItems = await trx('shipment_items').where({ tenant_id: tenantId, shipment_id: shipmentId })
        const orderItems = await trx('order_items').where({ tenant_id: tenantId, order_id: shipment.order_id })
        const lockBySku = new Map(orderItems.map((i) => [i.sku_id, i.lock_id]))

        for (const item of shipmentItems) {
          await outboundStock(trx, {
            tenantId,
            operatorId,
            warehouseId: shipment.warehouse_id,
            skuId: item.sku_id,
            qty: item.qty,
            lockId: lockBySku.get(item.sku_id),
            refType: 'shipment',
            refId: shipmentId,
          })
        }

        try {
          await trx('logistics').insert({
            logistics_id: idGen.next('logi'),
            tenant_id: tenantId,
            shipment_id: shipmentId,
            carrier: carrier || 'STANDARD_EXPRESS',
            tracking_no: trackingNo || `TRK${Date.now()}`,
            shipped_at: trx.fn.now(),
          })
        } catch (e) {
          if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
            bizError('物流记录已存在', ERROR_CODES.CONFLICT)
          }
          throw e
        }

        const order = await trx('orders').where({ order_id: shipment.order_id }).first()
        const orderUpdated = await trx('orders')
          .where({ tenant_id: tenantId, order_id: shipment.order_id, status: order.status })
          .update({ status: ORDER_STATUS.SHIPPED })
        if (orderUpdated !== 1) bizError('订单状态已变更，无法完成发货', ERROR_CODES.CONFLICT)

        await writeOrderStatusLog(trx, {
          tenantId,
          orderId: shipment.order_id,
          fromStatus: order.status,
          toStatus: ORDER_STATUS.SHIPPED,
          remark: `发货单 ${shipment.shipment_no} 已出库`,
          operatorId,
        })

        orderId = shipment.order_id
      })

      await audit(app, ctx, {
        actionCode: 'shipment:ship',
        objectType: 'shipment',
        objectId: shipmentId,
        detail: { orderId },
      })

      return { shipmentId, orderId }
    }

    /** 生成拣货路径点，按库位坐标 x/z 排序 */
    async getPickingRoute(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { shipment_id: shipmentId } = query
      if (!shipmentId) bizError('shipment_id 不能为空')

      const shipment = await assertRowInTenant(db, 'shipments', tenantId, 'shipment_id', shipmentId, '发货单')

      const items = await db('shipment_items as si')
        .leftJoin('product_skus as sku', 'si.sku_id', 'sku.sku_id')
        .where('si.tenant_id', tenantId)
        .andWhere('si.shipment_id', shipmentId)
        .select('si.sku_id', 'si.qty', 'sku.sku_code', 'si.suggested_location_id', 'si.picked_location_id')

      const points = []
      for (const item of items) {
        const locationId = item.picked_location_id || item.suggested_location_id
        if (!locationId) continue
        const loc = await db('warehouse_locations')
          .where({ tenant_id: tenantId, location_id: locationId })
          .first()
        if (!loc) continue
        points.push({
          location_id: loc.location_id,
          location_code: loc.location_code,
          sku_id: item.sku_id,
          sku_code: item.sku_code,
          qty: item.qty,
          pos_x: parseFloat(loc.pos_x) || 0,
          pos_y: parseFloat(loc.pos_y) || 0,
          pos_z: parseFloat(loc.pos_z) || 0,
        })
      }

      points.sort((a, b) => {
        if (a.pos_x !== b.pos_x) return a.pos_x - b.pos_x
        return a.pos_z - b.pos_z
      })
      points.forEach((p, i) => {
        p.seq = i + 1
      })

      return {
        shipmentId,
        warehouseId: shipment.warehouse_id,
        shipmentNo: shipment.shipment_no,
        points,
      }
    }
  }
}
