<template>
  <div class="ops-filter-bar">
    <slot />
    <span v-if="total != null" class="ops-filter-total">共 {{ total }} 条</span>
  </div>
</template>

<script setup>
defineProps({
  total: { type: Number, default: null },
})
</script>

<style lang="less" scoped>
.ops-filter-total {
  margin-left: auto;
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}
</style>
