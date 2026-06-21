exports.up = async (knex) => {
  await knex.schema.createTable('marketing_activities', (t) => {
    t.string('activity_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('activity_name', 128).notNullable()
    t.string('activity_type', 32).notNullable().defaultTo('promotion')
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamp('start_at').nullable()
    t.timestamp('end_at').nullable()
    t.timestamps(true, true)
  })

  await knex.schema.createTable('marketing_activity_products', (t) => {
    t.string('id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('activity_id', 64).notNullable().index()
    t.string('product_id', 64).notNullable()
    t.string('sku_id', 64).nullable()
    t.decimal('promo_price', 12, 2).nullable()
    t.timestamps(true, true)
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('marketing_activity_products')
  await knex.schema.dropTableIfExists('marketing_activities')
}
