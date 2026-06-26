/**
 * 支付链路从演示命名收敛为真实支付确认语义。
 */
exports.up = async (knex) => {
  await knex('payments')
    .where({ pay_method: 'mock' })
    .update({ pay_method: 'online' })

  await knex('audit_logs')
    .where({ action_code: 'order:mock_pay' })
    .update({ action_code: 'order:pay' })

  await knex.schema.alterTable('payments', (t) => {
    t.string('pay_method', 32).notNullable().defaultTo('online').alter()
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('payments', (t) => {
    t.string('pay_method', 32).notNullable().defaultTo('mock').alter()
  })
}
