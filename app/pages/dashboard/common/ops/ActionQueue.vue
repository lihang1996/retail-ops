<template>
  <div class="action-list">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="action-item"
      :class="item.tone"
      @click="$emit('select', item)"
    >
      <span class="action-icon">{{ item.icon }}</span>
      <span class="action-copy">
        <strong>{{ item.title }}</strong>
        <small>{{ item.desc }}</small>
      </span>
      <em>{{ item.value }}</em>
    </button>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
})
defineEmits(['select'])
</script>

<style lang="less" scoped>
.action-list { display: flex; flex-direction: column; padding: 8px; gap: 7px; }
.action-item {
  display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 10px;
  width: 100%; padding: 11px; border: 1px solid var(--app-border, #eef2f7); border-radius: 11px;
  background: #fbfdff; cursor: pointer; text-align: left;
  &:hover { border-color: var(--color-primary-200, #bfdbfe); background: #f8fbff; }
}
.action-icon {
  display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;
  border-radius: 10px; background: var(--color-primary-50, #eff6ff); color: var(--color-primary-600, #2563eb);
  font-size: 13px; font-weight: 800;
}
.action-item.warning .action-icon { background: var(--color-warning-50, #fff7ed); color: var(--color-warning-600, #d97706); }
.action-item.danger .action-icon { background: var(--color-error-50, #fef2f2); color: var(--color-error-600, #dc2626); }
.action-copy { min-width: 0; }
.action-copy strong, .action-copy small { display: block; }
.action-copy strong { color: var(--color-gray-800, #1e293b); font-size: 13px; }
.action-copy small { margin-top: 4px; color: var(--color-gray-400, #94a3b8); font-size: 11px; }
.action-item em { color: var(--color-gray-900, #0f172a); font-size: 20px; font-style: normal; font-weight: 800; }
</style>
