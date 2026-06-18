exports.up = async (knex) => {
  await knex.schema.createTable('warehouses', (t) => {
    t.string('warehouse_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('warehouse_name', 128).notNullable()
    t.string('warehouse_code', 64).notNullable()
    t.string('address', 255)
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
    t.unique(['tenant_id', 'warehouse_code'])
  })

  await knex.schema.createTable('warehouse_zones', (t) => {
    t.string('zone_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('warehouse_id', 64).notNullable().index()
    t.string('zone_name', 128).notNullable()
    t.string('zone_code', 64).notNullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
    t.unique(['tenant_id', 'warehouse_id', 'zone_code'])
  })

  await knex.schema.createTable('warehouse_shelves', (t) => {
    t.string('shelf_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('warehouse_id', 64).notNullable().index()
    t.string('zone_id', 64).notNullable().index()
    t.string('shelf_name', 128).notNullable()
    t.string('shelf_code', 64).notNullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
    t.unique(['tenant_id', 'zone_id', 'shelf_code'])
  })

  await knex.schema.createTable('warehouse_locations', (t) => {
    t.string('location_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('warehouse_id', 64).notNullable().index()
    t.string('zone_id', 64).nullable().index()
    t.string('shelf_id', 64).nullable().index()
    t.string('location_code', 64).notNullable()
    t.integer('capacity').defaultTo(100)
    t.decimal('pos_x', 10, 2).defaultTo(0)
    t.decimal('pos_y', 10, 2).defaultTo(0)
    t.decimal('pos_z', 10, 2).defaultTo(0)
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
    t.unique(['tenant_id', 'warehouse_id', 'location_code'])
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('warehouse_locations')
  await knex.schema.dropTableIfExists('warehouse_shelves')
  await knex.schema.dropTableIfExists('warehouse_zones')
  await knex.schema.dropTableIfExists('warehouses')
}
