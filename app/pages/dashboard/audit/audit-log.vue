<template>
  <OpsListPageShell
    title="审计与操作追踪"
    description="按业务模块、操作人和对象追溯关键动作。日志与订单、库存、发货、审批链路保持关联，便于问题定位和责任回溯。"
    :page-loading="loading"
    :list-loading="listLoading"
    :list-error="listError"
    :total="total"
    :current-page="page"
    :page-size="size"
    panel-title="操作流水"
    panel-meta="最近操作优先"
    pagination-layout="total, sizes, prev, pager, next"
    @retry="loadList"
    @page-change="onPageChange"
    @page-size-change="onPageSizeChange"
  >
    <template #actions>
      <el-button type="primary" :loading="loading" @click="loadData">刷新日志</el-button>
    </template>

    <template #metrics>
      <div class="ops-metric tone-primary">
        <span class="ops-metric-label">今日操作</span>
        <strong class="ops-metric-value">{{ todayAuditCount }}</strong>
        <span class="ops-metric-hint">今日产生的关键业务留痕</span>
      </div>
      <div class="ops-metric">
        <span class="ops-metric-label">日志总量</span>
        <strong class="ops-metric-value">{{ total }}</strong>
        <span class="ops-metric-hint">符合当前筛选条件</span>
      </div>
      <div class="ops-metric tone-success">
        <span class="ops-metric-label">活跃操作人</span>
        <strong class="ops-metric-value">{{ operatorCount }}</strong>
        <span class="ops-metric-hint">当前页涉及的操作人员</span>
      </div>
      <div class="ops-metric tone-warning">
        <span class="ops-metric-label">业务模块</span>
        <strong class="ops-metric-value">{{ moduleCount }}</strong>
        <span class="ops-metric-hint">订单、仓储、审批等动作分类</span>
      </div>
    </template>

    <template #filters>
      <el-select v-model="filters.module" placeholder="业务模块" clearable @change="search">
        <el-option v-for="item in moduleOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-input v-model="filters.action_code" placeholder="操作码，如 order:pay" clearable @keyup.enter="search" />
      <el-input v-model="filters.operator_name" placeholder="操作人" clearable @keyup.enter="search" />
      <el-select v-model="filters.object_type" placeholder="对象类型" clearable @change="search">
        <el-option v-for="item in objectTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-input v-model="filters.object_id" placeholder="对象 ID" clearable @keyup.enter="search" />
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="search"
      />
      <el-button type="primary" :loading="listLoading" @click="search">查询</el-button>
      <el-button :disabled="listLoading" @click="resetFilters">重置</el-button>
    </template>

    <div class="audit-feed">
      <article v-for="row in enrichedList" :key="row.audit_id" class="audit-row">
        <span class="audit-icon" :class="`tone-${row.tone}`">{{ row.icon }}</span>
        <div class="audit-main">
          <p>
            <strong>{{ row.operator_name || row.operator_account || '系统' }}</strong>
            {{ row.actionPhrase }}
          </p>
          <span v-if="row.detailHint" class="audit-detail">{{ row.detailHint }}</span>
          <div class="audit-meta">
            <span>{{ row.module }}</span>
            <code>{{ row.action_code }}</code>
            <span>{{ row.object_type || '—' }} / {{ row.object_id || '—' }}</span>
            <span>{{ row.ip || '内部请求' }}</span>
          </div>
        </div>
        <time>{{ formatDateTime(row.created_at) }}</time>
      </article>
      <empty-state v-if="!enrichedList.length && !listLoading" class="ops-empty" title="暂无匹配日志" description="调整操作码、模块或对象 ID 后重新查询。" />
    </div>
  </OpsListPageShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { auditApi } from '../api/audit-api.js'
import { workbenchApi } from '../api/workbench-api.js'
import OpsListPageShell from '../common/ops/OpsListPageShell.vue'
import EmptyState from '../common/empty-state.vue'
import { buildAuditSummary, resolveAuditAction } from '../common/audit-action-dict.js'
import { formatDateTime } from '../common/format.js'
import { useListPage } from '../common/use-list-page.js'

