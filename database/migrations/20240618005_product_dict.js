exports.up = async (knex) => {
  await knex.schema.createTable('categories', (t) => {
    t.string('category_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('category_name', 128).notNullable()
    t.string('parent_id', 64).nullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
    t.unique(['tenant_id', 'category_name'])
  })

  await knex.schema.createTable('brands', (t) => {
    t.string('brand_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('brand_name', 128).notNullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
    t.unique(['tenant_id', 'brand_name'])
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('brands')
  await knex.schema.dropTableIfExists('categories')
}
