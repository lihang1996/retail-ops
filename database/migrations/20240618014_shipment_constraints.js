/**
 * 发货单/拣货任务幂等约束：一订单一发货单、一发货单一条拣货任务
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('shipments', (t) => {
    t.unique(['tenant_id', 'order_id'], 'uk_shipments_tenant_order')
  })

  await knex.schema.alterTable('picking_tasks', (t) => {
    t.unique(['tenant_id', 'shipment_id'], 'uk_picking_tasks_tenant_shipment')
  })

  await knex.schema.alterTable('logistics', (t) => {
    t.unique(['tenant_id', 'shipment_id'], 'uk_logistics_tenant_shipment')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('logistics', (t) => {
    t.dropUnique(['tenant_id', 'shipment_id'], 'uk_logistics_tenant_shipment')
  })
  await knex.schema.alterTable('picking_tasks', (t) => {
    t.dropUnique(['tenant_id', 'shipment_id'], 'uk_picking_tasks_tenant_shipment')
  })
  await knex.schema.alterTable('shipments', (t) => {
    t.dropUnique(['tenant_id', 'order_id'], 'uk_shipments_tenant_order')
  })
}
