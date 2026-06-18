exports.up = async (knex) => {
  await knex.schema.createTable('products', (t) => {
    t.string('product_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('product_name', 255).notNullable()
    t.string('category_id', 64).nullable().index()
    t.string('brand_id', 64).nullable().index()
    t.string('status', 32).notNullable().defaultTo('draft')
    t.string('review_status', 32).notNullable().defaultTo('none')
    t.string('main_image', 512).nullable()
    t.text('description').nullable()
    t.string('created_by', 64)
    t.string('updated_by', 64)
    t.timestamp('deleted_at').nullable()
    t.timestamps(true, true)
    t.index(['tenant_id', 'status'])
    t.index(['tenant_id', 'product_name'])
  })

  await knex.schema.createTable('product_skus', (t) => {
    t.string('sku_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('product_id', 64).notNullable().index()
    t.string('sku_code', 64).notNullable()
    t.string('barcode', 64).nullable()
    t.json('spec_json').nullable()
    t.decimal('sale_price', 12, 2).notNullable().defaultTo(0)
    t.decimal('cost_price', 12, 2).nullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamp('deleted_at').nullable()
    t.timestamps(true, true)
    t.unique(['tenant_id', 'sku_code'])
    t.index(['tenant_id', 'product_id'])
  })

  await knex.schema.createTable('product_status_logs', (t) => {
    t.string('log_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('product_id', 64).notNullable().index()
    t.string('from_status', 32).notNullable()
    t.string('to_status', 32).notNullable()
    t.string('operator_id', 64).nullable()
    t.string('remark', 255).nullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('product_status_logs')
  await knex.schema.dropTableIfExists('product_skus')
  await knex.schema.dropTableIfExists('products')
}
