<template>
  <section class="panel audit-panel">
    <div class="panel-head">
      <div class="audit-head-copy">
        <h3 class="panel-title">最近审计动作</h3>
        <p class="audit-panel-desc">
          记录谁在何时对订单、发货单、库存等做了哪些关键操作，便于追溯业务链路
        </p>
        <span v-if="todayCount != null" class="audit-summary">
          今日共 {{ todayCount }} 条操作留痕
        </span>
      </div>
      <button v-if="viewAllPath" type="button" class="text-link" @click="$emit('view-all')">
        查看全部
      </button>
    </div>
    <ul class="audit-feed">
      <li v-for="(row, idx) in items" :key="`${row.action_code}-${row.created_at}-${idx}`">
        <div class="audit-item">
          <span class="audit-icon" :class="`tone-${row.tone}`">{{ row.icon }}</span>
          <div class="audit-body">
            <p class="audit-story">
              <strong class="audit-operator-name">{{ row.operator_name || '系统' }}</strong>
              <span class="audit-action-text">{{ row.actionPhrase }}</span>
            </p>
            <p v-if="row.detailHint" class="audit-extra">{{ row.detailHint }}</p>
            <div class="audit-foot">
              <span class="audit-module">{{ row.module }}</span>
              <span class="audit-code">{{ row.action_code }}</span>
              <span class="audit-time">{{ row.relativeTime }}</span>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  todayCount: { type: Number, default: null },
  viewAllPath: { type: String, default: '' },
})
defineEmits(['view-all'])
</script>

<style lang="less" scoped>
.audit-panel { margin-top: 14px; }
.panel-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 14px 16px 10px; border-bottom: 1px solid #f1f5f9;
}
.panel-title { margin: 0; color: #0f172a; font-size: 14px; font-weight: 700; }
.audit-panel-desc { margin: 6px 0 0; color: #64748b; font-size: 11px; line-height: 1.5; }
.audit-summary { display: inline-block; margin-top: 8px; color: #94a3b8; font-size: 11px; }
.text-link { padding: 0; border: 0; background: transparent; color: #2563eb; cursor: pointer; font-size: 11px; }
.audit-feed { margin: 0; padding: 8px 12px 12px; list-style: none; }
.audit-item { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 10px; padding: 10px 4px; }
.audit-icon {
  display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;
  border-radius: 10px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 800;
}
.audit-icon.tone-primary { background: #eff6ff; color: #2563eb; }
.audit-icon.tone-success { background: #f0fdf4; color: #16a34a; }
.audit-icon.tone-warning { background: #fff7ed; color: #d97706; }
.audit-icon.tone-danger { background: #fef2f2; color: #dc2626; }
.audit-story { margin: 0; color: #334155; font-size: 12px; line-height: 1.5; }
.audit-operator-name { color: #0f172a; }
.audit-extra { margin: 4px 0 0; color: #94a3b8; font-size: 11px; }
.audit-foot { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; color: #94a3b8; font-size: 10px; }
.audit-code { font-family: ui-monospace, monospace; }
</style>
