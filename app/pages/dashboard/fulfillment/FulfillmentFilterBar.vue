<template>
  <div class="panel-toolbar">
    <div class="toolbar-main">
      <el-input
        :model-value="searchOrderNo"
        class="search-input"
        placeholder="搜索订单号"
        clearable
        @update:model-value="$emit('update:searchOrderNo', $event)"
        @keyup.enter="$emit('search')"
        @clear="$emit('search')"
      />
      <el-input
        :model-value="searchKeyword"
        class="search-input"
        placeholder="客户 / 店铺 / 商品"
        clearable
        @update:model-value="$emit('update:searchKeyword', $event)"
        @keyup.enter="$emit('search')"
        @clear="$emit('search')"
      />
      <el-input
        :model-value="searchShipmentNo"
        class="search-input search-input-sm"
        placeholder="发货单号"
        clearable
        @update:model-value="$emit('update:searchShipmentNo', $event)"
        @keyup.enter="$emit('search')"
        @clear="$emit('search')"
      />
      <el-input
        :model-value="searchWarehouseName"
        class="search-input search-input-sm"
        placeholder="仓库"
        clearable
        @update:model-value="$emit('update:searchWarehouseName', $event)"
        @keyup.enter="$emit('search')"
        @clear="$emit('search')"
      />
      <input
        ref="fileInputRef"
        type="file"
        class="file-input"
        accept=".xlsx,.xls,.csv"
        @change="$emit('file-input', $event)"
      >
      <el-button type="primary" :loading="importing" @click="$emit('import')">导入 Excel</el-button>
      <el-button :loading="loading" @click="$emit('search')">查询</el-button>
      <el-button :disabled="loading" @click="$emit('reset')">重置</el-button>
      <el-button :loading="loading" @click="$emit('refresh')">刷新</el-button>
      <el-tag
        v-if="dateScope === 'today'"
        type="info"
        closable
        @close="$emit('clear-date-scope')"
      >
        仅看今日订单
      </el-tag>
    </div>
    <span class="toolbar-meta">共 {{ total }} 条订单</span>
  </div>

  <el-alert
    v-if="importResult"
    :title="`导入完成：成功 ${importResult.success} 行，失败 ${importResult.fail} 行`"
    :type="importResult.fail ? 'warning' : 'success'"
    show-icon
    closable
    class="import-alert"
    @close="$emit('clear-import-result')"
  />

  <el-tabs :model-value="activeTab" class="workbench-tabs" @update:model-value="$emit('update:activeTab', $event)" @tab-change="$emit('tab-change')">
    <el-tab-pane v-for="tab in tabs" :key="tab.key" :label="tab.label" :name="tab.key" />
  </el-tabs>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  searchOrderNo: String,
  searchKeyword: String,
  searchShipmentNo: String,
  searchWarehouseName: String,
  loading: Boolean,
  importing: Boolean,
  total: { type: Number, default: 0 },
  dateScope: String,
  importResult: Object,
  activeTab: String,
  tabs: { type: Array, default: () => [] },
})

defineEmits([
  'update:searchOrderNo',
  'update:searchKeyword',
  'update:searchShipmentNo',
  'update:searchWarehouseName',
  'update:activeTab',
  'search',
  'reset',
  'refresh',
  'import',
  'file-input',
  'clear-date-scope',
  'clear-import-result',
  'tab-change',
])

const fileInputRef = ref(null)
defineExpose({
  triggerImport: () => fileInputRef.value?.click(),
})
</script>

<style lang="less" scoped>
.panel-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px clamp(16px, 2vw, 28px);
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.search-input { width: 280px; max-width: 100%; }
.toolbar-meta {
  margin-left: auto;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.file-input { display: none; }
.import-alert { margin: 12px 16px 0; }

.workbench-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 12px;
    background: #fff;
    border-bottom: 1px solid #f1f5f9;
  }
  :deep(.el-tabs__nav-wrap::after) { display: none; }
  :deep(.el-tabs__item) {
    height: 42px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    &.is-active { color: #2563eb; font-weight: 700; }
  }
  :deep(.el-tabs__active-bar) { height: 2px; background: #2563eb; }
  :deep(.el-tabs__content) { display: none; }
}

@media (max-width: 768px) {
  .panel-toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-meta { margin-left: 0; }
}
</style>
