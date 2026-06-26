/**
 * 高频查询索引（列表、看板、审计检索）
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('orders', (table) => {
    table.index(['tenant_id', 'created_at'], 'idx_orders_tenant_created')
    table.index(['tenant_id', 'status', 'created_at'], 'idx_orders_tenant_status_created')
  })

  await knex.schema.alterTable('shipments', (table) => {
    table.index(['tenant_id', 'order_id', 'status'], 'idx_shipments_tenant_order_status')
  })

  await knex.schema.alterTable('stock_logs', (table) => {
    table.index(['tenant_id', 'action_type', 'created_at'], 'idx_stock_logs_tenant_action_created')
  })

  await knex.schema.alterTable('audit_logs', (table) => {
    table.index(['tenant_id', 'action_code', 'created_at'], 'idx_audit_logs_tenant_action_created')
  })

  await knex.schema.alterTable('stock_locations', (table) => {
    table.index(['tenant_id', 'sku_id'], 'idx_stock_locations_tenant_sku')
  })
}

exports.down = async function down(knex) {
  await knex.schema.alterTable('stock_locations', (table) => {
    table.dropIndex(['tenant_id', 'sku_id'], 'idx_stock_locations_tenant_sku')
  })
  await knex.schema.alterTable('audit_logs', (table) => {
    table.dropIndex(['tenant_id', 'action_code', 'created_at'], 'idx_audit_logs_tenant_action_created')
  })
  await knex.schema.alterTable('stock_logs', (table) => {
    table.dropIndex(['tenant_id', 'action_type', 'created_at'], 'idx_stock_logs_tenant_action_created')
  })
  await knex.schema.alterTable('shipments', (table) => {
    table.dropIndex(['tenant_id', 'order_id', 'status'], 'idx_shipments_tenant_order_status')
  })
  await knex.schema.alterTable('orders', (table) => {
    table.dropIndex(['tenant_id', 'status', 'created_at'], 'idx_orders_tenant_status_created')
    table.dropIndex(['tenant_id', 'created_at'], 'idx_orders_tenant_created')
  })
}
