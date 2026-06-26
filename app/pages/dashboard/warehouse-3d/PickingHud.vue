<template>
  <div v-if="point" class="picking-hud">
    <span class="picking-hud-step">第 {{ point.seq }} / {{ totalSteps }} 步</span>
    <span class="picking-hud-loc">{{ point.location_code }}</span>
    <span class="picking-hud-sku">拣 {{ point.sku_code }} × {{ point.qty }}</span>
  </div>
</template>

<script setup>
defineProps({
  point: { type: Object, default: null },
  totalSteps: { type: Number, default: 0 },
})
</script>
