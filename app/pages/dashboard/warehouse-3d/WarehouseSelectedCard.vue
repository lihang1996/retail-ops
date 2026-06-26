<template>
  <div v-if="location" class="selected-card">
    <div class="selected-title">{{ location.code }}</div>
    <div class="selected-risk" :class="location.level">{{ riskLabel(location.level) }}</div>
    <div class="selected-meta">库存 {{ location.qty || 0 }} / {{ location.capacity || '-' }}</div>
  </div>
</template>

<script setup>
import { riskLabel } from './warehouse-3d-meta.js'

defineProps({
  location: { type: Object, default: null },
})
</script>
