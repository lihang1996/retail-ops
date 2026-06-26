<template>
  <component
    :is="clickable ? 'button' : 'div'"
    class="ops-metric"
    :class="tone"
    :type="clickable ? 'button' : undefined"
    @click="clickable ? $emit('select') : undefined"
  >
    <span class="ops-metric-label">
      {{ label }}
      <em v-if="badge">{{ badge }}</em>
    </span>
    <strong class="ops-metric-value">{{ value }}</strong>
    <span v-if="hint" class="ops-metric-hint">{{ hint }}</span>
  </component>
</template>

<script setup>
defineProps({
  label: String,
  value: { type: [String, Number], default: '—' },
  hint: String,
  badge: String,
  tone: { type: String, default: '' },
  clickable: Boolean,
})
defineEmits(['select'])
</script>
