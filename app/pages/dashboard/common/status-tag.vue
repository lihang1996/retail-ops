<template>
  <span
    :class="['biz-status-tag', `status-${tagType}`, `domain-${domain}`]"
  >
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { statusLabel, statusType } from './status-dict.js'

const props = defineProps({
  value: { type: [String, Number], default: '' },
  // 精确域：order / shipment / product / common；不传则用合并字典兜底
  domain: { type: String, default: '' },
  effect: { type: String, default: 'light' },
})

const label = computed(() => statusLabel(props.value, props.domain))
const tagType = computed(() => statusType(props.value, props.domain))
</script>

<style lang="less" scoped>
.biz-status-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  line-height: 1.5;
  letter-spacing: 0.02em;
  white-space: nowrap;
  transition: all var(--transition-fast);

  /* 成功状态 */
  &.status-success {
    background: var(--color-success-50);
    color: var(--color-success-700);
    border: 1px solid var(--color-success-200);

    &:hover {
      background: var(--color-success-100);
    }
  }

  /* 警告状态 */
  &.status-warning {
    background: var(--color-warning-50);
    color: var(--color-warning-700);
    border: 1px solid var(--color-warning-200);

    &:hover {
      background: var(--color-warning-100);
    }
  }

  /* 错误/危险状态 */
  &.status-danger {
    background: var(--color-error-50);
    color: var(--color-error-700);
    border: 1px solid var(--color-error-200);

    &:hover {
      background: var(--color-error-100);
    }
  }

  /* 信息状态 */
  &.status-info {
    background: var(--color-primary-50);
    color: var(--color-primary-700);
    border: 1px solid var(--color-primary-200);

    &:hover {
      background: var(--color-primary-100);
    }
  }

  /* 默认/待处理状态 */
  &.status- {
    background: var(--color-gray-100);
    color: var(--color-gray-700);
    border: 1px solid var(--color-gray-200);

    &:hover {
      background: var(--color-gray-200);
    }
  }

  /* 特定域的微调 */
  &.domain-order {
    text-transform: none;
  }

  &.domain-shipment {
    font-weight: var(--font-medium);
  }
}
</style>
