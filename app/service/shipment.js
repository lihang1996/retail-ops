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
  applyOrderAllocation,
} = require('../common/order-helper')

function generateShipmentNo() {
  return `SHP${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

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

      if (query.status) qb = qb.andWhere('sh.status', query.status)
      if (query.order_id) qb = qb.andWhere('sh.order_id', query.order_id)

      const list = await qb.orderBy('sh.created_at', 'desc').limit(200)
      return { list, total: list.length }
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
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { order_id: orderId } = body
      if (!orderId) bizError('order_id 不能为空')

      const order = await assertRowInTenant(db, 'orders', tenantId, 'order_id', orderId, '订单')
      if (order.status === ORDER_STATUS.PAID) {
        const items = await db('order_items').where({ tenant_id: tenantId, order_id: orderId })
        const { warehouse, reason } = await resolveWarehouseForOrder(db, tenantId, order, items)
        await db.transaction(async (trx) => {
          await applyOrderAllocation(trx, {
            tenantId,
            orderId,
            fromStatus: ORDER_STATUS.PAID,
            warehouse,
            reason,
            operatorId,
          })
        })
        order.status = ORDER_STATUS.ALLOCATED
        order.warehouse_id = warehouse.warehouse_id
      }
      assertOrderStatus(order, [ORDER_STATUS.ALLOCATED], '生成发货单')
      if (!order.warehouse_id) bizError('订单未分仓', 40900)

      const existing = await db('shipments')
        .where({ tenant_id: tenantId, order_id: orderId })
        .whereNot('status', SHIPMENT_STATUS.SHIPPED)
        .first()
      if (existing) bizError('该订单已有未完成发货单', 40900)

      const orderItems = await db('order_items').where({ tenant_id: tenantId, order_id: orderId })
      const shipmentId = idGen.next('ship')
      const shipmentNo = generateShipmentNo()

      await db.transaction(async (trx) => {
        await trx('shipments').insert({
          shipment_id: shipmentId,
          tenant_id: tenantId,
          order_id: orderId,
          warehouse_id: order.warehouse_id,
          shipment_no: shipmentNo,
          status: SHIPMENT_STATUS.CREATED,
        })

        const shipmentItems = []
        for (const item of orderItems) {
          const suggestedLocationId = await suggestLocationForSku(
            trx,
            tenantId,
            order.warehouse_id,
            item.sku_id
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
      })

      await audit(app, ctx, {
        actionCode: 'shipment:create',
        objectType: 'shipment',
        objectId: shipmentId,
        detail: { orderId, shipmentNo },
      })

      return { shipmentId, shipmentNo }
    }

    /** 开始拣货：状态 created → picking，创建 picking_task */
    async startPick(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { shipment_id: shipmentId } = body
      if (!shipmentId) bizError('shipment_id 不能为空')

      const shipment = await assertRowInTenant(db, 'shipments', tenantId, 'shipment_id', shipmentId, '发货单')
      if (shipment.status !== SHIPMENT_STATUS.CREATED) {
        bizError(`发货单状态为 ${shipment.status}，无法开始拣货`, 40900)
      }

      const taskId = idGen.next('pick')
      await db.transaction(async (trx) => {
        await trx('shipments').where({ shipment_id: shipmentId }).update({ status: SHIPMENT_STATUS.PICKING })
        await trx('picking_tasks').insert({
          task_id: taskId,
          tenant_id: tenantId,
          shipment_id: shipmentId,
          status: 'in_progress',
          picker_id: operatorId,
          started_at: trx.fn.now(),
        })
      })

      return { shipmentId, taskId }
    }

    /** 确认拣货完成：记录 picked_location，状态 → picked */
    async confirmPick(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { shipment_id: shipmentId } = body
      if (!shipmentId) bizError('shipment_id 不能为空')

      const shipment = await assertRowInTenant(db, 'shipments', tenantId, 'shipment_id', shipmentId, '发货单')
      if (shipment.status !== SHIPMENT_STATUS.PICKING) {
        bizError(`发货单状态为 ${shipment.status}，无法确认拣货`, 40900)
      }

      const items = await db('shipment_items').where({ tenant_id: tenantId, shipment_id: shipmentId })

      await db.transaction(async (trx) => {
        for (const item of items) {
          const pickedLocationId = item.suggested_location_id
          await trx('shipment_items').where({ item_id: item.item_id }).update({
            picked_location_id: pickedLocationId,
          })
        }

        await trx('shipments').where({ shipment_id: shipmentId }).update({ status: SHIPMENT_STATUS.PICKED })
        await trx('picking_tasks')
          .where({ tenant_id: tenantId, shipment_id: shipmentId, status: 'in_progress' })
          .update({ status: 'done', finished_at: trx.fn.now() })
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

      const shipment = await assertRowInTenant(db, 'shipments', tenantId, 'shipment_id', shipmentId, '发货单')
      if (shipment.status !== SHIPMENT_STATUS.PICKED) {
        bizError(`发货单状态为 ${shipment.status}，无法出库发货`, 40900)
      }

      const shipmentItems = await db('shipment_items').where({ tenant_id: tenantId, shipment_id: shipmentId })
      const orderItems = await db('order_items').where({ tenant_id: tenantId, order_id: shipment.order_id })
      const lockBySku = new Map(orderItems.map((i) => [i.sku_id, i.lock_id]))

      for (const item of shipmentItems) {
        await app.service.stock.outbound(ctx, {
          warehouse_id: shipment.warehouse_id,
          sku_id: item.sku_id,
          qty: item.qty,
          lock_id: lockBySku.get(item.sku_id),
          ref_type: 'shipment',
          ref_id: shipmentId,
        })
      }

      await db.transaction(async (trx) => {
        await trx('shipments').where({ shipment_id: shipmentId }).update({ status: SHIPMENT_STATUS.SHIPPED })
        await trx('logistics').insert({
          logistics_id: idGen.next('logi'),
          tenant_id: tenantId,
          shipment_id: shipmentId,
          carrier: carrier || 'DEMO_EXPRESS',
          tracking_no: trackingNo || `TRK${Date.now()}`,
          shipped_at: trx.fn.now(),
        })

        const order = await trx('orders').where({ order_id: shipment.order_id }).first()
        await trx('orders').where({ order_id: shipment.order_id }).update({ status: ORDER_STATUS.SHIPPED })
        await writeOrderStatusLog(trx, {
          tenantId,
          orderId: shipment.order_id,
          fromStatus: order.status,
          toStatus: ORDER_STATUS.SHIPPED,
          remark: `发货单 ${shipment.shipment_no} 已出库`,
          operatorId,
        })
      })

      await audit(app, ctx, {
        actionCode: 'shipment:ship',
        objectType: 'shipment',
        objectId: shipmentId,
        detail: { orderId: shipment.order_id },
      })

      return { shipmentId, orderId: shipment.order_id }
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
