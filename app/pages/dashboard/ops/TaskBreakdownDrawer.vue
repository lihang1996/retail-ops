<template>
  <el-drawer
    :model-value="visible"
    title="待处理任务"
    size="430px"
    class="task-drawer"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="task-drawer-summary">
      <span>跨审批、库存与履约模块</span>
      <strong>{{ pendingCount }}</strong>
    </div>
    <div class="task-breakdown">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="task-breakdown-item"
        @click="$emit('select', item.path)"
      >
        <span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.desc }}</small>
        </span>
        <em>{{ item.value }}</em>
        <i>进入处理</i>
      </button>
    </div>
  </el-drawer>
</template>

<script setup>
defineProps({
  visible: Boolean,
  items: { type: Array, default: () => [] },
  pendingCount: { type: [String, Number], default: 0 },
})
defineEmits(['update:visible', 'select'])
</script>

<style lang="less" scoped>
.task-drawer-summary {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 12px; padding: 12px; border-radius: 10px; background: #f8fafc;
}
.task-drawer-summary strong { color: #0f172a; font-size: 24px; }
.task-breakdown { display: flex; flex-direction: column; gap: 8px; }
.task-breakdown-item {
  display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 10px;
  width: 100%; padding: 12px; border: 1px solid #eef2f7; border-radius: 10px; background: #fff;
  cursor: pointer; text-align: left;
}
.task-breakdown-item strong, .task-breakdown-item small { display: block; }
.task-breakdown-item strong { color: #1e293b; font-size: 13px; }
.task-breakdown-item small { margin-top: 4px; color: #94a3b8; font-size: 11px; }
.task-breakdown-item em { color: #0f172a; font-size: 20px; font-style: normal; font-weight: 800; }
.task-breakdown-item i { color: #2563eb; font-size: 11px; font-style: normal; }
</style>
