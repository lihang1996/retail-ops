/**
 * 租户、用户、会话、审计基础表
 */
exports.up = async (knex) => {
  await knex.schema.createTable('tenants', (t) => {
    t.string('tenant_id', 64).primary()
    t.string('tenant_name', 128).notNullable()
    t.string('contact_name', 64)
    t.string('contact_phone', 32)
    t.string('status', 32).notNullable().defaultTo('active')
    t.string('plan_code', 64).defaultTo('trial')
    t.integer('max_users').defaultTo(50)
    t.timestamp('expires_at').nullable()
    t.timestamps(true, true)
  })

  await knex.schema.createTable('departments', (t) => {
    t.string('dept_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('parent_id', 64).nullable()
    t.string('dept_name', 128).notNullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('users', (t) => {
    t.string('user_id', 64).primary()
    t.string('account', 128).notNullable().unique()
    t.string('display_name', 128)
    t.string('password_hash', 255).notNullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.integer('login_fail_count').defaultTo(0)
    t.timestamp('locked_until').nullable()
    t.timestamps(true, true)
  })

  await knex.schema.createTable('tenant_members', (t) => {
    t.string('member_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('user_id', 64).notNullable().index()
    t.string('dept_id', 64).nullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
    t.unique(['tenant_id', 'user_id'])
  })

  await knex.schema.createTable('login_sessions', (t) => {
    t.string('session_id', 64).primary()
    t.string('user_id', 64).notNullable().index()
    t.string('tenant_id', 64).notNullable().index()
    t.string('token_jti', 128).notNullable()
    t.timestamp('expires_at').notNullable()
    t.string('status', 32).notNullable().defaultTo('active')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('login_logs', (t) => {
    t.increments('id').primary()
    t.string('account', 128)
    t.string('user_id', 64).nullable()
    t.string('tenant_id', 64).nullable()
    t.string('action', 32).notNullable()
    t.string('ip', 64)
    t.string('user_agent', 512)
    t.string('result', 32)
    t.string('reason', 255)
    t.timestamp('created_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('audit_logs', (t) => {
    t.string('audit_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('operator_id', 64).notNullable()
    t.string('action_code', 128).notNullable()
    t.string('object_type', 64)
    t.string('object_id', 64)
    t.string('request_id', 64)
    t.string('ip', 64)
    t.text('detail_json')
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.index(['tenant_id', 'created_at'])
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('audit_logs')
  await knex.schema.dropTableIfExists('login_logs')
  await knex.schema.dropTableIfExists('login_sessions')
  await knex.schema.dropTableIfExists('tenant_members')
  await knex.schema.dropTableIfExists('users')
  await knex.schema.dropTableIfExists('departments')
  await knex.schema.dropTableIfExists('tenants')
}
