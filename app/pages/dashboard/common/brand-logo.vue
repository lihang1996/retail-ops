<template>
  <svg
    class="brand-logo-svg"
    :class="[`size-${size}`]"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 40 40"
    fill="none"
    role="img"
    :aria-label="alt"
  >
    <defs>
      <linearGradient :id="gradId" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1D4ED8"/>
        <stop offset="1" stop-color="#3B82F6"/>
      </linearGradient>
      <linearGradient :id="shineId" x1="8" y1="6" x2="28" y2="24" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fff" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" :fill="`url(#${gradId})`"/>
    <rect x="1" y="1" width="38" height="38" rx="10" :fill="`url(#${shineId})`"/>
    <path d="M11 23.5 20 17.5 29 23.5V31H11V23.5Z" fill="#fff" fill-opacity="0.18" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M11 23.5 20 28.5 29 23.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20 17.5V28.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M12.5 13.5 17 10.5 21.5 12.5 26 9 28.5 10.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="28.5" cy="10.5" r="1.6" fill="#fff"/>
  </svg>
</template>

<script setup>
defineProps({
  size: { type: String, default: 'md' },
  alt: { type: String, default: 'Retail Ops' },
})

const gradId = `ro-bg-${Math.random().toString(36).slice(2, 9)}`
const shineId = `ro-shine-${Math.random().toString(36).slice(2, 9)}`
</script>

<style lang="less" scoped>
.brand-logo-svg {
  display: block;
  flex-shrink: 0;

  &.size-sm {
    width: 28px;
    height: 28px;
  }

  &.size-md {
    width: 36px;
    height: 36px;
  }

  &.size-lg {
    width: 44px;
    height: 44px;
  }
}
</style>