const loading = ref(false)
const todayAuditCount = ref(0)
const dateRange = ref([])
const filters = reactive({
  module: '',
  action_code: '',
  operator_name: '',
  object_type: '',
  object_id: '',
})

const {
  list,
  listLoading,
  listError,
  currentPage: page,
  pageSize: size,
  total,
  search: runSearch,
  load: loadList,
  onPageSizeChange,
  onPageChange,
} = useListPage({
  fetchPage: ({ page: current, pageSize, query }) => auditApi.list({ ...query, page: current, size: pageSize }),
  buildQuery: () => {
    const query = {}
    if (filters.action_code) query.action_code = filters.action_code
    else if (filters.module) query.action_code = `${filters.module}:`
    if (filters.operator_name) query.operator_name = filters.operator_name
    if (filters.object_type) query.object_type = filters.object_type
    if (filters.object_id) query.object_id = filters.object_id
    if (dateRange.value && dateRange.value.length === 2) {
      query.created_from = `${dateRange.value[0]} 00:00:00`
      query.created_to = `${dateRange.value[1]} 23:59:59`
    }
    return query
  },
})

const moduleOptions = [
  { label: '订单履约', value: 'order' },
  { label: '发货出库', value: 'shipment' },
  { label: '库存仓储', value: 'stock' },
  { label: '商品管理', value: 'product' },
  { label: '审批中心', value: 'approval' },
  { label: '登录与权限', value: 'auth' },
]
const objectTypeOptions = [
  { label: '订单', value: 'order' },
  { label: '发货单', value: 'shipment' },
  { label: '库存', value: 'stock' },
  { label: '商品', value: 'product' },
  { label: '审批', value: 'approval' },
  { label: '用户', value: 'user' },
]

const enrichedList = computed(() => list.value.map((row) => {
  const action = resolveAuditAction(row.action_code)
  const story = buildAuditSummary(row)
  return { ...row, ...action, ...story }
}))
const operatorCount = computed(() => new Set(list.value.map((row) => row.operator_id).filter(Boolean)).size)
const moduleCount = computed(() => new Set(enrichedList.value.map((row) => row.module).filter(Boolean)).size)

function search() { return runSearch() }
function resetFilters() {
  filters.module = ''
  filters.action_code = ''
  filters.operator_name = ''
  filters.object_type = ''
  filters.object_id = ''
  dateRange.value = []
  return runSearch()
}

async function loadData() {
  loading.value = true
  try {
    const [opsRes] = await Promise.all([workbenchApi.ops(), loadList()])
    todayAuditCount.value = Number(opsRes && opsRes.data ? opsRes.data.todayAuditCount : 0)
  } finally { loading.value = false }
}

onMounted(loadData)
</script>

<style lang="less" scoped>
.audit-feed { padding: 0 16px; }
.audit-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; padding: 15px 0; border-bottom: 1px solid #f1f5f9; }
.audit-row:last-child { border-bottom: 0; }
.audit-icon {
  display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;
  border-radius: 10px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 800;
}
.audit-icon.tone-warning { background: #fff7ed; color: #d97706; }
.audit-icon.tone-danger { background: #fef2f2; color: #dc2626; }
.audit-icon.tone-success { background: #f0fdf4; color: #16a34a; }
.audit-main p { margin: 0; color: #334155; font-size: 13px; line-height: 1.55; }
.audit-main p strong { color: #0f172a; }
.audit-detail { display: block; margin-top: 5px; color: #64748b; font-size: 11px; }
.audit-meta { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 7px; color: #94a3b8; font-size: 10px; }
.audit-meta code { color: #475569; font-family: var(--font-mono); }
.audit-row time { color: #94a3b8; font-size: 11px; white-space: nowrap; }
</style>
