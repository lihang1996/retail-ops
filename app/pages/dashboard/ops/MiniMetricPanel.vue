<template>
  <div class="mini-metrics">
    <div v-for="item in items" :key="item.label">
      <span>{{ item.label }}</span>
      <strong :class="item.tone">{{ item.value }}</strong>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
})
</script>

<style lang="less" scoped>
.mini-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; padding: 12px; }
.mini-metrics div { padding: 11px; border-radius: 10px; background: #f8fafc; }
.mini-metrics span, .mini-metrics strong { display: block; }
.mini-metrics span { color: #64748b; font-size: 10px; }
.mini-metrics strong { margin-top: 7px; color: #0f172a; font-size: 19px; }
.mini-metrics .danger { color: #dc2626; }
.mini-metrics .warning { color: #d97706; }
.mini-metrics .primary { color: #2563eb; }
.mini-metrics .success { color: #16a34a; }
</style>
