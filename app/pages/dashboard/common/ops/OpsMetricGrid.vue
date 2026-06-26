<template>
  <section class="ops-metrics" :class="`cols-${columns}`">
    <slot />
  </section>
</template>

<script setup>
defineProps({
  columns: { type: Number, default: 4 },
})
</script>

<style lang="less" scoped>
.ops-metrics.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ops-metrics.cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
</style>
