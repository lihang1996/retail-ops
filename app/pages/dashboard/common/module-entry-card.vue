<template>
  <button type="button" class="module-entry-card" @click="$emit('select')">
    <span class="module-entry-top">
      <span class="module-entry-icon">{{ icon }}</span>
      <span class="module-entry-action">{{ actionText }}</span>
    </span>
    <span class="module-entry-name">{{ name }}</span>
    <span class="module-entry-desc">{{ desc }}</span>
  </button>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '模' },
  name: { type: String, default: '' },
  desc: { type: String, default: '' },
  actionText: { type: String, default: '进入' },
})

defineEmits(['select'])
</script>

<style lang="less" scoped>
.module-entry-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 156px;
  padding: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  color: inherit;
  text-align: left;
  cursor: pointer;
  outline: none;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;

  &:hover {
    border-color: rgba(59, 130, 246, 0.42);
    box-shadow: 0 14px 30px rgba(37, 99, 235, 0.1);
    transform: translateY(-1px);
  }

  &:focus-visible {
    border-color: #93c5fd;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
  }
}

.module-entry-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.module-entry-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 15px;
  font-weight: 800;
}

.module-entry-action {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.module-entry-name {
  margin-top: 16px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
}

.module-entry-desc {
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}
</style>
