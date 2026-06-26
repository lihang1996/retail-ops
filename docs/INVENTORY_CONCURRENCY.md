# 库存与履约并发设计

## 支付 + 锁库存（第 1 批）

- `pay`（`app/service/order.js`）在单事务内：`FOR UPDATE` 读订单 → 批量选仓（`findWarehouseForItems`）→ `lockStock` → 写 payment → 条件更新 `status = pending_payment → paid`。
- 并发支付同一订单：第二个事务在 `FOR UPDATE` 等待或读到非 `pending_payment`，最终仅一条 payment / lock 记录。
- `findWarehouseForItems` 批量查询 active 仓库 + `stocks` 矩阵，在内存评分，避免 N+1。

## 分仓评分

对每个仓库计算各 SKU `available_qty` 是否满足需求量；在可履约仓中选 **min(available)** 最大的仓，使库存分布更均衡。

支付成功后订单已写入 `warehouse_id`；`allocate` 将 `paid → allocated`，`createFromOrder` 在 `paid` 时也可自动分仓。

## stocks 乐观锁

- `updateStockWithVersion`（`stock-helper.js`）更新 `stocks` 时校验 `version` 字段，冲突报 `40900`。
- `lockStock` / `outboundStock` 等经此函数写汇总库存。

## 库位与锁（第 2 批）

- `upsertLocationQty`：`UPDATE qty = qty + ? WHERE qty + ? >= 0`；insert 冲突后重试 update。
- `stock_locks` 消耗：`WHERE status = active AND qty >= outQty` 条件更新。
- `getOrCreateStock`：唯一键冲突后重新 select。

## 解锁

- `POST /api/proj/stock/unlock` 实现在 **`app/service/stock.js`** `unlock()`（事务 + `FOR UPDATE`），非 stock-helper 导出函数。

## 发货幂等（第 3 批）

- 逻辑在 **`app/service/shipment.js`**：`createFromOrder` / `startPick` / `confirmPick` / `ship` 均用条件状态更新 + `affected rows === 1`。
- DB 唯一约束：`shipments(tenant_id, order_id)`、`picking_tasks(tenant_id, shipment_id)`、`logistics(tenant_id, shipment_id)`。

## 错误码

见 `app/common/error-codes.js`：`NOT_FOUND(40400)`、`CONFLICT(40900)`、`BAD_REQUEST(42200)` 等（尚未全量迁移到各 service）。
