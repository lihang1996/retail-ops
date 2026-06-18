const knex = require('knex')

module.exports = (app) => {
  const dbConfig = app.config?.db
  if (!dbConfig) {
    app.logger?.warn('[db] config.db 未配置，数据库不可用')
    return null
  }
  return knex(dbConfig)
}
