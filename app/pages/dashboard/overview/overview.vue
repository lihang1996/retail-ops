<template>
  <div v-loading="loading" class="overview-page">
    <h2 class="page-title">经营总览</h2>

    <el-row :gutter="16" class="metric-row">
      <el-col v-if="data.visibility?.gmv" :xs="12" :sm="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">GMV（元）</div>
          <div class="metric-value">{{ formatMoney(data.gmv) }}</div>
        </el-card>
      </el-col>
      <el-col v-if="data.visibility?.orderCount" :xs="12" :sm="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">订单量</div>
          <div class="metric-value">{{ data.orderCount ?? '-' }}</div>
        </el-card>
      </el-col>
      <el-col v-if="data.visibility?.stockRisk" :xs="12" :sm="6">
        <el-card shadow="hover" class="metric-card risk">
          <div class="metric-label">库存风险 SKU</div>
          <div class="metric-value">{{ data.stockRiskSkuCount ?? '-' }}</div>
        </el-card>
      </el-col>
      <el-col v-if="data.visibility?.pendingShipment" :xs="12" :sm="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">待处理发货单</div>
          <div class="metric-value">{{ data.pendingShipmentCount ?? '-' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty
      v-if="!hasAnyMetric"
      description="当前角色无可查看的经营指标"
    />

    <el-card v-if="data.visibility?.trend && data.trend?.length" class="trend-card" shadow="never">
      <template #header>近 7 天订单趋势</template>
      <div class="trend-chart">
        <div v-for="item in data.trend" :key="item.date" class="trend-col">
          <div class="bar-wrap">
            <div
              class="bar"
              :style="{ height: barHeight(item.orderCount) + '%' }"
              :title="`${item.date}: ${item.orderCount} 单`"
            />
          </div>
          <div class="trend-count">{{ item.orderCount }}</div>
          <div class="trend-date">{{ formatDate(item.date) }}</div>
        </div>
      </div>
      <div class="trend-gmv">
        <span v-for="item in data.trend" :key="'g' + item.date" class="gmv-item">
          {{ formatDate(item.date) }} GMV ¥{{ formatMoney(item.gmv) }}
        </span>
      </div>
    </el-card>

    <el-row :gutter="16" class="quick-row">
      <el-col :span="8">
        <el-card shadow="hover" class="quick-card" @click="go('/view/dashboard/fulfillment?proj_key=retail')">
          <div class="quick-title">履约中心</div>
          <div class="quick-desc">订单导入、支付、拣货出库</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="quick-card" @click="go('/view/dashboard/warehouse-3d?proj_key=retail&warehouse_id=wh_main')">
          <div class="quick-title">3D 仓库</div>
          <div class="quick-desc">库位风险与拣货路径</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="quick-card" @click="go('/view/dashboard/sider/schema?proj_key=retail&key=product&sider_key=product_item')">
          <div class="quick-title">商品管理</div>
          <div class="quick-desc">店铺、类目、商品建档</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(true)
const data = ref({
  visibility: {},
  trend: [],
})

const hasAnyMetric = computed(() => {
  const v = data.value.visibility || {}
  return v.gmv || v.orderCount || v.stockRisk || v.pendingShipment
})

const maxOrders = computed(() => {
  const counts = (data.value.trend || []).map((t) => t.orderCount || 0)
  return Math.max(...counts, 1)
})

function formatMoney(val) {
  if (val == null) return '-'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : dateStr
}

function barHeight(count) {
  return Math.round(((count || 0) / maxOrders.value) * 100)
}

function go(path) {
  window.location.href = path
}

onMounted(async () => {
  try {
    const res = await $curl({ method: 'get', url: '/api/proj/dashboard/overview' })
    if (res?.success) data.value = res.data || {}
  } finally {
    loading.value = false
  }
})
</script>

<style lang="less" scoped>
.overview-page {
  padding: 20px 24px;
}
.page-title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
}
.metric-row {
  margin-bottom: 20px;
}
.metric-card {
  margin-bottom: 12px;
  .metric-label {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 8px;
  }
  .metric-value {
    font-size: 26px;
    font-weight: 600;
    color: #111827;
  }
  &.risk .metric-value {
    color: #dc2626;
  }
}
.trend-card {
  margin-bottom: 20px;
}
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 160px;
  padding: 0 8px;
}
.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}
.bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.bar {
  width: 70%;
  max-width: 40px;
  min-height: 4px;
  background: linear-gradient(180deg, #3b82f6, #60a5fa);
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
}
.trend-count {
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}
.trend-date {
  font-size: 11px;
  color: #9ca3af;
}
.trend-gmv {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
  font-size: 12px;
  color: #6b7280;
}
.quick-row {
  margin-top: 8px;
}
.quick-card {
  cursor: pointer;
  margin-bottom: 12px;
  transition: border-color 0.2s;
  &:hover {
    border-color: #3b82f6;
  }
  .quick-title {
    font-weight: 600;
    margin-bottom: 6px;
  }
  .quick-desc {
    font-size: 13px;
    color: #6b7280;
  }
}
</style>
