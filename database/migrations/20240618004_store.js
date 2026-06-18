exports.up = async (knex) => {
  await knex.schema.createTable('stores', (t) => {
    t.string('store_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('store_name', 128).notNullable()
    t.string('store_type', 32).notNullable().defaultTo('online')
    t.string('status', 32).notNullable().defaultTo('active')
    t.string('created_by', 64)
    t.string('updated_by', 64)
    t.timestamps(true, true)
    t.unique(['tenant_id', 'store_name'])
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('stores')
}
