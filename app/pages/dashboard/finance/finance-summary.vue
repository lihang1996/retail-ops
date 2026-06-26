<template>
  <div v-loading="loading" class="ops-page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="演示模块 · 只读"
      description="财务分析为演示只读视图，数据来自订单汇总，不支持凭证录入或对账写操作。"
      class="readonly-banner"
    />
    <header class="ops-page-head">
      <div>
        <h1>财务经营分析</h1>
        <p>从订单收入、退款、客单价、渠道结算和支付方式观察经营质量。当前口径以已支付、已分仓和已发货订单计入收入。</p>
      </div>
      <div class="ops-head-actions"><el-button type="primary" :loading="loading" @click="loadSummary">刷新报表</el-button></div>
    </header>

    <section class="ops-metrics">
      <div class="ops-metric tone-primary">
        <span class="ops-metric-label">订单收入</span>
        <strong class="ops-metric-value">¥{{ formatMoney(data.orderRevenue) }}</strong>
        <span class="ops-metric-hint">{{ data.paidOrderCount || 0 }} 笔有效订单</span>
      </div>
      <div class="ops-metric tone-success">
        <span class="ops-metric-label">净收入</span>
        <strong class="ops-metric-value">¥{{ formatMoney(data.netRevenue) }}</strong>
        <span class="ops-metric-hint">扣除取消订单退款口径</span>
      </div>
      <div class="ops-metric">
        <span class="ops-metric-label">平均客单价</span>
        <strong class="ops-metric-value">¥{{ formatMoney(data.avgOrderValue) }}</strong>
        <span class="ops-metric-hint">今日 ¥{{ formatMoney(data.todayRevenue) }} / {{ data.todayOrderCount || 0 }} 单</span>
      </div>
      <div class="ops-metric" :class="data.refundRate > 10 ? 'tone-danger' : 'tone-warning'">
        <span class="ops-metric-label">退款金额</span>
        <strong class="ops-metric-value">¥{{ formatMoney(data.refundAmount) }}</strong>
        <span class="ops-metric-hint">退款率 {{ data.refundRate || 0 }}% · {{ data.refundOrderCount || 0 }} 笔</span>
      </div>
    </section>

    <div class="ops-grid-2">
      <section class="ops-panel">
        <div class="ops-panel-head">
          <h2>近 7 天收入趋势</h2>
          <span>有效订单 GMV</span>
        </div>
        <TrendChart :trend="data.trend || []" />
      </section>

      <section class="ops-panel">
        <div class="ops-panel-head">
          <h2>支付方式构成</h2>
          <span>成功支付流水</span>
        </div>
        <div class="ops-panel-body">
          <div v-for="row in paymentMethods" :key="row.method" class="ops-progress-row">
            <span class="ops-progress-label">{{ paymentLabel(row.method) }}</span>
            <span class="ops-progress-track">
              <span class="ops-progress-fill payment-fill" :style="{ width: `${row.share}%` }" />
            </span>
            <span class="ops-progress-value">{{ row.share }}%</span>
          </div>
          <empty-state v-if="!paymentMethods.length" title="暂无支付流水" description="订单完成支付后将展示支付方式构成。" />
        </div>
      </section>
    </div>

    <section class="ops-panel">
      <div class="ops-panel-head">
        <h2>渠道结算与收入贡献</h2>
        <span>{{ data.storeSettlement?.length || 0 }} 个有成交渠道</span>
      </div>
      <div class="ops-table-wrap">
        <el-table :data="data.storeSettlement || []" size="small">
          <el-table-column prop="storeName" label="渠道 / 店铺" min-width="220" />
          <el-table-column prop="orderCount" label="有效订单" min-width="120" align="right" />
          <el-table-column label="收入贡献" min-width="240">
            <template #default="{ row }">
              <div class="share-cell">
                <span class="share-track"><span :style="{ width: `${Math.max(row.share || 0, 2)}%` }" /></span>
                <em>{{ row.share || 0 }}%</em>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="结算收入" min-width="150" align="right">
            <template #default="{ row }"><strong class="money">¥{{ formatMoney(row.revenue) }}</strong></template>
          </el-table-column>
          <template #empty><empty-state title="暂无结算数据" description="支付成功的订单会按所属店铺自动汇总。" /></template>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { financeApi } from '../api/finance-api.js'
import { unwrapData } from '../api/http.js'
import EmptyState from '../common/empty-state.vue'
import TrendChart from '../overview/trend-chart.vue'
import { formatMoney } from '../common/format.js'
import { paymentMethodLabel } from '../common/business-options-dict.js'

const loading = ref(false)
const data = ref({})
const paymentMethods = computed(() => {
  const rows = data.value.paymentMethods || []
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
  return rows.map((row) => ({ ...row, share: total > 0 ? Math.round((Number(row.amount) / total) * 1000) / 10 : 0 }))
})

function paymentLabel(value) { return paymentMethodLabel(value) }

async function loadSummary() {
  loading.value = true
  try {
    const res = await financeApi.summary()
    data.value = unwrapData(res, {}) || {}
  } finally { loading.value = false }
}

onMounted(loadSummary)
</script>

<style lang="less" scoped>
.readonly-banner { margin-bottom: 16px; }
:deep(.trend-chart-echarts) { height: 300px; }
.payment-fill { background: linear-gradient(90deg, #34d399, #16a34a); }
.share-cell { display: flex; align-items: center; gap: 10px; }
.share-track { flex: 1; height: 7px; overflow: hidden; border-radius: 999px; background: #eef2f7; }
.share-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #60a5fa, #2563eb); }
.share-cell em { min-width: 46px; color: #64748b; font-size: 11px; font-style: normal; text-align: right; }
.money { color: #0f172a; font-variant-numeric: tabular-nums; }
</style>
