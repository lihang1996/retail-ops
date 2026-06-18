/**
 * RBAC：角色、权限、数据范围、字段策略
 */
exports.up = async (knex) => {
  await knex.schema.createTable('roles', (t) => {
    t.string('role_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('role_code', 64).notNullable()
    t.string('role_name', 128).notNullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
    t.unique(['tenant_id', 'role_code'])
  })

  await knex.schema.createTable('permissions', (t) => {
    t.string('permission_id', 64).primary()
    t.string('permission_code', 128).notNullable().unique()
    t.string('permission_type', 32).notNullable() // menu | action | data | field
    t.string('resource', 128)
    t.string('description', 255)
    t.timestamps(true, true)
  })

  await knex.schema.createTable('role_permissions', (t) => {
    t.increments('id').primary()
    t.string('role_id', 64).notNullable().index()
    t.string('permission_id', 64).notNullable().index()
    t.unique(['role_id', 'permission_id'])
  })

  await knex.schema.createTable('user_roles', (t) => {
    t.increments('id').primary()
    t.string('user_id', 64).notNullable().index()
    t.string('role_id', 64).notNullable().index()
    t.unique(['user_id', 'role_id'])
  })

  await knex.schema.createTable('data_scopes', (t) => {
    t.string('scope_id', 64).primary()
    t.string('role_id', 64).notNullable().index()
    t.string('scope_type', 32).notNullable() // all | department | custom_store | custom_warehouse
    t.json('scope_config')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('field_policies', (t) => {
    t.string('policy_id', 64).primary()
    t.string('role_id', 64).notNullable().index()
    t.string('field_code', 128).notNullable()
    t.string('policy', 32).notNullable() // visible | masked | hidden
    t.timestamps(true, true)
    t.unique(['role_id', 'field_code'])
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('field_policies')
  await knex.schema.dropTableIfExists('data_scopes')
  await knex.schema.dropTableIfExists('user_roles')
  await knex.schema.dropTableIfExists('role_permissions')
  await knex.schema.dropTableIfExists('permissions')
  await knex.schema.dropTableIfExists('roles')
}
