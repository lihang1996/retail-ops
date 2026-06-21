<template>
  <div v-loading="loading" class="finance-page">
    <h2 class="page-title">财务中心</h2>

    <el-row :gutter="16" class="metric-row">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="metric-label">订单收入（元）</div>
          <div class="metric-value">{{ formatMoney(data.orderRevenue) }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="metric-label">退款金额（元）</div>
          <div class="metric-value muted">{{ formatMoney(data.refundAmount) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="table-card">
      <template #header>店铺结算</template>
      <el-table :data="data.storeSettlement || []" size="small" stripe>
        <el-table-column prop="storeName" label="店铺" />
        <el-table-column prop="orderCount" label="订单数" width="100" />
        <el-table-column label="收入（元）" width="140">
          <template #default="{ row }">{{ formatMoney(row.revenue) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
// 财务中心薄模块：订单收入汇总 + 按店铺结算（退款暂为 0）
import { ref, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(false)
const data = ref({ orderRevenue: 0, refundAmount: 0, storeSettlement: [] })

function formatMoney(val) {
  if (val == null) return '-'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadSummary() {
  loading.value = true
  try {
    const res = await $curl({ method: 'get', url: '/api/proj/finance/summary' })
    if (res?.success) data.value = res.data || {}
  } finally {
    loading.value = false
  }
}

onMounted(loadSummary)
</script>

<style lang="less" scoped>
.finance-page { padding: 16px 20px; }
.page-title { margin: 0 0 16px; font-size: 20px; }
.metric-row { margin-bottom: 16px; }
.metric-label { font-size: 13px; color: #909399; }
.metric-value { font-size: 28px; font-weight: bold; margin-top: 8px; }
.metric-value.muted { color: #c0c4cc; }
.table-card { margin-top: 8px; }
</style>
