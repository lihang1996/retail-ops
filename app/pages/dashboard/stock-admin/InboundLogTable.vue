<template>
  <el-card class="inbound-table-card" shadow="never">
    <template #header>
      <div class="card-header">
        <div>
          <h2>最近入库记录</h2>
          <p>按库存流水实时回放入库动作，方便追踪商品、仓库、库位与操作人。</p>
        </div>
        <el-button link type="primary" :loading="loading" @click="$emit('reload')">重新加载</el-button>
      </div>
    </template>

    <div class="inbound-filter-bar">
      <el-input
        :model-value="filters.keyword"
        class="filter-control keyword-control"
        placeholder="SKU / 商品名称"
        clearable
        @update:model-value="updateFilter('keyword', $event)"
        @keyup.enter="$emit('search')"
      />
      <el-input
        :model-value="filters.warehouse_name"
        class="filter-control"
        placeholder="仓库名称"
        clearable
        @update:model-value="updateFilter('warehouse_name', $event)"
        @keyup.enter="$emit('search')"
      />
      <el-input
        :model-value="filters.location_code"
        class="filter-control"
        placeholder="库位编码"
        clearable
        @update:model-value="updateFilter('location_code', $event)"
        @keyup.enter="$emit('search')"
      />
      <el-input
        :model-value="filters.operator_name"
        class="filter-control"
        placeholder="操作人"
        clearable
        @update:model-value="updateFilter('operator_name', $event)"
        @keyup.enter="$emit('search')"
      />
      <el-button type="primary" :loading="loading" @click="$emit('search')">查询</el-button>
      <el-button :disabled="loading" @click="$emit('reset')">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="logs" class="inbound-table">
      <el-table-column label="流水号" min-width="170" show-overflow-tooltip>
        <template #default="{ row }"><span class="mono">{{ row.log_id }}</span></template>
      </el-table-column>
      <el-table-column label="商品 / SKU" min-width="240">
        <template #default="{ row }">
          <div class="product-cell">
            <strong>{{ row.product_name || '未命名商品' }}</strong>
            <span>{{ row.sku_code || row.sku_id }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="入库位置" min-width="210">
        <template #default="{ row }">
          <div class="location-cell">
            <strong>{{ row.warehouse_name || row.warehouse_id }}</strong>
            <span>{{ row.location_code || '未指定库位' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="110" align="right">
        <template #default="{ row }">
          <strong class="qty">+{{ formatNumber(Math.abs(Number(row.qty_change || 0))) }}</strong>
        </template>
      </el-table-column>
      <el-table-column label="库存变化" width="150">
        <template #default="{ row }">
          <span>{{ formatNumber(row.before_qty) }} → {{ formatNumber(row.after_qty) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作人 / 时间" min-width="190">
        <template #default="{ row }">
          <div class="time-cell">
            <strong>{{ row.operator_name || row.operator_id || '系统' }}</strong>
            <span>{{ formatDateTime(row.created_at) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.remark || '—' }}</template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无入库流水，点击右上角新建入库开始第一笔作业" />
      </template>
    </el-table>
  </el-card>
</template>

<script setup>
import { formatNumber, formatDateTime } from '../common/format.js'

const props = defineProps({
  loading: Boolean,
  logs: { type: Array, default: () => [] },
  filters: { type: Object, required: true },
})

const emit = defineEmits(['search', 'reset', 'reload', 'update:filters'])

function updateFilter(key, value) {
  emit('update:filters', { ...props.filters, [key]: value })
}
</script>

<style lang="less" scoped>
.inbound-table-card {
  :deep(.el-card__header) { padding: 18px 22px; }
  :deep(.el-card__body) { padding: 0 14px 14px; }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  h2 { margin: 0; color: var(--color-gray-900); font-size: 18px; font-weight: 700; }
  p { margin: 4px 0 0; color: var(--color-gray-500); font-size: 13px; }
}

.inbound-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px 8px 14px;
  border-bottom: 1px solid var(--app-border);
  .filter-control { width: 180px; min-width: 160px; }
  .keyword-control { width: 240px; min-width: 220px; }
}

.product-cell,
.location-cell,
.time-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  strong { color: var(--color-gray-800); font-weight: 650; }
  span { color: var(--color-gray-500); font-size: 12px; }
}

.mono { font-family: var(--font-mono); color: var(--color-gray-600); }
.qty { color: var(--color-success-600); }
</style>
