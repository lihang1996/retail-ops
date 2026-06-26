<template>
  <OpsPage
    :title="title"
    :description="description"
    :loading="pageLoading"
    class="ops-list-page-shell"
  >
    <template #actions>
      <slot name="actions" />
    </template>

    <OpsMetricGrid v-if="$slots.metrics">
      <slot name="metrics" />
    </OpsMetricGrid>

    <OpsFilterBar v-if="$slots.filters" :total="showTotal ? total : null">
      <slot name="filters" />
    </OpsFilterBar>

    <div v-if="listError" class="ops-list-error">
      <span>{{ listError.message || '列表加载失败' }}</span>
      <el-button size="small" @click="$emit('retry')">重试</el-button>
    </div>

    <OpsPanel :title="panelTitle" :meta="panelMeta" :loading="listLoading">
      <slot />
      <div v-if="showPagination" class="ops-pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="pageSizes"
          :total="total"
          :layout="paginationLayout"
          @current-change="(page) => $emit('page-change', page)"
          @size-change="(size) => $emit('page-size-change', size)"
        />
      </div>
    </OpsPanel>
  </OpsPage>
</template>

<script setup>
import OpsPage from './OpsPage.vue'
import OpsMetricGrid from './OpsMetricGrid.vue'
import OpsFilterBar from './OpsFilterBar.vue'
import OpsPanel from './OpsPanel.vue'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  pageLoading: { type: Boolean, default: false },
  listLoading: { type: Boolean, default: false },
  listError: { type: Object, default: null },
  panelTitle: { type: String, default: '' },
  panelMeta: { type: String, default: '' },
  total: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  pageSizes: { type: Array, default: () => [20, 50, 100] },
  showTotal: { type: Boolean, default: true },
  showPagination: { type: Boolean, default: true },
  paginationLayout: { type: String, default: 'total, prev, pager, next' },
})

defineEmits(['retry', 'page-change', 'page-size-change'])
</script>

<style lang="less" scoped>
.ops-list-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
}
</style>
