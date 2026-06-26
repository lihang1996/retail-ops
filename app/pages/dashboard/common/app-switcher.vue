<template>
  <el-dropdown
    trigger="click"
    placement="bottom-end"
    popper-class="module-dropdown-popper"
    @command="onSelect"
    @visible-change="isOpen = $event"
  >
    <button
      type="button"
      class="module-dropdown-trigger"
      :class="{ 'is-open': isOpen }"
      title="切换模块"
      aria-label="切换模块"
    >
      <span class="module-badge">{{ activeIcon }}</span>
      <span class="module-label">{{ activeName }}</span>
      <span class="module-chevron" aria-hidden="true">⌄</span>
    </button>
    <template #dropdown>
      <el-dropdown-menu class="module-dropdown-menu">
        <el-dropdown-item
          v-for="item in modules"
          :key="item.key"
          :command="item.key"
          :disabled="item.key === activeKey"
        >
          <span class="module-dropdown-row">
            <span class="module-dropdown-icon">{{ iconFor(item) }}</span>
            <span class="module-dropdown-text">{{ item.name }}</span>
            <span v-if="item.key === activeKey" class="module-dropdown-check">当前</span>
          </span>
        </el-dropdown-item>
        <el-dropdown-item class="module-dropdown-footer" divided command="project-list">
          进入全部入口
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modules: { type: Array, default: () => [] },
  activeKey: { type: String, default: '' },
  iconFor: { type: Function, required: true },
})
const emit = defineEmits(['select'])
const isOpen = ref(false)

const activeModule = computed(() => (
  props.modules.find((item) => item.key === props.activeKey) || props.modules[0]
))

const activeName = computed(() => activeModule.value?.name || '选择模块')
const activeIcon = computed(() => props.iconFor(activeModule.value || {}))

function onSelect(key) {
  emit('select', key)
}
</script>

<style lang="less" scoped>
.module-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  max-width: 188px;
  padding: 0 11px 0 7px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 14px;
  background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06), 0 1px 0 rgba(255, 255, 255, 0.92) inset;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;

  &:hover,
  &.is-open {
    border-color: rgba(37, 99, 235, 0.36);
    background: #f8fbff;
    color: #2563eb;
    box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12), 0 0 0 3px rgba(37, 99, 235, 0.08);
  }

  &.is-open {
    transform: translateY(-1px);
  }
}

.module-badge,
.module-dropdown-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 800;
}

.module-badge {
  width: 26px;
  height: 26px;
  font-size: 11px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.78) inset;
}

.module-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
}

.module-chevron {
  flex-shrink: 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1;
  transition: transform 0.18s ease, color 0.18s ease;
}

.module-dropdown-trigger.is-open .module-chevron {
  color: #2563eb;
  transform: rotate(180deg);
}

.module-dropdown-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.module-dropdown-icon {
  width: 24px;
  height: 24px;
  font-size: 10px;
}

.module-dropdown-text {
  flex: 1;
  min-width: 0;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}

.module-dropdown-check {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: #eaf2ff;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}
</style>

<style lang="less">
.module-dropdown-popper {
  box-sizing: border-box;
  width: 240px !important;
  min-width: 240px !important;
  padding: 10px !important;
  border: 1px solid rgba(148, 163, 184, 0.24) !important;
  border-radius: 18px !important;
  background: #fff !important;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.13), 0 6px 16px rgba(37, 99, 235, 0.08) !important;
  overflow: hidden !important;

  &.el-popper.is-light {
    border: 1px solid rgba(148, 163, 184, 0.24) !important;
    background: #fff !important;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.13), 0 6px 16px rgba(37, 99, 235, 0.08) !important;
  }

  .el-popper__arrow {
    display: none;
  }

  .el-dropdown-menu.module-dropdown-menu {
    width: 100%;
    min-width: 0;
    max-width: none;
    padding: 0;
    margin: 0;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: hidden !important;
  }

  .el-dropdown-menu__item {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    margin: 2px 0;
    padding: 10px 12px;
    border-radius: 12px;
    line-height: 1;
    overflow: hidden;
    transition:
      background 0.16s ease,
      color 0.16s ease,
      box-shadow 0.16s ease;

    &:not(.is-disabled):hover,
    &:not(.is-disabled):focus {
      background: #f1f7ff;
      color: #2563eb;
      box-shadow: inset 3px 0 0 rgba(37, 99, 235, 0.16);

      .module-dropdown-text {
        color: #2563eb;
      }
    }
  }

  .el-dropdown-menu__item.is-disabled {
    opacity: 1;
    color: var(--el-text-color-primary);
    font-weight: 700;
    background: #f3f7ff;

    .module-dropdown-icon {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .module-dropdown-text {
      color: #0f172a;
    }
  }

  .el-dropdown-menu__item--divided {
    margin-top: 8px;
    padding-top: 11px;
    border-top-color: rgba(148, 163, 184, 0.18);

    &::before {
      height: 8px;
      margin: 0 -10px;
      background: transparent;
    }
  }

  .module-dropdown-footer {
    margin-bottom: 0;
    color: #475569;
    font-size: 14px;
    font-weight: 600;

    &:not(.is-disabled):hover,
    &:not(.is-disabled):focus {
      background: #f8fafc;
      color: #2563eb;
      transform: none;
    }
  }
}
</style>
