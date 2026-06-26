<template>
  <div class="legend">
    <div class="legend-title">库位图例（点击筛选）</div>
    <div
      v-for="item in items"
      :key="item.level"
      class="legend-item"
      :class="{ off: offLevels.has(item.level) }"
      @click="$emit('toggle', item.level)"
    >
      <span class="dot" :style="{ background: item.color }" />
      <span class="legend-text"><b>{{ item.label }}</b><small>{{ item.desc }}</small></span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  offLevels: { type: Object, default: () => new Set() },
})
defineEmits(['toggle'])
</script>
