<template>
  <div v-loading="loading" class="ops-page ops-console">
    <header class="ops-page-head">
      <div>
        <h1>运营总览</h1>
        <p>以今日待办为入口，串联销售、客户、活动、库存与履约。指标均来自当前业务数据，可直接进入对应工作台处理。</p>
      </div>
      <div class="ops-head-actions">
        <span class="updated-at">数据更新 {{ updatedAt }}</span>
        <el-button type="primary" :loading="loading" @click="loadOps">刷新数据</el-button>
      </div>
    </header>

    <OpsMetricGrid>
      <button
        v-for="item in coreMetrics"
        :key="item.key"
        type="button"
        class="ops-metric"
        :class="item.tone"
        @click="handleMetric(item)"
      >
        <span class="ops-metric-label">{{ item.label }} <em>{{ item.badge }}</em></span>
        <strong class="ops-metric-value">{{ item.value }}</strong>
        <span class="ops-metric-hint">{{ item.hint }}</span>
      </button>
    </OpsMetricGrid>

    <div class="ops-grid-main">
      <section class="ops-panel trend-panel">
        <div class="ops-panel-head">
          <h2>近 7 天经营趋势</h2>
          <span>{{ trendSummary.orders }} 单 · ¥{{ formatMoney(trendSummary.gmv) }}</span>
        </div>
        <TrendChart :trend="data.trend || []" class="ops-trend-chart" />
      </section>

      <section class="ops-panel action-panel">
        <div class="ops-panel-head">
          <h2>今日优先处理</h2>
          <span>按风险与业务阻塞排序</span>
        </div>
        <ActionQueue :items="actionQueue" @select="(item) => go(item.path)" />
      </section>
    </div>

    <section class="ops-panel ops-section-space">
      <div class="ops-panel-head">
        <h2>订单履约链路</h2>
        <span>点击节点进入对应订单队列</span>
      </div>
      <div class="pipeline">
        <button
          v-for="(step, index) in funnelSteps"
          :key="step.key"
          type="button"
          class="pipeline-step"
          @click="go(step.path)"
        >
          <span class="pipeline-index">{{ index + 1 }}</span>
          <strong>{{ step.value }}</strong>
          <small>{{ step.label }}</small>
          <i v-if="index < funnelSteps.length - 1" />
        </button>
      </div>
    </section>

    <div class="ops-grid-2">
      <section class="ops-panel channel-panel">
        <div class="ops-panel-head">
          <h2>渠道销售贡献</h2>
          <span>按已支付订单收入</span>
        </div>
        <ChannelShareChart :stores="topStores" />
      </section>

      <section class="ops-panel">
        <div class="ops-panel-head">
          <h2>热销商品</h2>
          <span>销量与销售额</span>
        </div>
        <ProductRankList :items="topProducts" />
      </section>
    </div>

    <div class="ops-grid-3">
      <section class="ops-panel compact-panel">
        <div class="ops-panel-head">
          <h2>仓储健康</h2>
          <button class="text-link" type="button" @click="go(warehousePath('stock_list', { risk: 'abnormal' }))">查看库存异常</button>
        </div>
        <MiniMetricPanel :items="warehouseMetrics" />
      </section>

      <section class="ops-panel compact-panel">
        <div class="ops-panel-head">
          <h2>客户结构</h2>
          <button class="text-link" type="button" @click="go(opsPath('customer_list'))">客户中心</button>
        </div>
        <MiniMetricPanel :items="customerMetrics" />
      </section>

      <section class="ops-panel compact-panel">
        <div class="ops-panel-head">
          <h2>活动与审批</h2>
          <button class="text-link" type="button" @click="go(opsPath('marketing_activities'))">营销中心</button>
        </div>
        <MiniMetricPanel :items="marketingApprovalMetrics" />
      </section>
    </div>

    <div class="ops-grid-2">
      <section class="ops-panel">
        <div class="ops-panel-head">
          <h2>近期订单</h2>
          <button class="text-link" type="button" @click="go(fulfillmentPath('all'))">查看全部</button>
        </div>
        <div class="ops-table-wrap">
          <el-table :data="recentOrders" size="small">
            <el-table-column prop="order_no" label="订单号" min-width="160" show-overflow-tooltip />
            <el-table-column prop="store_name" label="渠道" min-width="130" show-overflow-tooltip />
            <el-table-column label="状态" min-width="100" align="center">
              <template #default="{ row }"><status-tag :value="row.status" domain="order" /></template>
            </el-table-column>
            <el-table-column label="金额" min-width="120" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="ops-panel">
        <div class="ops-panel-head">
          <h2>业务动态</h2>
          <button class="text-link" type="button" @click="go(opsPath('audit_log'))">审计日志</button>
        </div>
        <AuditFeed :items="auditFeedItems" />
      </section>
    </div>

    <TaskBreakdownDrawer
      v-model:visible="taskDrawerVisible"
      :items="taskBreakdown"
      :pending-count="formatNumber(service.pendingTaskCount)"
      @select="goTask"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { workbenchApi } from '../api/workbench-api.js'
