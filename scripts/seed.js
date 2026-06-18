const knex = require('knex')
const config = require('../knexfile')

async function run() {
  const db = knex(config)
  try {
    await db.seed.run()
    console.log('[seed] demo data ready (password: demo123)')
  } catch (err) {
    console.error('[seed] failed:', err.message)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

run()
