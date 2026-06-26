<template>
  <el-container class="project-entry-shell">
    <el-header class="entry-header">
      <button type="button" class="brand-panel" @click="refreshEntries">
        <BrandLogo size="md" />
        <span class="brand-copy">
          <span class="brand-title">零售运营</span>
          <span class="brand-subtitle">Retail Ops</span>
        </span>
      </button>
      <div class="header-actions">
        <span class="user-name">{{ userName }}</span>
        <el-button text @click="onLogout">退出登录</el-button>
      </div>
    </el-header>

    <el-main v-loading="loading" class="entry-main">
      <section class="entry-hero">
        <p class="eyebrow">Retail Ops Console</p>
        <h1>选择要进入的业务模块</h1>
        <p>按你的权限展示入口，进入后也可以从顶部一键回到这里。</p>
      </section>

      <el-empty v-if="!loading && entries.length === 0" description="暂无可用入口" />

      <el-row v-else :gutter="20" class="entry-list">
        <el-col
          v-for="item in entries"
          :key="item.key"
          :xs="24"
          :sm="12"
          :lg="8"
        >
          <ModuleEntryCard
            :icon="item.icon"
            :name="item.name"
            :desc="item.desc"
            @select="goEntry(item)"
          />
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getCurrentUser, getPermissions, getToken, logout } from '$retailAuth'
import BrandLogo from '../dashboard/common/brand-logo.vue'
import ModuleEntryCard from '../dashboard/common/module-entry-card.vue'
import {
  buildAiWorkbenchPath,
  buildFulfillmentPath,
  buildOpsConsolePath,
  buildOverviewPath,
  buildProductListPath,
  buildSchemaPath,
  buildStockInboundPath,
  buildWarehouse3dPath,
} from '../dashboard/common/nav.js'

const loading = ref(true)
const entries = ref([])
const userName = ref('admin')
const projKey = 'retail'

const ALL_ENTRIES = [
  { key: 'overview', menu: 'menu:overview', icon: '总', name: '经营总览', desc: 'GMV、订单、库存风险', path: buildOverviewPath({ projKey }) },
  { key: 'fulfillment', menu: 'menu:fulfillment', icon: '履', name: '履约中心', desc: '订单分仓、拣货、出库', path: buildFulfillmentPath({ projKey }) },
  { key: 'warehouse', menu: 'menu:fulfillment', icon: '仓', name: '仓储管理', desc: '仓库、库位、库存与入库作业', path: buildStockInboundPath({ projKey }) },
  { key: 'warehouse-3d', menu: 'menu:fulfillment', icon: '3D', name: '3D 仓库', desc: '库位风险可视化与拣货路径', path: buildWarehouse3dPath({ projKey }) },
  { key: 'ai', menu: 'menu:ai', icon: 'AI', name: 'AI 业务助手', desc: '业务流程分步指引与只读问数', path: buildAiWorkbenchPath({ projKey }) },
  { key: 'product', menu: 'menu:product', icon: '商', name: '商品管理', desc: '店铺、类目、品牌、商品建档', path: buildProductListPath({ projKey }) },
  { key: 'ops', menu: 'menu:ops', icon: '运', name: '运营中心', desc: '审批、审计、客户、财务、营销', path: buildOpsConsolePath({ projKey }) },
  { key: 'org', menu: 'menu:org', icon: '组', name: '组织管理', desc: '部门、用户、角色与权限', path: buildSchemaPath({ projKey, moduleKey: 'org', siderKey: 'org_department' }) },
]

onMounted(async () => {
  if (!getToken()) {
    window.location.href = '/view/login'
    return
  }
  await Promise.allSettled([refreshEntries(), loadCurrentUser()])
})

const refreshEntries = async () => {
  loading.value = true
  try {
    const data = await getPermissions()
    const menus = data.menus || []
    entries.value = ALL_ENTRIES.filter((e) => menus.includes(e.menu))
  } catch {
    entries.value = []
  } finally {
    loading.value = false
  }
}

const loadCurrentUser = async () => {
  try {
    const data = await getCurrentUser()
    userName.value = data.user?.displayName || data.user?.account || 'admin'
  } catch {
    // 权限接口会处理登录失效；这里保留默认展示即可。
  }
}

const goEntry = (item) => {
  window.location.href = item.path
}

const onLogout = () => logout()
</script>

<style lang="less" scoped>
.project-entry-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 0%, rgba(59, 130, 246, 0.11), transparent 30%),
    linear-gradient(180deg, #f8fbff 0%, var(--app-bg-page) 42%);
}

.entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--app-header-height);
  padding: 0 32px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid var(--app-border);
  backdrop-filter: blur(16px);
}

.brand-panel {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: var(--el-text-color-primary);
  font: inherit;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-name {
  color: var(--app-text-muted);
  font-size: 14px;
}

.entry-main {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 42px 32px 56px;
}

.entry-hero {
  margin-bottom: 28px;

  .eyebrow {
    margin: 0 0 10px;
    color: var(--app-accent);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: var(--el-text-color-primary);
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: -0.04em;
  }

  p {
    margin: 12px 0 0;
    color: var(--app-text-muted);
    font-size: 14px;
  }
}

.entry-list {
  row-gap: 20px;
}
</style>
