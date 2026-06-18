const path = require('path')

const base = require('./config/config.default')
let envConfig = {}
try {
  if (process.env.NODE_ENV === 'local') {
    envConfig = require('./config/config.local')
  } else if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod') {
    envConfig = require('./config/config.prod')
  }
} catch (e) {
  // ignore
}

const db = { ...base.db, ...envConfig.db }

module.exports = {
  client: db.client,
  connection: db.connection,
  pool: db.pool,
  migrations: {
    directory: path.join(__dirname, 'database/migrations'),
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.join(__dirname, 'database/seeds'),
  },
}
