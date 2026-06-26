<template>
  <OpsListPageShell
    title="审批中心"
    description="集中处理商品上架审批，查看申请商品、等待时长和历史处理结果。审批通过后会自动衔接商品上架状态。"
    :page-loading="loading"
    :list-loading="listLoading"
    :list-error="listError"
    :total="total"
    :current-page="page"
    :page-size="size"
    panel-title="审批列表"
    panel-meta="最近提交优先"
    :show-total="false"
    @retry="loadList"
    @page-change="onPageChange"
    @page-size-change="onPageSizeChange"
  >
    <template #actions>
      <el-button :loading="loading" @click="loadData">刷新</el-button>
      <el-button type="primary" @click="goProducts">查看待审核商品</el-button>
    </template>

    <template #metrics>
      <div class="ops-metric tone-warning">
        <span class="ops-metric-label">待审批</span>
        <strong class="ops-metric-value">{{ summary.pending || 0 }}</strong>
        <span class="ops-metric-hint">需要管理员及时处理</span>
      </div>
      <div class="ops-metric tone-success">
        <span class="ops-metric-label">已通过</span>
        <strong class="ops-metric-value">{{ summary.approved || 0 }}</strong>
        <span class="ops-metric-hint">已自动衔接商品上架</span>
      </div>
      <div class="ops-metric tone-danger">
        <span class="ops-metric-label">已驳回</span>
        <strong class="ops-metric-value">{{ summary.rejected || 0 }}</strong>
        <span class="ops-metric-hint">需运营调整后重新提交</span>
      </div>
      <div class="ops-metric">
        <span class="ops-metric-label">最长等待</span>
        <strong class="ops-metric-value">{{ longestWait }}h</strong>
        <span class="ops-metric-hint">当前页待审批最长等待时间</span>
      </div>
    </template>

    <template #filters>
      <div class="approval-filter-main">
        <el-radio-group
          v-model="status"
          class="approval-status-tabs"
          size="small"
          :style="{ '--active-offset': statusOffset }"
          @change="onStatusChange"
        >
          <el-radio-button v-for="item in statusOptions" :key="item.value" :label="item.value">
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
        <div class="approval-search-fields">
          <el-input v-model="keyword" placeholder="搜索标题、商品或申请人" clearable @keyup.enter="applyKeyword" />
          <el-select v-model="productStatus" placeholder="商品状态" clearable @change="applyKeyword">
            <el-option v-for="item in productStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="approval-filter-actions">
          <el-button type="primary" :loading="listLoading" @click="applyKeyword">查询</el-button>
          <el-button :disabled="listLoading" @click="resetFilters">重置</el-button>
        </div>
      </div>
    </template>

    <div class="ops-table-wrap approval-list-panel" :class="{ 'is-switching': listLoading }">
        <el-table :data="list" size="small">
          <el-table-column label="申请事项" min-width="260">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.product_name || row.title || row.ref_id }}</strong>
                <span>{{ row.title }} · {{ refTypeLabel(row.ref_type) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="110" align="center">
            <template #default="{ row }"><status-tag :value="row.status" domain="common" /></template>
          </el-table-column>
          <el-table-column label="商品状态" min-width="125" align="center">
            <template #default="{ row }"><status-tag :value="row.product_status" domain="product" /></template>
          </el-table-column>
          <el-table-column prop="applicant_name" label="申请人" min-width="110" />
          <el-table-column label="等待时间" min-width="120">
            <template #default="{ row }">
              <span :class="{ overdue: row.status === 'pending' && row.wait_hours >= 24 }">{{ row.wait_hours }}h</span>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" min-width="150" align="right">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button link type="success" :loading="actingId === row.approval_id" @click="approve(row)">通过</el-button>
                <el-button link type="danger" :loading="actingId === row.approval_id" @click="reject(row)">驳回</el-button>
              </template>
              <span v-else class="processed">已处理</span>
            </template>
          </el-table-column>
          <template #empty><empty-state title="暂无审批记录" description="切换状态或等待运营提交新的商品上架审批。" /></template>
        </el-table>
    </div>
  </OpsListPageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { approvalApi } from '../api/approval-api.js'
import { workbenchApi } from '../api/workbench-api.js'
import OpsListPageShell from '../common/ops/OpsListPageShell.vue'
import EmptyState from '../common/empty-state.vue'
import StatusTag from '../common/status-tag.vue'
import { approvalRefTypeLabel } from '../common/business-options-dict.js'
import { useDashboardNav } from '../common/use-dashboard-nav.js'
import { useListPage } from '../common/use-list-page.js'
import { formatDateTime } from '../common/format.js'

const { go, productListPath } = useDashboardNav()

const loading = ref(false)
const actingId = ref('')
const summary = ref({})
const status = ref('pending')
const keyword = ref('')
const productStatus = ref('')

const {
  list,
  listLoading,
  listError,
  currentPage: page,
  pageSize: size,
  total,
  search,
  load: loadList,
  onPageSizeChange,
  onPageChange,
} = useListPage({
  fetchPage: ({ page: current, pageSize, query }) => approvalApi.todoList({ ...query, page: current, size: pageSize }),
  buildQuery: () => ({
    status: status.value,
    keyword: keyword.value,
    product_status: productStatus.value,
  }),
})
const statusOptions = [
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '全部', value: 'all' },
]
const productStatusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pending_review' },
  { label: '在售', value: 'on_sale' },
  { label: '下架', value: 'off_sale' },
]
const statusIndex = computed(() => Math.max(0, statusOptions.findIndex((item) => item.value === status.value)))
const statusOffset = computed(() => `${statusIndex.value * 100}%`)
const longestWait = computed(() => Math.max(0, ...list.value.filter((row) => row.status === 'pending').map((row) => row.wait_hours || 0)))

