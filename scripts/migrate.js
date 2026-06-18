const knex = require('knex')
const config = require('../knexfile')

async function run() {
  const db = knex(config)
  try {
    const [batch, migrations] = await db.migrate.latest()
    if (!migrations.length) {
      console.log('[migrate] already up to date')
    } else {
      console.log('[migrate] batch', batch, migrations)
    }
  } catch (err) {
    console.error('[migrate] failed:', err.message)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

run()
