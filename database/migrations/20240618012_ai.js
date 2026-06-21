exports.up = async (knex) => {
  await knex.schema.createTable('ai_conversations', (t) => {
    t.string('conversation_id', 64).primary()
    t.string('tenant_id', 64).notNullable().index()
    t.string('user_id', 64).notNullable().index()
    t.string('title', 255).nullable()
    t.timestamps(true, true)
  })

  await knex.schema.createTable('ai_queries', (t) => {
    t.string('query_id', 64).primary()
    t.string('conversation_id', 64).notNullable().index()
    t.string('tenant_id', 64).notNullable().index()
    t.string('user_id', 64).notNullable()
    t.text('question').notNullable()
    t.text('answer').nullable()
    t.text('data_source').nullable()
    t.text('query_condition').nullable()
    t.timestamps(true, true)
  })

  await knex.schema.createTable('ai_reports', (t) => {
    t.string('report_id', 64).primary()
    t.string('query_id', 64).notNullable().index()
    t.string('tenant_id', 64).notNullable().index()
    t.text('report_json').nullable()
    t.timestamp('created_at').defaultTo(knex.fn.now())
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('ai_reports')
  await knex.schema.dropTableIfExists('ai_queries')
  await knex.schema.dropTableIfExists('ai_conversations')
}
