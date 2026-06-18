/**
 * 容器启动时等待 MySQL 就绪，再执行 migrate + seed
 */
const knex = require('knex')
const config = require('../knexfile')

const MAX_RETRIES = 30
const RETRY_MS = 2000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForDb(db) {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await db.raw('SELECT 1')
      console.log('[init-db] database ready')
      return
    } catch (err) {
      console.log(`[init-db] waiting for database (${i}/${MAX_RETRIES})...`)
      if (i === MAX_RETRIES) throw err
      await sleep(RETRY_MS)
    }
  }
}

async function run() {
  const db = knex(config)
  try {
    await waitForDb(db)
    const [batch, migrations] = await db.migrate.latest()
    if (migrations.length) {
      console.log('[init-db] migrate batch', batch, migrations)
    } else {
      console.log('[init-db] migrate already up to date')
    }
    await db.seed.run()
    console.log('[init-db] seed done')
  } catch (err) {
    console.error('[init-db] failed:', err.message)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

run()
