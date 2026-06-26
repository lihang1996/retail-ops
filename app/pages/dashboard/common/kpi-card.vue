<template>
  <component
    :is="tagName"
    class="biz-kpi-card"
    :class="[tone, { 'is-clickable': clickable, 'is-compact': compact }]"
    v-bind="buttonAttrs"
    @click="onClick"
  >
    <span v-if="icon || label" class="biz-kpi-head">
      <span v-if="icon" class="biz-kpi-icon">{{ icon }}</span>
      <span v-if="label" class="biz-kpi-label">{{ label }}</span>
    </span>
    <strong class="biz-kpi-value">{{ value }}</strong>
    <span v-if="hint" class="biz-kpi-hint">{{ hint }}</span>
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: '' },
  label: { type: String, default: '' },
  value: { type: [String, Number], default: '-' },
  hint: { type: String, default: '' },
  tone: { type: String, default: '' },
  clickable: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])
const tagName = computed(() => (props.clickable ? 'button' : 'div'))
const buttonAttrs = computed(() => (props.clickable ? { type: 'button' } : {}))

function onClick() {
  if (props.clickable) emit('select')
}
</script>

<style lang="less" scoped>
.biz-kpi-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: min(100%, 140px);
  min-height: 92px;
  padding: 16px;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  text-align: left;
  outline: none;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

  &.is-clickable {
    cursor: pointer;

    &:hover {
      border-color: #bfdbfe;
      background: #fafcff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
    }

    &:focus-visible {
      border-color: #93c5fd;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
  }

  &.is-compact {
    min-height: 76px;
    padding: 14px;
    gap: 5px;
  }
}

.biz-kpi-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.biz-kpi-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 800;
}

.biz-kpi-label {
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}

.biz-kpi-value {
  color: #0f172a;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.08;
  font-variant-numeric: tabular-nums;
}

.biz-kpi-hint {
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.tone-primary .biz-kpi-icon,
.primary .biz-kpi-icon {
  background: #eff6ff;
  color: #2563eb;
}

.tone-info .biz-kpi-icon,
.info .biz-kpi-icon {
  background: #f0f9ff;
  color: #0284c7;
}

.tone-warning .biz-kpi-icon,
.warning .biz-kpi-icon {
  background: #fffbeb;
  color: #d97706;
}

.tone-danger .biz-kpi-icon,
.danger .biz-kpi-icon {
  background: #fef2f2;
  color: #dc2626;
}

.tone-success .biz-kpi-icon,
.success .biz-kpi-icon {
  background: #ecfdf5;
  color: #16a34a;
}

.tone-primary .biz-kpi-value,
.primary .biz-kpi-value { color: #2563eb; }
.tone-info .biz-kpi-value,
.info .biz-kpi-value { color: #0284c7; }
.tone-warning .biz-kpi-value,
.warning .biz-kpi-value { color: #d97706; }
.tone-danger .biz-kpi-value,
.danger .biz-kpi-value { color: #dc2626; }
.tone-success .biz-kpi-value,
.success .biz-kpi-value { color: #16a34a; }
</style>
