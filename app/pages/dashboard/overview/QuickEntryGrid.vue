<template>
  <section class="shortcuts-section">
    <h3 class="shortcuts-title">{{ title }}</h3>
    <div class="shortcuts-grid">
      <button
        v-for="item in items"
        :key="item.title"
        type="button"
        class="shortcut-card"
        @click="$emit('select', item.path)"
      >
        <span class="shortcut-icon">{{ item.icon }}</span>
        <span class="shortcut-copy">
          <span class="shortcut-name">{{ item.title }}</span>
          <span class="shortcut-desc">{{ item.desc }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '快捷入口' },
  items: { type: Array, default: () => [] },
})
defineEmits(['select'])
</script>

<style lang="less" scoped>
.shortcuts-section { margin-top: 18px; }
.shortcuts-title { margin: 0 0 10px; color: #0f172a; font-size: 14px; font-weight: 700; }
.shortcuts-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.shortcut-card {
  display: flex; align-items: flex-start; gap: 10px; padding: 14px; border: 1px solid #e2e8f0;
  border-radius: 12px; background: #fff; cursor: pointer; text-align: left;
  &:hover { border-color: #93c5fd; background: #f8fbff; }
}
.shortcut-icon {
  display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;
  border-radius: 10px; background: #eff6ff; color: #2563eb; font-size: 13px; font-weight: 800;
}
.shortcut-copy { min-width: 0; }
.shortcut-name, .shortcut-desc { display: block; }
.shortcut-name { color: #0f172a; font-size: 13px; font-weight: 700; }
.shortcut-desc { margin-top: 4px; color: #64748b; font-size: 11px; }
@media (max-width: 900px) { .shortcuts-grid { grid-template-columns: 1fr; } }
</style>
