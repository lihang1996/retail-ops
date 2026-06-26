<template>
  <div class="readonly-page-wrap">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="演示模块 · 只读"
      description="客户中心为演示只读视图，客户档案由订单行为推导，不支持手动建档或编辑。"
      class="readonly-banner"
    />
  <OpsListPageShell
    title="客户中心"
    description="从订单行为识别新客、活跃客户、复购客户和高价值客户，帮助运营快速定位需要召回或重点维护的人群。"
    :page-loading="loading"
    :list-loading="listLoading"
    :list-error="listError"
    :total="total"
    :current-page="page"
    :page-size="size"
    panel-title="客户价值列表"
    panel-meta="按最近建档时间排序"
    pagination-layout="total, sizes, prev, pager, next"
    @retry="loadList"
    @page-change="onPageChange"
    @page-size-change="onPageSizeChange"
  >
    <template #actions>
      <el-button type="primary" :loading="loading" @click="loadData">刷新客户数据</el-button>
    </template>

    <template #metrics>
      <div class="ops-metric tone-primary">
        <span class="ops-metric-label">客户总数</span>
        <strong class="ops-metric-value">{{ total }}</strong>
        <span class="ops-metric-hint">当前租户客户档案</span>
      </div>
      <div class="ops-metric">
        <span class="ops-metric-label">有成交客户</span>
        <strong class="ops-metric-value">{{ (summary.active || 0) + (summary.repeat || 0) }}</strong>
        <span class="ops-metric-hint">至少完成过一笔订单</span>
      </div>
      <div class="ops-metric tone-success">
        <span class="ops-metric-label">复购客户</span>
        <strong class="ops-metric-value">{{ summary.repeat || 0 }}</strong>
        <span class="ops-metric-hint">累计订单数不少于 2</span>
      </div>
      <div class="ops-metric tone-warning">
        <span class="ops-metric-label">高价值客户</span>
        <strong class="ops-metric-value">{{ summary.vip || 0 }}</strong>
        <span class="ops-metric-hint">高频或累计消费较高</span>
      </div>
    </template>

    <template #filters>
      <el-input v-model="keyword" placeholder="搜索客户名称" clearable @keyup.enter="search" />
      <el-input v-model="phone" placeholder="搜索手机号" clearable @keyup.enter="search" />
      <el-input v-model="address" placeholder="搜索收货区域" clearable @keyup.enter="search" />
      <el-select v-model="segment" placeholder="客户分群" clearable @change="search">
        <el-option v-for="item in segmentOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-button type="primary" :loading="listLoading" @click="search">查询</el-button>
      <el-button :disabled="listLoading" @click="reset">重置</el-button>
      <span class="privacy-tip">手机号按当前角色权限自动脱敏</span>
    </template>

    <div class="ops-table-wrap">
      <el-table :data="list" size="small">
        <el-table-column label="客户" min-width="190">
          <template #default="{ row }">
            <div class="customer-cell">
              <span class="avatar">{{ String(row.customer_name || '客').slice(0, 1) }}</span>
              <span><strong>{{ row.customer_name }}</strong><small>{{ row.customer_id }}</small></span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分群" min-width="110" align="center">
          <template #default="{ row }">
            <span class="segment-tag" :class="row.customer_segment">{{ segmentLabel(row.customer_segment) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column label="订单数" min-width="110" align="right">
          <template #default="{ row }">{{ row.order_count || 0 }}</template>
        </el-table-column>
        <el-table-column label="累计消费" min-width="130" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.total_spent) }}</template>
        </el-table-column>
        <el-table-column label="客单价" min-width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.avg_order_value) }}</template>
        </el-table-column>
        <el-table-column label="最近下单" min-width="165">
          <template #default="{ row }">{{ formatDateTime(row.last_order_at, '从未下单') }}</template>
        </el-table-column>
        <el-table-column prop="address" label="收货区域" min-width="220" show-overflow-tooltip />
        <template #empty><empty-state title="暂无客户数据" description="订单导入或下单后会自动沉淀客户档案。" /></template>
      </el-table>
    </div>
  </OpsListPageShell>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { customerApi } from '../api/customer-api.js'
import { workbenchApi } from '../api/workbench-api.js'
import OpsListPageShell from '../common/ops/OpsListPageShell.vue'
import EmptyState from '../common/empty-state.vue'
import { CUSTOMER_SEGMENT_OPTIONS, customerSegmentLabel } from '../common/business-options-dict.js'
import { formatMoney, formatDateTime } from '../common/format.js'
import { useListPage } from '../common/use-list-page.js'

const loading = ref(false)
const keyword = ref('')
const phone = ref('')
const address = ref('')
const segment = ref('')
const summary = ref({})

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
  fetchPage: ({ page: current, pageSize, query }) => customerApi.list({ ...query, page: current, size: pageSize }),
  buildQuery: () => ({
    customer_name: keyword.value,
    phone: phone.value,
    address: address.value,
    customer_segment: segment.value,
  }),
})

const segmentOptions = CUSTOMER_SEGMENT_OPTIONS

function segmentLabel(value) { return customerSegmentLabel(value) }
function search() { return runSearch() }
function reset() {
  keyword.value = ''
  phone.value = ''
  address.value = ''
  segment.value = ''
  return runSearch()
}

async function loadData() {
  loading.value = true
  try {
    const [opsRes] = await Promise.all([workbenchApi.ops(), loadList()])
    summary.value = (opsRes && opsRes.data && opsRes.data.customerSummary) || {}
  } finally { loading.value = false }
}

onMounted(loadData)
</script>

<style lang="less" scoped>
.readonly-page-wrap .readonly-banner { margin-bottom: 16px; }
.privacy-tip { margin-left: auto; color: #94a3b8; font-size: 11px; }
.customer-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.avatar { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; background: #eff6ff; color: #2563eb; font-weight: 800; }
.customer-cell strong, .customer-cell small { display: block; }
.customer-cell strong { color: #1e293b; font-size: 13px; }
.customer-cell small { margin-top: 3px; color: #94a3b8; font-size: 10px; }
.segment-tag { display: inline-flex; padding: 3px 9px; border-radius: 999px; background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 700; }
.segment-tag.active { background: #eff6ff; color: #2563eb; }
.segment-tag.repeat { background: #f0fdf4; color: #16a34a; }
.segment-tag.vip { background: #fff7ed; color: #d97706; }
</style>
