<template>
  <el-config-provider :locale="zhCn">
    <el-container class="retail-shell">
      <DashboardHeader
        :proj-name="projName"
        :context-trail="contextTrail"
        :header-title="headerTitle"
        :visible-modules="visibleModules"
        :current-module-key="currentModuleKey"
        :module-icon="moduleIcon"
        :project-list="projectStore.projectList"
        :user-initial="userInitial"
        :user-name="userName"
        @go-project-list="goProjectList"
        @switch-module="switchModule"
        @project-command="handleProjectCommand"
        @user-command="handleUserCommand"
      />

      <el-main class="retail-main">
        <router-view v-slot="{ Component, route: viewRoute }">
          <transition name="module-route" mode="out-in">
            <component
              :is="Component"
              :key="routeViewKey(viewRoute)"
            />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-config-provider>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import zhCn from '$elementPlusZhCn'
import { useMenuStore } from '$elpisStore/menu'
import { useProjectStore } from '$elpisStore/project'
import { logout as logoutSession } from '$retailAuth'
import DashboardHeader from './common/DashboardHeader.vue'
import { useDashboardBootstrap } from './common/use-dashboard-bootstrap.js'
import {
  MODULE_PERMISSION_MAP,
  MODULE_ICON_MAP,
  resolveModuleKey,
  resolvePageTitle,
  buildContextTrail,
  resolveModuleTarget,
} from './common/dashboard-route-meta.js'

const route = useRoute()
const router = useRouter()
const menuStore = useMenuStore()
const projectStore = useProjectStore()

const {
  projName,
  userName,
  permissionMenus,
  defaultWarehouseId,
  bootstrap,
} = useDashboardBootstrap()

const userInitial = computed(() => String(userName.value || 'U').trim().slice(0, 1).toUpperCase())

const visibleModules = computed(() => {
  const list = menuStore.menuList || []
  if (!permissionMenus.value.length) return list
  return list.filter((item) => {
    const code = item.permissionCode || MODULE_PERMISSION_MAP[item.key]
    return !code || permissionMenus.value.includes(code)
  })
})

const currentModuleKey = computed(() => resolveModuleKey(route, visibleModules.value))

const currentModule = computed(() => (
  visibleModules.value.find((item) => item.key === currentModuleKey.value)
  || menuStore.findMenuItem({ key: 'key', value: currentModuleKey.value })
  || visibleModules.value[0]
))

const currentPageTitle = computed(() => resolvePageTitle(route, menuStore, currentModule.value))

const headerTitle = computed(() => currentPageTitle.value || (currentModule.value && currentModule.value.name) || '工作台')

const contextTrail = computed(() => buildContextTrail(
  route,
  currentModule.value && currentModule.value.name,
  currentPageTitle.value,
))

onMounted(bootstrap)

const moduleIcon = (item) => MODULE_ICON_MAP[item && item.key] || '模'

const routeViewKey = (viewRoute) => [
  viewRoute.path,
  viewRoute.query && viewRoute.query.key,
  viewRoute.query && viewRoute.query.sider_key,
  viewRoute.query && viewRoute.query.warehouse_id,
].filter(Boolean).join('::')

const switchModule = (menuKey) => {
  if (menuKey === 'project-list') {
    goProjectList()
    return
  }

  const menuItem = menuStore.findMenuItem({
    key: 'key',
    value: menuKey,
  })

  if (!menuItem || (currentModule.value && menuItem.key === currentModule.value.key)) return

  const target = resolveModuleTarget(menuItem, {
    route,
    menuStore,
    defaultWarehouseId: defaultWarehouseId.value,
  })
  if (target) router.push(target)
}

const goProjectList = () => {
  window.location.href = '/view/project-list'
}

const handleProjectCommand = (projectKey) => {
  const projectItem = projectStore.projectList.find((item) => item.key === projectKey)
  if (!projectItem || !projectItem.homePage) return

  window.location.assign(`/view/dashboard${projectItem.homePage}`)
}

const handleUserCommand = async (command) => {
  if (command === 'project-list') {
    goProjectList()
    return
  }

  if (command === 'logout') {
    ElMessage.success('已退出登录')
    await logoutSession()
  }
}
</script>

<style lang="less" scoped>
.retail-shell {
  width: 100%;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
  background: var(--app-bg-page);
}

.retail-main {
  position: relative;
  padding: 0;
  background: var(--app-bg-page);
  overflow: auto;
  overflow-x: hidden;
  min-width: 0;
}

.module-route-enter-active,
.module-route-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.22s ease;
}

.module-route-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.992);
  filter: saturate(0.96);
}

.module-route-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.996);
  filter: saturate(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .module-route-enter-active,
  .module-route-leave-active {
    transition: none;
  }
}
</style>
