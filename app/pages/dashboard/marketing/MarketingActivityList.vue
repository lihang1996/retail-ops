<template>
  <section class="marketing-list">
    <div class="marketing-section-head">
      <h3>活动列表</h3>
      <span>共 {{ total }} 个</span>
    </div>
    <div class="activity-list">
      <button
        v-for="item in activities"
        :key="item.activity_id"
        type="button"
        class="activity-card"
        :class="{ active: selectedId === item.activity_id }"
        @click="$emit('select', item)"
      >
        <span class="activity-top">
          <strong>{{ item.activity_name }}</strong>
          <status-tag :value="item.lifecycle" domain="common" />
        </span>
        <span class="activity-meta">{{ typeLabel(item.activity_type) }} · {{ item.product_count || 0 }} 个商品</span>
        <span class="activity-time">{{ formatDate(item.start_at, '未设置') }} - {{ formatDate(item.end_at, '未设置') }}</span>
        <span v-if="item.lifecycle === 'active' && item.end_at" class="activity-countdown">
          {{ item.days_remaining > 0 ? `剩余 ${item.days_remaining } 天` : '今日结束' }}
        </span>
        <span v-else-if="item.lifecycle === 'active'" class="activity-countdown muted">长期有效</span>
      </button>
      <empty-state v-if="!activities.length" title="暂无活动" description="切换状态或创建新的营销活动。" />
    </div>
  </section>
</template>

<script setup>
import EmptyState from '../common/empty-state.vue'
import StatusTag from '../common/status-tag.vue'
import { formatDate } from '../common/format.js'

defineProps({
  activities: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
  total: { type: Number, default: 0 },
  typeLabel: { type: Function, required: true },
})
defineEmits(['select'])
</script>

<style lang="less" scoped>
.marketing-list { min-width: 0; }
.marketing-section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 2px 10px; }
.marketing-section-head h3 { margin: 0; color: #0f172a; font-size: 14px; font-weight: 700; }
.marketing-section-head span { color: #94a3b8; font-size: 11px; }
.activity-list { display: flex; flex-direction: column; gap: 8px; }
.activity-card {
  position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 6px; width: 100%;
  padding: 13px; border: 1px solid #eef2f7; border-radius: 11px; background: #fbfdff;
  cursor: pointer; text-align: left;
}
.activity-card:hover, .activity-card.active { border-color: #93c5fd; background: #f8fbff; }
.activity-card.active { box-shadow: 0 0 0 2px rgba(59, 130, 246, .08); }
.activity-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.activity-top strong { color: #1e293b; font-size: 13px; }
.activity-meta, .activity-time { color: #64748b; font-size: 11px; }
.activity-countdown { position: absolute; right: 13px; bottom: 12px; color: #d97706; font-size: 10px; font-weight: 700; }
.activity-countdown.muted { color: #94a3b8; font-weight: 500; }
</style>
