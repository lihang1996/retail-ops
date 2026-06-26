<template>
  <div class="pipeline-stats">
    <button
      v-for="card in cards"
      :key="card.key"
      type="button"
      class="pipeline-stat"
      :class="[card.tone, { active: activeTab === card.key }]"
      @click="$emit('select', card.key)"
    >
      <span class="pipeline-stat-value">{{ card.value }}</span>
      <span class="pipeline-stat-label">{{ card.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  cards: { type: Array, default: () => [] },
  activeTab: { type: String, default: 'all' },
})
defineEmits(['select'])
</script>

<style lang="less" scoped>
.pipeline-stats {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.pipeline-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }

  &.active {
    border-color: #3b82f6;
    background: linear-gradient(180deg, #eff6ff 0%, #fff 100%);
    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.12);
  }

  &.tone-danger.active { border-color: #f87171; background: linear-gradient(180deg, #fef2f2 0%, #fff 100%); }
  &.tone-warning.active { border-color: #fbbf24; background: linear-gradient(180deg, #fffbeb 0%, #fff 100%); }
  &.tone-info.active { border-color: #38bdf8; background: linear-gradient(180deg, #f0f9ff 0%, #fff 100%); }
  &.tone-primary.active { border-color: #3b82f6; }
  &.tone-success.active { border-color: #4ade80; background: linear-gradient(180deg, #f0fdf4 0%, #fff 100%); }
  &.tone-shipped.active { border-color: #16a34a; background: linear-gradient(180deg, #ecfdf5 0%, #fff 100%); }
}

.pipeline-stat-value {
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.pipeline-stat-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

@media (min-width: 1600px) {
  .pipeline-stat { padding: 14px 18px; }
  .pipeline-stat-value { font-size: 26px; }
}

@media (min-width: 1920px) {
  .pipeline-stat-value { font-size: 28px; }
  .pipeline-stat-label { font-size: 13px; }
}

@media (max-width: 1400px) {
  .pipeline-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 1200px) {
  .pipeline-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .pipeline-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
