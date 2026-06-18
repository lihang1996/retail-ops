/**
 * audit_logs 补充 user_agent 字段
 */
exports.up = async (knex) => {
  const hasColumn = await knex.schema.hasColumn('audit_logs', 'user_agent')
  if (!hasColumn) {
    await knex.schema.alterTable('audit_logs', (t) => {
      t.string('user_agent', 512).nullable()
    })
  }
}

exports.down = async (knex) => {
  const hasColumn = await knex.schema.hasColumn('audit_logs', 'user_agent')
  if (hasColumn) {
    await knex.schema.alterTable('audit_logs', (t) => {
      t.dropColumn('user_agent')
    })
  }
}
