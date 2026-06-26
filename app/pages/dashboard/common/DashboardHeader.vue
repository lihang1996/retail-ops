<template>
  <el-header class="retail-header">
    <div class="header-zone header-brand">
      <button type="button" class="brand-panel" @click="$emit('go-project-list')">
        <BrandLogo size="md" />
        <span class="brand-copy">
          <span class="brand-title">{{ projName || '零售运营' }}</span>
          <span class="brand-subtitle">智能零售运营中台</span>
        </span>
      </button>
    </div>

    <div class="header-zone header-context">
      <nav v-if="contextTrail.length" class="context-trail" aria-label="当前页面">
        <template v-for="(item, idx) in contextTrail" :key="`${item}-${idx}`">
          <span class="context-trail-item trail-title">{{ item }}</span>
        </template>
      </nav>
      <h1 v-else class="context-title">{{ headerTitle }}</h1>
    </div>

    <div class="header-zone header-toolbar">
      <AppSwitcher
        :modules="visibleModules"
        :active-key="currentModuleKey"
        :icon-for="moduleIcon"
        @select="$emit('switch-module', $event)"
      />

      <el-dropdown
        v-if="projectList.length > 1"
        trigger="click"
        @command="$emit('project-command', $event)"
      >
        <button type="button" class="toolbar-chip">
          <span class="chip-label">项目</span>
          <span class="chip-chevron" aria-hidden="true">⌄</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="item in projectList"
              :key="item.key"
              :command="item.key"
              :disabled="item.name === projName"
            >
              {{ item.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-dropdown
        trigger="click"
        placement="bottom-end"
        popper-class="user-dropdown-popper"
        @command="$emit('user-command', $event)"
        @visible-change="isUserMenuOpen = $event"
      >
        <button
          type="button"
          class="toolbar-chip user-chip"
          :class="{ 'is-open': isUserMenuOpen }"
        >
          <span class="avatar">{{ userInitial }}</span>
          <span class="user-name">{{ userName }}</span>
          <span class="chip-chevron" aria-hidden="true">⌄</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu class="user-dropdown-menu">
            <el-dropdown-item class="user-menu-item" command="project-list">进入模块选择</el-dropdown-item>
            <el-dropdown-item class="user-menu-item user-menu-logout" divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </el-header>
</template>

<script setup>
import { ref } from 'vue'
import BrandLogo from './brand-logo.vue'
import AppSwitcher from './app-switcher.vue'

defineProps({
  projName: { type: String, default: '' },
  contextTrail: { type: Array, default: () => [] },
  headerTitle: { type: String, default: '工作台' },
  visibleModules: { type: Array, default: () => [] },
  currentModuleKey: { type: String, default: '' },
  moduleIcon: { type: Function, required: true },
  projectList: { type: Array, default: () => [] },
  userInitial: { type: String, default: 'U' },
  userName: { type: String, default: 'admin' },
})

defineEmits(['go-project-list', 'switch-module', 'project-command', 'user-command'])

const isUserMenuOpen = ref(false)
</script>

<style lang="less" scoped>
.retail-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 20px;
  height: 60px;
  padding: 0 20px 0 18px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 8px 24px rgba(15, 23, 42, 0.04);
  backdrop-filter: blur(12px);
}

.header-zone {
  display: flex;
  align-items: center;
  min-width: 0;
}

.header-brand {
  flex: 0 0 auto;
  padding-right: 20px;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
}

.header-context {
  flex: 1 1 auto;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
  padding-left: 4px;
}

.header-toolbar {
  flex: 0 0 auto;
  gap: 8px;
}

.brand-panel {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 4px 6px 4px 4px;
  margin: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background 0.18s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.05);
  }
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.brand-title {
  max-width: 160px;
  overflow: hidden;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-subtitle {
  max-width: 160px;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-trail {
  display: flex;
  align-items: center;
  min-width: 0;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
}

.context-trail-item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.trail-title {
    color: #0f172a;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.03em;
  }
}

.context-title {
  margin: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.03em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: #fff;
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;

  &:hover,
  &.is-open {
    border-color: rgba(37, 99, 235, 0.22);
    background: #f8fbff;
    color: #2563eb;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.1), 0 0 0 3px rgba(37, 99, 235, 0.08);
  }
}

.chip-label { line-height: 1; }

.chip-chevron {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1;
  transition: transform 0.18s ease, color 0.18s ease;
}

.toolbar-chip.is-open .chip-chevron {
  color: #2563eb;
  transform: rotate(180deg);
}

.user-chip { padding-right: 10px; }

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(145deg, #3b82f6, #1d4ed8);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.user-name {
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1080px) {
  .retail-header {
    gap: 12px;
    padding-inline: 12px;
  }

  .header-brand { padding-right: 12px; }

  .brand-copy,
  .context-trail {
    display: none;
  }

  .context-title { font-size: 16px; }

  .user-name,
  .chip-label {
    display: none;
  }
}
</style>

<style lang="less">
.user-dropdown-popper {
  box-sizing: border-box;
  width: 152px !important;
  min-width: 152px !important;
  padding: 8px !important;
  border: 1px solid rgba(148, 163, 184, 0.24) !important;
  border-radius: 16px !important;
  background: #fff !important;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.13), 0 6px 16px rgba(37, 99, 235, 0.08) !important;
  overflow: hidden !important;

  &.el-popper.is-light {
    border: 1px solid rgba(148, 163, 184, 0.24) !important;
    background: #fff !important;
    box-shadow: 0 18px 38px rgba(15, 23, 42, 0.13), 0 6px 16px rgba(37, 99, 235, 0.08) !important;
  }

  .el-popper__arrow { display: none; }

  .el-dropdown-menu.user-dropdown-menu {
    width: 100%;
    min-width: 0;
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
    min-height: 40px;
    margin: 0;
    padding: 0 12px;
    border-radius: 10px;
    color: #475569;
    font-size: 14px;
    font-weight: 600;
    line-height: 40px;
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
    }
  }

  .el-dropdown-menu__item--divided {
    margin-top: 7px;
    padding-top: 8px;
    border-top-color: rgba(148, 163, 184, 0.18);

    &::before {
      height: 7px;
      margin: 0 -12px;
      background: transparent;
    }
  }

  .user-menu-logout:not(.is-disabled):hover,
  .user-menu-logout:not(.is-disabled):focus {
    background: #fff1f2;
    color: #dc2626;
    box-shadow: inset 3px 0 0 rgba(220, 38, 38, 0.18);
  }
}
</style>
