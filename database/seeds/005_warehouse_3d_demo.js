const TENANT_ID = 'tenant_demo_retail'

exports.seed = async (knex) => {
  const existing = await knex('warehouse_locations')
    .where({ tenant_id: TENANT_ID, warehouse_id: 'wh_main' })
    .count('location_id as cnt')
    .first()
  if ((existing?.cnt || 0) > 10) return

  const rows = []
  let idx = 4
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const code = `A1-${String(idx).padStart(2, '0')}`
      rows.push({
        location_id: `loc_grid_${idx}`,
        tenant_id: TENANT_ID,
        warehouse_id: 'wh_main',
        zone_id: 'zone_a',
        shelf_id: 'shelf_a1',
        location_code: code,
        capacity: 100,
        pos_x: col * 2,
        pos_y: 0,
        pos_z: row * 2,
        status: 'active',
      })
      idx += 1
    }
  }

  for (const row of rows) {
    await knex('warehouse_locations').insert(row).onConflict('location_id').merge()
  }
}
