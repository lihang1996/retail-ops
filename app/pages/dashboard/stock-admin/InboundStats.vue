<template>
  <div class="stat-grid">
    <KpiCard
      v-for="item in cards"
      :key="item.key"
      :label="item.label"
      :value="item.value"
      :hint="item.hint"
      :tone="item.tone"
    />
  </div>
</template>

<script setup>
import KpiCard from '../common/kpi-card.vue'

defineProps({
  cards: { type: Array, default: () => [] },
})
</script>

<style lang="less" scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 14px 0;

  :deep(.biz-kpi-card) { min-height: 112px; }
}

@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .stat-grid { grid-template-columns: 1fr; }
}
</style>
