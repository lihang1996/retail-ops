<template>
  <div class="biz-empty">
    <div class="biz-empty-icon">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="var(--color-gray-100)" />
        <path d="M32 20V32L40 40" stroke="var(--color-gray-400)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="32" cy="32" r="12" stroke="var(--color-gray-300)" stroke-width="2" fill="none" />
      </svg>
    </div>
    <h3 class="biz-empty-title">{{ title }}</h3>
    <p v-if="description" class="biz-empty-desc">{{ description }}</p>
    <el-button
      v-if="actionText"
      type="primary"
      size="default"
      class="biz-empty-action"
      @click="$emit('action')"
    >
      {{ actionText }}
    </el-button>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '暂无数据' },
  // 业务文案：说明这里应该有什么、下一步可以做什么
  description: { type: String, default: '' },
  // 下一步动作按钮文案；为空则不渲染按钮
  actionText: { type: String, default: '' },
})
defineEmits(['action'])
</script>

<style lang="less" scoped>
.biz-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  padding: var(--spacing-16) var(--spacing-6);
  text-align: center;
  min-height: 320px;
}

.biz-empty-icon {
  margin-bottom: var(--spacing-2);
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;

  svg {
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.05));
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.biz-empty-title {
  margin: 0;
  color: var(--color-gray-900);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

.biz-empty-desc {
  margin: 0;
  max-width: 420px;
  color: var(--color-gray-600);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.biz-empty-action {
  margin-top: var(--spacing-4);
  padding: var(--spacing-3) var(--spacing-6);
  font-weight: var(--font-semibold);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  transition: all var(--transition-base);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
