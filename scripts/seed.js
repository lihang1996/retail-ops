const knex = require('knex')
const config = require('../knexfile')
const { seed } = require('../database/seeds/001_auth_seed')

async function run() {
  const db = knex(config)
  try {
    await seed(db)
    console.log('[seed] auth demo data ready (password: demo123)')
  } catch (err) {
    console.error('[seed] failed:', err.message)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

run()
