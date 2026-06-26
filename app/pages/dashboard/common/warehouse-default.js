/** 从仓库列表解析默认 warehouse_id：优先 URL/上下文指定，否则优先库存量最大的仓库 */
export function resolveWarehouseId(preferred, warehouses = []) {
  const list = Array.isArray(warehouses) ? warehouses : []
  if (preferred && list.some((w) => w.warehouse_id === preferred)) return preferred
  const sorted = [...list].sort((a, b) => (
    Number(b.total_qty || 0) - Number(a.total_qty || 0)
    || Number(b.stocked_location_count || 0) - Number(a.stocked_location_count || 0)
    || Number(b.location_count || 0) - Number(a.location_count || 0)
  ))
  return sorted[0]?.warehouse_id || ''
}