import StatusTag from '../common/status-tag.vue'
import TrendChart from '../overview/trend-chart.vue'
import ChannelShareChart from '../overview/channel-share-chart.vue'
import ActionQueue from '../common/ops/ActionQueue.vue'
import AuditFeed from '../common/ops/AuditFeed.vue'
import OpsMetricGrid from '../common/ops/OpsMetricGrid.vue'
import ProductRankList from './ProductRankList.vue'
import MiniMetricPanel from './MiniMetricPanel.vue'
import TaskBreakdownDrawer from './TaskBreakdownDrawer.vue'
import { buildOpsActionQueue, buildOrderFunnelMetrics } from '../common/dashboard-metric-builder.js'
import {
  buildOpsCoreMetrics,
  buildOpsTaskBreakdown,
  buildOpsAuditFeedItems,
  buildWarehouseMiniMetrics,
  buildCustomerMiniMetrics,
  buildMarketingApprovalMetrics,
} from '../common/ops-metric-builder.js'
import { formatMoney, formatNumber } from '../common/format.js'
import { useDashboardNav } from '../common/use-dashboard-nav.js'

const loading = ref(true)
const data = ref({})
const updatedAt = ref('—')
const taskDrawerVisible = ref(false)
const { go, opsPath, warehousePath, fulfillmentPath, marketingPath } = useDashboardNav()

const service = computed(() => data.value.serviceMetrics || {})
const warehouse = computed(() => data.value.warehouseSnapshot || {})
const stockIssueCount = computed(() => (warehouse.value.riskSkuCount || 0) + (warehouse.value.outOfStockSkuCount || 0))
const locationRisk = computed(() => data.value.locationRiskSummary || {})
const customerSummary = computed(() => data.value.customerSummary || {})
const marketingSummary = computed(() => data.value.marketingSummary || {})
const approvalSummary = computed(() => data.value.approvalSummary || {})
const topStores = computed(() => data.value.topStores || [])
const topProducts = computed(() => data.value.topProducts || [])
const recentOrders = computed(() => data.value.recentOrders || [])
const recentAuditLogs = computed(() => data.value.recentAuditLogs || [])

const trendSummary = computed(() => (data.value.trend || []).reduce((sum, row) => ({
  orders: sum.orders + Number(row.orderCount || 0),
  gmv: sum.gmv + Number(row.gmv || 0),
}), { orders: 0, gmv: 0 }))

const coreMetrics = computed(() => buildOpsCoreMetrics({
  data: data.value,
  service: service.value,
  approvalSummary: approvalSummary.value,
  stockIssueCount: stockIssueCount.value,
  paths: {
    todayPaidLifecycle: fulfillmentPath('paid_lifecycle', { scope: 'today' }),
    paidLifecycle: fulfillmentPath('paid_lifecycle'),
    fulfillmentActive: fulfillmentPath('active'),
  },
}))

