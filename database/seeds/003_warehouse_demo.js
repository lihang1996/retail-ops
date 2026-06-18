const TENANT_ID = 'tenant_demo_retail'

exports.seed = async (knex) => {
  await knex('warehouses').insert({
    warehouse_id: 'wh_main',
    tenant_id: TENANT_ID,
    warehouse_name: '华东主仓',
    warehouse_code: 'WH-EC-01',
    address: '上海市嘉定区物流园 A 区',
    status: 'active',
  }).onConflict('warehouse_id').merge()

  await knex('warehouse_zones').insert({
    zone_id: 'zone_a',
    tenant_id: TENANT_ID,
    warehouse_id: 'wh_main',
    zone_name: 'A区',
    zone_code: 'A',
    status: 'active',
  }).onConflict('zone_id').merge()

  await knex('warehouse_shelves').insert({
    shelf_id: 'shelf_a1',
    tenant_id: TENANT_ID,
    warehouse_id: 'wh_main',
    zone_id: 'zone_a',
    shelf_name: 'A-1货架',
    shelf_code: 'A1',
    status: 'active',
  }).onConflict('shelf_id').merge()

  const locations = [
    { location_id: 'loc_a1_01', location_code: 'A1-01', pos_x: 0, pos_y: 0, pos_z: 0 },
    { location_id: 'loc_a1_02', location_code: 'A1-02', pos_x: 2, pos_y: 0, pos_z: 0 },
    { location_id: 'loc_a1_03', location_code: 'A1-03', pos_x: 4, pos_y: 0, pos_z: 0 },
  ]

  for (const loc of locations) {
    await knex('warehouse_locations').insert({
      ...loc,
      tenant_id: TENANT_ID,
      warehouse_id: 'wh_main',
      zone_id: 'zone_a',
      shelf_id: 'shelf_a1',
      capacity: 100,
      status: 'active',
    }).onConflict('location_id').merge()
  }
}
