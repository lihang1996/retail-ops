#!/usr/bin/env node
/**
 * 重置演示业务数据后重跑 seed（保留账号与权限结构）
 */
const knex = require('knex')
const config = require('../knexfile')

const TENANT_ID = 'tenant_demo_retail'

const TABLES = [
  'ai_reports',
  'ai_queries',
  'ai_conversations',
  'marketing_activity_products',
  'marketing_activities',
  'approval_logs',
  'approval_nodes',
  'approvals',
  'logistics',
  'picking_tasks',
  'shipment_items',
  'shipments',
  'payments',
  'order_status_logs',
  'order_items',
  'order_import_errors',
  'order_import_batches',
  'orders',
  'customers',
  'stock_locks',
  'stock_logs',
  'stock_locations',
  'stocks',
]

async function run() {
  const db = knex(config)
  try {
    await db.transaction(async (trx) => {
      for (const table of TABLES) {
        const exists = await trx.schema.hasTable(table)
        if (exists) {
          await trx(table).where({ tenant_id: TENANT_ID }).del()
        }
      }
    })
    console.log('[reset-demo-data] tenant business data cleared')
    await db.seed.run()
    console.log('[reset-demo-data] seed done')
  } catch (err) {
    console.error('[reset-demo-data] failed:', err.message)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

run()