const taskBreakdown = computed(() => buildOpsTaskBreakdown({
  orderFunnel: data.value.orderFunnel || {},
  approvalSummary: approvalSummary.value,
  warehouse: warehouse.value,
  paths: {
    approval: opsPath('approval_todo'),
    stockRisk: warehousePath('stock_list', { risk: 'low' }),
    stockOut: warehousePath('stock_list', { risk: 'out_of_stock' }),
    allocated: fulfillmentPath('allocated'),
    awaitPick: fulfillmentPath('await_pick'),
    picking: fulfillmentPath('picking'),
    awaitOutbound: fulfillmentPath('await_outbound'),
  },
}))

const auditFeedItems = computed(() => buildOpsAuditFeedItems(recentAuditLogs.value))

const warehouseMetrics = computed(() => buildWarehouseMiniMetrics({
  warehouse: warehouse.value,
  locationRisk: locationRisk.value,
}))

const customerMetrics = computed(() => buildCustomerMiniMetrics({
  data: data.value,
  customerSummary: customerSummary.value,
}))

const marketingApprovalMetrics = computed(() => buildMarketingApprovalMetrics({
  marketingSummary: marketingSummary.value,
  approvalSummary: approvalSummary.value,
}))

const funnelSteps = computed(() => buildOrderFunnelMetrics(data.value.orderFunnel, {
  pending_payment: fulfillmentPath('pending_payment'),
  paid: fulfillmentPath('paid'),
  allocated: fulfillmentPath('allocated'),
  await_pick: fulfillmentPath('await_pick'),
  picking: fulfillmentPath('picking'),
  await_outbound: fulfillmentPath('await_outbound'),
  shipped: fulfillmentPath('shipped'),
}).map((item) => ({ ...item, path: item.path })))

const actionQueue = computed(() => buildOpsActionQueue({
  approvalSummary: approvalSummary.value,
  warehouse: warehouse.value,
  orderFunnel: data.value.orderFunnel || {},
  marketingSummary: marketingSummary.value,
  paths: {
    approval: opsPath('approval_todo'),
    stock: warehousePath('stock_list', { risk: 'abnormal' }),
    fulfillmentActive: fulfillmentPath('active'),
    marketingEndingSoon: marketingPath('ending_soon'),
  },
}))

function goTask(path) {
  taskDrawerVisible.value = false
  go(path)
}
function handleMetric(item) {
  if (item.action === 'task-breakdown') {
    taskDrawerVisible.value = true
    return
  }
  go(item.path)
}

async function loadOps() {
  loading.value = true
  try {
    const res = await workbenchApi.ops()
    if (res && res.success) {
      data.value = res.data || {}
      updatedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadOps)
</script>

<style lang="less" scoped>
.updated-at { color: #94a3b8; font-size: 11px; }
.ops-grid-main {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(300px, .75fr);
  gap: 14px;
  margin-bottom: 14px;
}
.trend-panel {
  :deep(.ops-trend-chart.trend-chart-echarts),
  :deep(.trend-chart-echarts) {
    height: 268px;
  }
}
.pipeline { display: grid; grid-template-columns: repeat(7, minmax(105px, 1fr)); gap: 0; padding: 16px; overflow-x: auto; }
.pipeline-step {
  position: relative; min-width: 105px; padding: 12px 10px; border: 0; background: transparent;
  cursor: pointer; text-align: center;
  strong, small { display: block; }
  strong { margin-top: 7px; color: #2563eb; font-size: 23px; }
  small { margin-top: 4px; color: #64748b; font-size: 11px; }
  i { position: absolute; top: 22px; right: -14px; width: 28px; height: 1px; background: #cbd5e1; }
}
.pipeline-index {
  display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px;
  border-radius: 999px; background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 800;
}
.compact-panel { min-height: 185px; }
.text-link { padding: 0; border: 0; background: transparent; color: #2563eb; cursor: pointer; font-size: 11px; }
@media (max-width: 1080px) {
  .ops-grid-main { grid-template-columns: 1fr; }
  .pipeline { grid-template-columns: repeat(7, 110px); }
}
</style>
