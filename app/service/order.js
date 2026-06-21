/**
 * @module service/order
 * @description 订单服务：Excel 导入、模拟支付、分仓。
 * 状态流转：pending_payment → paid（支付+锁库存）→ allocated（分仓）→ shipped（由发货单驱动）。
 * 关键规则：支付时自动选仓并锁定库存，失败则回滚锁；导入按订单号/行分组，租户内订单号唯一。
 */
const XLSX = require('xlsx')
const {
  ensureDb,
  getTenantId,
  getOperatorId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
  activeOnly,
} = require('../common/org-helper')
const {
  ORDER_STATUS,
  generateOrderNo,
  writeOrderStatusLog,
  assertOrderStatus,
  findWarehouseForItems,
  resolveWarehouseForOrder,
  applyOrderAllocation,
} = require('../common/order-helper')

const HEADER_MAP = {
  order_no: 'order_no',
  订单号: 'order_no',
  store_name: 'store_name',
  店铺名称: 'store_name',
  sku_code: 'sku_code',
  'sku编码': 'sku_code',
  SKU编码: 'sku_code',
  qty: 'qty',
  数量: 'qty',
  unit_price: 'unit_price',
  单价: 'unit_price',
  customer_name: 'customer_name',
  客户名称: 'customer_name',
}

function normalizeRow(raw) {
  const row = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = HEADER_MAP[String(k).trim()] || String(k).trim()
    row[key] = v
  }
  return row
}

function parseImportBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) bizError('Excel 无有效工作表', 42200)
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class OrderService extends BaseService {
    /** 列出订单及关联店铺，支持状态/店铺/时间筛选 */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('orders as o')
        .leftJoin('stores as s', 'o.store_id', 's.store_id')
        .where('o.tenant_id', tenantId)
        .select('o.*', 's.store_name')

      if (query.status) qb = qb.andWhere('o.status', query.status)
      if (query.store_id) qb = qb.andWhere('o.store_id', query.store_id)
      if (query.order_no) qb = qb.andWhere('o.order_no', 'like', `%${query.order_no}%`)
      if (query.created_from) qb = qb.andWhere('o.created_at', '>=', query.created_from)
      if (query.created_to) qb = qb.andWhere('o.created_at', '<=', query.created_to)

      const list = await qb.orderBy('o.created_at', 'desc').limit(200)
      return { list, total: list.length }
    }

    /** 获取订单详情含明细、状态日志、发货单 */
    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { order_id: orderId } = query
      if (!orderId) bizError('order_id 不能为空')

      const order = await assertRowInTenant(db, 'orders', tenantId, 'order_id', orderId, '订单')
      const items = await db('order_items').where({ tenant_id: tenantId, order_id: orderId })
      const logs = await db('order_status_logs')
        .where({ tenant_id: tenantId, order_id: orderId })
        .orderBy('created_at', 'desc')
        .limit(50)
      const shipments = await db('shipments').where({ tenant_id: tenantId, order_id: orderId })

      return { ...order, items, statusLogs: logs, shipments }
    }

    /** 从 Excel 批量导入订单，按订单号分组，逐组事务写入 */
    async importFile(ctx, file) {
      if (!file?.buffer?.length) bizError('请上传 xlsx/xls/csv 文件', 42200)

      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const batchId = idGen.next('ibatch')
      const rows = parseImportBuffer(file.buffer)

      await db('order_import_batches').insert({
        batch_id: batchId,
        tenant_id: tenantId,
        file_name: file.originalname,
        total_rows: rows.length,
        status: 'processing',
        created_by: operatorId,
      })

      const grouped = new Map()
      const errors = []

      rows.forEach((raw, idx) => {
        const rowNo = idx + 2
        const row = normalizeRow(raw)
        const skuCode = String(row.sku_code || '').trim()
        const storeName = String(row.store_name || '').trim()
        const qty = parseInt(row.qty, 10)
        const unitPrice = parseFloat(row.unit_price) || 0

        if (!skuCode || !storeName || !qty || qty <= 0) {
          errors.push({ rowNo, reason: '店铺名称、SKU编码、数量必填且数量>0', raw: row })
          return
        }

        const orderKey = String(row.order_no || '').trim() || `__row_${rowNo}`
        if (!grouped.has(orderKey)) {
          grouped.set(orderKey, { rowNo, storeName, customerName: row.customer_name, lines: [] })
        }
        grouped.get(orderKey).lines.push({ skuCode, qty, unitPrice, rowNo })
      })

      let successRows = 0

      for (const [orderKey, group] of grouped) {
        try {
          await db.transaction(async (trx) => {
            const store = await trx('stores')
              .where({ tenant_id: tenantId, store_name: group.storeName, status: 'active' })
              .first()
            if (!store) bizError(`店铺不存在: ${group.storeName}`)

            let customerId = null
            if (group.customerName) {
              const name = String(group.customerName).trim()
              let customer = await trx('customers')
                .where({ tenant_id: tenantId, customer_name: name })
                .first()
              if (!customer) {
                customerId = idGen.next('cust')
                await trx('customers').insert({
                  customer_id: customerId,
                  tenant_id: tenantId,
                  customer_name: name,
                })
              } else {
                customerId = customer.customer_id
              }
            }

            const orderNo = orderKey.startsWith('__row_') ? generateOrderNo() : orderKey
            const exists = await trx('orders').where({ tenant_id: tenantId, order_no: orderNo }).first()
            if (exists) bizError(`订单号已存在: ${orderNo}`)

            const orderId = idGen.next('order')
            const itemRows = []
            let totalAmount = 0

            for (const line of group.lines) {
              const sku = await activeOnly(trx('product_skus as sku'))
                .leftJoin('products as p', 'sku.product_id', 'p.product_id')
                .where({ 'sku.tenant_id': tenantId, 'sku.sku_code': line.skuCode, 'sku.status': 'active' })
                .select('sku.*', 'p.product_name')
                .first()
              if (!sku) bizError(`SKU 不存在: ${line.skuCode}`)

              const amount = line.unitPrice * line.qty
              totalAmount += amount
              itemRows.push({
                item_id: idGen.next('oitem'),
                tenant_id: tenantId,
                order_id: orderId,
                sku_id: sku.sku_id,
                sku_code: sku.sku_code,
                product_name: sku.product_name,
                qty: line.qty,
                unit_price: line.unitPrice,
                amount,
              })
            }

            await trx('orders').insert({
              order_id: orderId,
              tenant_id: tenantId,
              order_no: orderNo,
              store_id: store.store_id,
              customer_id: customerId,
              status: ORDER_STATUS.PENDING_PAYMENT,
              total_amount: totalAmount,
              import_batch_id: batchId,
            })
            await trx('order_items').insert(itemRows)
            await writeOrderStatusLog(trx, {
              tenantId,
              orderId,
              fromStatus: null,
              toStatus: ORDER_STATUS.PENDING_PAYMENT,
              remark: '订单导入',
              operatorId,
            })
          })
          successRows += group.lines.length
        } catch (e) {
          for (const line of group.lines) {
            errors.push({ rowNo: line.rowNo, reason: e.message, raw: { orderKey, ...line } })
          }
        }
      }

      for (const err of errors) {
        await db('order_import_errors').insert({
          error_id: idGen.next('ierr'),
          batch_id: batchId,
          row_no: err.rowNo,
          reason: err.reason,
          raw_data: JSON.stringify(err.raw || {}),
        })
      }

      await db('order_import_batches').where({ batch_id: batchId }).update({
        success_rows: successRows,
        fail_rows: errors.length,
        status: 'done',
      })

      await audit(app, ctx, {
        actionCode: 'order:import',
        objectType: 'import_batch',
        objectId: batchId,
        detail: { total: rows.length, success: successRows, fail: errors.length },
      })

      return {
        batchId,
        total: rows.length,
        success: successRows,
        fail: errors.length,
        errors: errors.slice(0, 50),
      }
    }

    /** 查询导入批次结果及错误明细 */
    async importResult(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { batch_id: batchId } = query
      if (!batchId) bizError('batch_id 不能为空')

      const batch = await db('order_import_batches')
        .where({ tenant_id: tenantId, batch_id: batchId })
        .first()
      if (!batch) bizError('导入批次不存在', 40400)

      const errors = await db('order_import_errors')
        .where({ batch_id: batchId })
        .orderBy('row_no', 'asc')
        .limit(200)

      return { ...batch, errors }
    }

    /** 模拟支付：选仓、锁库存、写入 payment，状态 pending_payment → paid */
    async mockPay(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { order_id: orderId } = body
      if (!orderId) bizError('order_id 不能为空')

      const order = await assertRowInTenant(db, 'orders', tenantId, 'order_id', orderId, '订单')
      assertOrderStatus(order, [ORDER_STATUS.PENDING_PAYMENT], '支付')

      const items = await db('order_items').where({ tenant_id: tenantId, order_id: orderId })
      if (!items.length) bizError('订单无明细', 42200)

      const { warehouse, reason } = await findWarehouseForItems(db, tenantId, items)

      const acquiredLocks = []
      try {
        for (const item of items) {
          const lockResult = await app.service.stock.lock(ctx, {
            warehouse_id: warehouse.warehouse_id,
            sku_id: item.sku_id,
            qty: item.qty,
            ref_type: 'order',
            ref_id: orderId,
          })
          acquiredLocks.push(lockResult.lockId)
          await db('order_items').where({ item_id: item.item_id }).update({ lock_id: lockResult.lockId })
        }
      } catch (e) {
        for (const lockId of acquiredLocks) {
          try {
            await app.service.stock.unlock(ctx, { lock_id: lockId })
          } catch {
            /* rollback best effort */
          }
        }
        throw e
      }

      await db.transaction(async (trx) => {
        const fresh = await trx('orders').where({ order_id: orderId }).first()
        assertOrderStatus(fresh, [ORDER_STATUS.PENDING_PAYMENT], '支付')

        const paymentId = idGen.next('pay')
        await trx('payments').insert({
          payment_id: paymentId,
          tenant_id: tenantId,
          order_id: orderId,
          amount: order.total_amount,
          pay_method: 'mock',
          status: 'success',
          paid_at: trx.fn.now(),
        })

        await trx('orders').where({ order_id: orderId }).update({
          status: ORDER_STATUS.PAID,
          warehouse_id: warehouse.warehouse_id,
        })

        await writeOrderStatusLog(trx, {
          tenantId,
          orderId,
          fromStatus: ORDER_STATUS.PENDING_PAYMENT,
          toStatus: ORDER_STATUS.PAID,
          remark: reason,
          operatorId,
        })
      })

      await audit(app, ctx, {
        actionCode: 'order:mock_pay',
        objectType: 'order',
        objectId: orderId,
        detail: { warehouseId: warehouse.warehouse_id },
      })

      return { orderId, warehouseId: warehouse.warehouse_id, reason }
    }

    /** 手动分仓：paid/allocated → allocated，绑定 warehouse_id */
    async allocate(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { order_id: orderId } = body
      if (!orderId) bizError('order_id 不能为空')

      const order = await assertRowInTenant(db, 'orders', tenantId, 'order_id', orderId, '订单')
      assertOrderStatus(order, [ORDER_STATUS.PAID, ORDER_STATUS.ALLOCATED], '分仓')

      const items = await db('order_items').where({ tenant_id: tenantId, order_id: orderId })
      const { warehouse, reason } = await resolveWarehouseForOrder(db, tenantId, order, items)

      await db.transaction(async (trx) => {
        await applyOrderAllocation(trx, {
          tenantId,
          orderId,
          fromStatus: order.status,
          warehouse,
          reason,
          operatorId,
        })
      })

      return { orderId, warehouseId: warehouse.warehouse_id, warehouseName: warehouse.warehouse_name, reason }
    }
  }
}