function refTypeLabel(type) { return approvalRefTypeLabel(type) }
function goProducts() {
  go(productListPath({ status: 'pending_review' }))
}
function applyKeyword() { return search() }
function onStatusChange() { return search() }
function resetFilters() {
  status.value = 'pending'
  keyword.value = ''
  productStatus.value = ''
  return search()
}

async function loadData() {
  loading.value = true
  try {
    const [opsRes] = await Promise.all([
      workbenchApi.ops(),
      loadList(),
    ])
    summary.value = opsRes?.data?.approvalSummary || {}
  } finally {
    loading.value = false
  }
}

async function approve(row) {
  await ElMessageBox.confirm(`确认通过「${row.product_name || row.title}」？通过后商品将自动上架。`, '审批确认', {
    confirmButtonText: '通过审批', cancelButtonText: '取消', type: 'success',
  })
  actingId.value = row.approval_id
  try {
    const res = await approvalApi.approve({ approval_id: row.approval_id, remark: '审批通过' })
    if (res?.success) { ElMessage.success('审批已通过'); await loadData() }
  } finally { actingId.value = '' }
}

async function reject(row) {
  const { value } = await ElMessageBox.prompt('请输入驳回原因，运营可根据原因修改后重新提交。', '驳回审批', {
    confirmButtonText: '确认驳回', cancelButtonText: '取消', inputValue: '商品资料或上架条件不完整',
    inputValidator: (v) => Boolean(String(v || '').trim()) || '请输入驳回原因',
  })
  actingId.value = row.approval_id
  try {
    const res = await approvalApi.reject({ approval_id: row.approval_id, remark: value })
    if (res?.success) { ElMessage.success('审批已驳回'); await loadData() }
  } finally { actingId.value = '' }
}

onMounted(loadData)
</script>

<style lang="less" scoped>
.approval-filter-main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 14px;
}

.approval-status-tabs {
  --active-offset: 0%;
  flex: 0 0 auto;
  position: relative;
  display: inline-grid;
  grid-template-columns: repeat(4, minmax(70px, 1fr));
  width: 320px;
  padding: 3px;
  border: 1px solid #dfe7f1;
  border-radius: 14px;
  background: #f8fafc;
  isolation: isolate;

  &::before {
    position: absolute;
    z-index: 0;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc((100% - 6px) / 4);
    border-radius: 10px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    box-shadow: 0 5px 12px rgba(37, 99, 235, 0.2);
    content: '';
    transform: translateX(var(--active-offset));
    transition:
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.2s ease;
    will-change: transform;
  }

  :deep(.el-radio-button) {
    z-index: 1;
    width: 100%;
  }

  :deep(.el-radio-button__inner) {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 7px 14px;
    border: 0;
    border-radius: 10px !important;
    background: transparent;
    color: #64748b;
    font-weight: 680;
    line-height: 20px;
    box-shadow: none;
    transition:
      color 0.2s ease,
      transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }

  :deep(.el-radio-button:not(.is-active) .el-radio-button__inner:hover) {
    color: #2563eb;
    transform: translateY(-1px);
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    border-color: transparent;
    background: transparent;
    color: #fff;
    box-shadow: none;
  }
}

.approval-search-fields {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(160px, 210px);
  align-items: center;
  gap: 12px;
  min-width: 0;

  :deep(.el-input),
  :deep(.el-select) {
    width: 100%;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    min-height: 38px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 0 0 1px #dfe7f1 inset;
    transition: box-shadow 0.18s ease, background 0.18s ease;
  }

  :deep(.el-input__wrapper:hover),
  :deep(.el-select__wrapper:hover) {
    box-shadow: 0 0 0 1px #bfdbfe inset;
  }

  :deep(.el-input__wrapper.is-focus),
  :deep(.el-select__wrapper.is-focused) {
    box-shadow: 0 0 0 1px #3b82f6 inset, 0 0 0 3px rgba(59, 130, 246, 0.12);
  }
}

.approval-filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;

  :deep(.el-button) {
    min-width: 76px;
    height: 38px;
    padding: 0 18px;
    border-radius: 12px;
    font-weight: 700;
  }

  :deep(.el-button--primary) {
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.16);
  }
}

.approval-list-panel {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;

  &.is-switching {
    opacity: 0.72;
    transform: translateY(3px);
  }
}

.primary-cell strong, .primary-cell span { display: block; }
.primary-cell strong { color: #1e293b; font-size: 13px; }
.primary-cell span { margin-top: 4px; color: #94a3b8; font-size: 11px; }
.overdue { color: #dc2626; font-weight: 700; }
.processed { color: #94a3b8; font-size: 12px; }

@media (max-width: 1280px) {
  .approval-filter-main {
    flex-wrap: wrap;
  }

  .approval-search-fields {
    flex: 1 1 420px;
  }
}

@media (max-width: 900px) {
  .approval-filter-main,
  .approval-search-fields,
  .approval-filter-actions {
    width: 100%;
  }

  .approval-search-fields {
    grid-template-columns: 1fr;
  }

  .approval-status-tabs {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .approval-status-tabs::before,
  .approval-status-tabs :deep(.el-radio-button__inner),
  .approval-list-panel {
    transition: none;
  }
}
</style>
