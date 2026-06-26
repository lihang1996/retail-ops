<template>
  <div class="readonly-page-wrap">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="演示模块 · 只读"
      description="营销中心为演示只读视图，可查看活动与关联商品，不支持创建或编辑活动。"
      class="readonly-banner"
    />
  <OpsListPageShell
    title="营销活动中心"
    description="查看活动生命周期、覆盖商品和促销价格。即将结束的活动会进入运营待办，避免活动过期后价格或商品状态无人处理。"
    :page-loading="loading"
    :list-loading="activityLoading"
    :list-error="listError"
    :total="total"
    :current-page="page"
    :page-size="size"
    panel-title="活动工作台"
    panel-meta="点击活动查看关联商品"
    pagination-layout="total, prev, pager, next"
    @retry="loadActivities"
    @page-change="handlePageChange"
    @page-size-change="handlePageSizeChange"
  >
    <template #actions>
      <el-button type="primary" :loading="loading" @click="loadData">刷新活动</el-button>
    </template>

    <template #metrics>
      <div class="ops-metric tone-primary">
        <span class="ops-metric-label">进行中活动</span>
        <strong class="ops-metric-value">{{ summary.active || 0 }}</strong>
        <span class="ops-metric-hint">当前处于有效期内</span>
      </div>
      <div class="ops-metric">
        <span class="ops-metric-label">活动总数</span>
        <strong class="ops-metric-value">{{ total }}</strong>
        <span class="ops-metric-hint">包含待开始与已结束活动</span>
      </div>
      <div class="ops-metric tone-success">
        <span class="ops-metric-label">覆盖商品</span>
        <strong class="ops-metric-value">{{ summary.coveredProducts || 0 }}</strong>
        <span class="ops-metric-hint">已关联活动的去重商品数</span>
      </div>
      <div class="ops-metric tone-warning">
        <span class="ops-metric-label">即将结束</span>
        <strong class="ops-metric-value">{{ summary.endingSoon || 0 }}</strong>
        <span class="ops-metric-hint">未来 3 天内到期</span>
      </div>
    </template>

    <template #filters>
      <el-radio-group v-model="status" size="small" @change="onStatusChange">
        <el-radio-button v-for="item in statusOptions" :key="item.value" :label="item.value">
          {{ item.label }}
        </el-radio-button>
      </el-radio-group>
      <el-tag v-if="endingSoonOnly" type="warning" closable @close="clearEndingSoon">
        未来 3 天内结束
      </el-tag>
      <el-input v-model="keyword" placeholder="搜索活动名称" clearable @keyup.enter="searchActivities" />
      <el-select v-model="activityType" placeholder="活动类型" clearable @change="searchActivities">
        <el-option v-for="item in activityTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-button type="primary" :loading="activityLoading" @click="() => searchActivities().then(syncActivitySelection)">查询</el-button>
      <el-button :disabled="activityLoading" @click="resetFilters">重置</el-button>
      <span class="filter-note">点击活动卡片查看关联商品和促销价格</span>
    </template>

    <div class="marketing-layout">
      <MarketingActivityList
        :activities="activities"
        :selected-id="selectedId"
        :total="total"
        :type-label="typeLabel"
        @select="selectActivity"
      />
      <MarketingActivityDetail
        :loading="detailLoading"
        :detail="detail"
        :type-label="typeLabel"
      />
    </div>
  </OpsListPageShell>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { marketingApi } from '../api/marketing-api.js'
import { workbenchApi } from '../api/workbench-api.js'
import { useListPage } from '../common/use-list-page.js'
import { MARKETING_ACTIVITY_TYPE_OPTIONS, marketingActivityTypeLabel } from '../common/business-options-dict.js'
import OpsListPageShell from '../common/ops/OpsListPageShell.vue'
import MarketingActivityList from './MarketingActivityList.vue'
import MarketingActivityDetail from './MarketingActivityDetail.vue'
import { useMarketingActivitySelection } from './use-marketing-activity-selection.js'

const loading = ref(false)
const route = useRoute()
const summary = ref({})
const endingSoonOnly = ref(route.query.view === 'ending_soon')
const status = ref(endingSoonOnly.value ? 'active' : 'all')
const keyword = ref('')
const activityType = ref('')

const {
  list: activities,
  listLoading: activityLoading,
  listError,
  currentPage: page,
  pageSize: size,
  total,
  load: loadActivities,
  search: searchActivities,
  resetAndLoad,
  onPageChange,
  onPageSizeChange,
} = useListPage({
  initialPageSize: 10,
  buildQuery: () => ({
    status: status.value,
    ending_soon: endingSoonOnly.value ? '1' : undefined,
    activity_name: keyword.value || undefined,
    activity_type: activityType.value || undefined,
  }),
  fetchPage: ({ page: currentPage, pageSize, query }) => marketingApi.list({ ...query, page: currentPage, size: pageSize }),
})

const {
  detailLoading,
  detail,
  selectedId,
  selectActivity,
  syncSelection,
} = useMarketingActivitySelection({
  fetchDetail: (activityId) => marketingApi.get({ activity_id: activityId }),
})

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '进行中', value: 'active' },
  { label: '已停用', value: 'inactive' },
  { label: '已结束', value: 'expired' },
]
const activityTypeOptions = MARKETING_ACTIVITY_TYPE_OPTIONS

function typeLabel(value) { return marketingActivityTypeLabel(value) }
function onStatusChange() {
  endingSoonOnly.value = false
  searchActivities().then(syncActivitySelection)
}
function clearEndingSoon() {
  endingSoonOnly.value = false
  searchActivities().then(syncActivitySelection)
}
function resetFilters() {
  status.value = 'all'
  endingSoonOnly.value = false
  keyword.value = ''
  activityType.value = ''
  resetAndLoad(() => {}).then(syncActivitySelection)
}

async function syncActivitySelection() {
  await syncSelection(activities.value)
}

async function handlePageChange(nextPage) {
  await onPageChange(nextPage)
  await syncActivitySelection()
}

async function handlePageSizeChange(nextSize) {
  await onPageSizeChange(nextSize)
  await syncActivitySelection()
}

async function loadData() {
  loading.value = true
  try {
    const [opsRes] = await Promise.all([workbenchApi.ops(), loadActivities()])
    summary.value = (opsRes && opsRes.data && opsRes.data.marketingSummary) || {}
    await syncActivitySelection()
  } finally { loading.value = false }
}

onMounted(loadData)
</script>

<style lang="less" scoped>
.readonly-banner { margin-bottom: 16px; }
.filter-note { margin-left: auto; color: #94a3b8; font-size: 11px; }
.marketing-layout { display: grid; grid-template-columns: minmax(330px, .8fr) minmax(0, 1.4fr); gap: 16px; padding: 14px 16px 0; }
@media (max-width: 980px) { .marketing-layout { grid-template-columns: 1fr; } }
</style>
