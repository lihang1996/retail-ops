const assert = require('assert')
const { aggregateItemsBySku, findWarehouseForItems } = require('../../app/common/order-helper')

function testAggregateItemsBySku() {
  const map = aggregateItemsBySku([
    { sku_id: 's1', qty: 2 },
    { sku_id: 's1', qty: 3 },
    { sku_id: 's2', qty: 1 },
  ])
  assert.strictEqual(map.get('s1'), 5)
  assert.strictEqual(map.get('s2'), 1)
}

function createQueryHarness({ warehouses = [], stocks = [] } = {}) {
  return (table) => {
    if (table === 'warehouses') {
      return {
        where() { return this },
        orderBy() { return Promise.resolve(warehouses) },
      }
    }
    if (table === 'stocks') {
      const chain = {
        _warehouseIds: null,
        _skuIds: null,
        where() { return chain },
        whereIn(field, ids) {
          if (field === 'warehouse_id') chain._warehouseIds = ids
          if (field === 'sku_id') chain._skuIds = ids
          return chain
        },
        select() {
          const rows = stocks.filter((row) => (
            (!chain._warehouseIds || chain._warehouseIds.includes(row.warehouse_id))
            && (!chain._skuIds || chain._skuIds.includes(row.sku_id))
          ))
          return Promise.resolve(rows)
        },
      }
      return chain
    }
    throw new Error(`unexpected table ${table}`)
  }
}

async function testFindWarehouseForItemsBatchMatrix() {
  const trx = createQueryHarness({
    warehouses: [
      { warehouse_id: 'w1', warehouse_name: '仓A', created_at: '2024-01-01' },
      { warehouse_id: 'w2', warehouse_name: '仓B', created_at: '2024-01-02' },
    ],
    stocks: [
      { warehouse_id: 'w1', sku_id: 's1', available_qty: 100 },
      { warehouse_id: 'w1', sku_id: 's2', available_qty: 10 },
      { warehouse_id: 'w2', sku_id: 's1', available_qty: 50 },
      { warehouse_id: 'w2', sku_id: 's2', available_qty: 50 },
    ],
  })

  const { warehouse, reason } = await findWarehouseForItems(trx, 't1', [
    { sku_id: 's1', qty: 10 },
    { sku_id: 's2', qty: 5 },
  ])

  assert.strictEqual(warehouse.warehouse_id, 'w2')
  assert.ok(reason.includes('仓B'))
}

async function testFindWarehouseForItemsAggregatesDuplicateSku() {
  const trx = createQueryHarness({
    warehouses: [{ warehouse_id: 'w1', warehouse_name: '仓A' }],
    stocks: [{ warehouse_id: 'w1', sku_id: 's1', available_qty: 8 }],
  })

  await assert.rejects(
    () => findWarehouseForItems(trx, 't1', [
      { sku_id: 's1', qty: 5 },
      { sku_id: 's1', qty: 4 },
    ]),
    /无仓库可满足/,
  )
}

testAggregateItemsBySku()
testFindWarehouseForItemsBatchMatrix()
  .then(() => testFindWarehouseForItemsAggregatesDuplicateSku())
  .then(() => console.log('[unit] warehouse-selection 3 passed'))
