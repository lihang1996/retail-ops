exports.up = async (knex) => {
  await knex.schema.createTable('approvals', (t) => {
    t.string('approval_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('ref_type', 64).notNullable()
    t.string('ref_id', 64).notNullable().index()
    t.string('title', 255)
    t.string('status', 32).notNullable().defaultTo('pending')
    t.string('applicant_id', 64).notNullable()
    t.string('current_node_id', 64).nullable()
    t.timestamps(true, true)
    t.index(['tenant_id', 'status'])
    t.index(['tenant_id', 'ref_type', 'ref_id'])
  })

  await knex.schema.createTable('approval_nodes', (t) => {
    t.string('node_id', 64).primary()
    t.string('approval_id', 64).notNullable().index()
    t.integer('node_order').notNullable().defaultTo(1)
    t.string('approver_role_id', 64).nullable()
    t.string('status', 32).notNullable().defaultTo('pending')
    t.string('acted_by', 64).nullable()
    t.timestamp('acted_at').nullable()
    t.timestamps(true, true)
  })

  await knex.schema.createTable('approval_logs', (t) => {
    t.string('log_id', 64).primary()
    t.string('approval_id', 64).notNullable().index()
    t.string('action', 32).notNullable()
    t.string('operator_id', 64).nullable()
    t.string('remark', 512).nullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('approval_logs')
  await knex.schema.dropTableIfExists('approval_nodes')
  await knex.schema.dropTableIfExists('approvals')
}
