<template>
  <div class="table-wrap">
    <el-table
      v-loading="loading"
      :data="rows"
      stripe
      class="fulfillment-table"
      @row-click="$emit('row-click', $event)"
    >
      <template #empty>
        <empty-state
          :title="emptyTitle"
          :description="emptyDescription"
          :action-text="activeTab === 'pending_payment' ? '导入订单' : ''"
          @action="$emit('import')"
        />
      </template>

      <el-table-column prop="order_no" label="订单号" width="156" class-name="col-text" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="order-no">{{ row.order_no }}</span>
        </template>
      </el-table-column>

      <el-table-column label="店铺 / 客户" min-width="140" class-name="col-text" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="cell-ellipsis">{{ formatStoreCustomer(row) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="item_summary" label="商品摘要" min-width="200" class-name="col-text" show-overflow-tooltip />

      <el-table-column label="金额" width="96" align="right">
        <template #default="{ row }">
          <span class="money-cell">¥{{ formatMoney(row.total_amount) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="订单状态" width="96" align="center" class-name="col-tag">
        <template #default="{ row }">
          <status-tag :value="row.order_status" domain="order" />
        </template>
      </el-table-column>

      <el-table-column label="锁库" width="88" align="center" class-name="col-tag">
        <template #default="{ row }">
          <status-tag :value="row.lock_status" domain="common" />
        </template>
      </el-table-column>

      <el-table-column label="分仓仓库" min-width="120" class-name="col-text" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="cell-ellipsis">{{ row.warehouse_name || '—' }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="shipment_no" label="发货单" min-width="140" class-name="col-text" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="cell-ellipsis">{{ row.shipment_no || '—' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="当前步骤" width="140" align="center" class-name="col-tag">
        <template #default="{ row }">
          <status-tag :value="row.current_step" domain="fulfillment" />
        </template>
      </el-table-column>

      <el-table-column label="操作" width="168" align="left" class-name="col-actions">
        <template #default="{ row }">
          <div class="action-group" @click.stop>
            <button
              v-if="getActionSplit(row).primary"
              type="button"
              class="action-link"
              :class="`is-${getActionSplit(row).primary.type}`"
              :disabled="isActionLoading(row, getActionSplit(row).primary)"
              @click="getActionSplit(row).primary.handler(row)"
            >
              {{ actionLoadingLabel(row, getActionSplit(row).primary) }}
            </button>
            <span v-if="getActionSplit(row).primary" class="action-sep" aria-hidden="true" />
            <button type="button" class="action-link is-muted" @click="$emit('row-click', row)">详情</button>
            <template v-if="getActionSplit(row).more.length === 1">
              <span class="action-sep" aria-hidden="true" />
              <button
                type="button"
                class="action-link is-muted"
                @click="getActionSplit(row).more[0].handler(row)"
              >
                {{ getActionSplit(row).more[0].label }}
              </button>
            </template>
            <template v-else-if="getActionSplit(row).more.length > 1">
              <span class="action-sep" aria-hidden="true" />
              <el-dropdown
                trigger="click"
                placement="bottom-end"
                :show-arrow="false"
                popper-class="fulfillment-action-popper"
                @command="(key) => runMoreAction(key, row)"
              >
                <button type="button" class="action-link is-muted action-link-more">
                  更多
                  <span class="action-chevron" aria-hidden="true">⌄</span>
                </button>
                <template #dropdown>
                  <el-dropdown-menu class="fulfillment-action-menu">
                    <el-dropdown-item
                      v-for="action in getActionSplit(row).more"
                      :key="action.key"
                      :command="action.key"
                    >
                      {{ action.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <div v-if="total > 0" class="table-footer">
    <el-pagination
      :current-page="page"
      :page-size="pageSize"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      background
      @current-change="$emit('page-change', $event)"
      @size-change="$emit('page-size-change', $event)"
    />
  </div>
</template>

<script setup>
import StatusTag from '../common/status-tag.vue'
import EmptyState from '../common/empty-state.vue'
import { formatMoney } from '../common/format.js'

defineProps({
  loading: Boolean,
  rows: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  activeTab: String,
  emptyTitle: String,
  emptyDescription: String,
  getActionSplit: { type: Function, required: true },
  isActionLoading: { type: Function, required: true },
  actionLoadingLabel: { type: Function, required: true },
  runMoreAction: { type: Function, required: true },
})

defineEmits(['row-click', 'import', 'page-change', 'page-size-change'])

function formatStoreCustomer(row) {
  const parts = [row.store_name, row.customer_name].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}
</script>

<style lang="less" scoped>
.table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.fulfillment-table {
  width: 100%;

  :deep(.el-table__header th.el-table__cell) {
    background: #f8fafc;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    padding: 10px 12px;
    white-space: nowrap;
  }

  :deep(.el-table__body td.el-table__cell) {
    padding: 10px 12px;
    font-size: 13px;
    color: #334155;
    vertical-align: middle;
  }

  :deep(.el-table__body .cell) { line-height: 1.45; }
  :deep(.col-text .cell) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :deep(.col-tag .cell),
  :deep(.col-actions .cell) { overflow: visible; text-overflow: clip; white-space: nowrap; }
  :deep(.col-tag .biz-status-tag) { max-width: none; vertical-align: middle; }
  :deep(.col-tag .cell) { display: flex; align-items: center; justify-content: center; }
  :deep(.el-table__row) {
    cursor: pointer;
    &:hover > td.el-table__cell { background: #f8fbff !important; }
  }
  :deep(.col-actions .cell) { overflow: visible; padding-left: 10px; padding-right: 14px; }
}

.cell-ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-no {
  color: #0f172a;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.money-cell {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
}

.action-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: nowrap;
  gap: 0;
  white-space: nowrap;
}

.action-link {
  border: 0;
  background: transparent;
  padding: 2px 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  color: #2563eb;
  cursor: pointer;
  flex-shrink: 0;
  &:hover:not(:disabled) { color: #1d4ed8; text-decoration: underline; }
  &:disabled { opacity: 0.55; cursor: wait; }
  &.is-muted { color: #64748b; font-weight: 500; }
  &.is-muted:hover:not(:disabled) { color: #475569; }
}

.action-link-more { display: inline-flex; align-items: center; gap: 2px; }
.action-chevron { font-size: 10px; line-height: 1; opacity: 0.7; transform: translateY(-1px); }
.action-sep { display: inline-block; width: 1px; height: 10px; margin: 0 10px; background: #e2e8f0; flex-shrink: 0; }
.action-group :deep(.el-dropdown) { display: inline-flex; vertical-align: middle; }

.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px clamp(16px, 2vw, 28px) 16px;
  border-top: 1px solid #f1f5f9;
  background: #fafbfc;
}
</style>

<style lang="less">
.fulfillment-action-popper.el-popper {
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1) !important;
  padding: 6px !important;
  min-width: 128px !important;
  .el-popper__arrow { display: none; }
  .fulfillment-action-menu { padding: 0; margin: 0; border: none; box-shadow: none; background: transparent; }
  .el-dropdown-menu__item {
    padding: 9px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #334155;
    &:not(.is-disabled):hover,
    &:not(.is-disabled):focus { background: #f1f5f9; color: #0f172a; }
  }
}
</style>
