<template>
  <div class="audit-feed">
    <article v-for="item in items" :key="item.key" class="audit-row">
      <span class="audit-icon">{{ item.icon || '·' }}</span>
      <div class="audit-main">
        <p><strong>{{ item.operator }}</strong> {{ item.label }}</p>
        <div v-if="item.meta" class="audit-meta"><span>{{ item.meta }}</span></div>
      </div>
      <time>{{ formatDateTime(item.createdAt) }}</time>
    </article>
    <empty-state v-if="!items.length" :title="emptyTitle" :description="emptyDescription" />
  </div>
</template>

<script setup>
import EmptyState from '../empty-state.vue'
import { formatDateTime } from '../format.js'

defineProps({
  items: { type: Array, default: () => [] },
  emptyTitle: { type: String, default: '暂无操作记录' },
  emptyDescription: { type: String, default: '' },
})
</script>

<style lang="less" scoped>
.audit-feed { padding: 6px 14px 10px; }
.audit-row {
  display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; align-items: start; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid var(--app-border, #f1f5f9);
  &:last-child { border-bottom: 0; }
}
.audit-icon {
  display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;
  border-radius: 8px; background: var(--color-gray-100, #f1f5f9); color: var(--color-gray-600, #475569);
  font-size: 12px; font-weight: 700;
}
.audit-main p { margin: 0; color: var(--color-gray-700, #334155); font-size: 12px; line-height: 1.5; }
.audit-meta { margin-top: 4px; color: var(--color-gray-400, #94a3b8); font-size: 10px; }
.audit-row time { color: var(--color-gray-400, #94a3b8); font-size: 10px; white-space: nowrap; }
</style>
