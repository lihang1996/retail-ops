<template>
  <section v-loading="loading" class="ops-panel" :class="{ 'is-switching': loading }">
    <div v-if="title || $slots.headExtra" class="ops-panel-head">
      <h2 v-if="title">{{ title }}</h2>
      <span v-if="meta">{{ meta }}</span>
      <slot name="headExtra" />
    </div>
    <slot />
  </section>
</template>

<script setup>
defineProps({
  title: String,
  meta: String,
  loading: Boolean,
})
</script>
