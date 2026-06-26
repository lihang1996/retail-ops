<template>
  <div v-loading="loading" class="stock-inbound biz-page">
    <section class="inbound-hero">
      <div>
        <p class="eyebrow">Warehouse Operation</p>
        <h1>入库作业</h1>
        <p class="hero-desc">
          将采购、补货或调拨商品入到指定仓库与库位。提交后会同步更新库存汇总、库位库存与库存流水。
        </p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadAll">刷新数据</el-button>
        <el-button type="primary" @click="openCreate">新建入库</el-button>
      </div>
    </section>

    <InboundStats :cards="statCards" />

    <el-alert
      v-if="pageError"
      class="page-alert"
      :title="pageError"
      type="warning"
      show-icon
      :closable="false"
    />

    <InboundLogTable
      :loading="tableLoading"
      :logs="logs"
      :filters="logFilters"
      @update:filters="Object.assign(logFilters, $event)"
      @search="searchInboundLogs"
      @reset="resetInboundLogFilters"
      @reload="loadInboundLogs"
    />

    <InboundDrawer
      v-model:visible="drawerVisible"
      :saving="saving"
      :active-step="activeStep"
      :form="form"
      :line-form="lineForm"
      :lines="lines"
      :warehouses="warehouses"
      :locations="locations"
      :warehouse-error="warehouseError"
      :location-error="locationError"
      :skus="skus"
      :sku-loading="skuLoading"
      :sku-load-failed="skuLoadFailed"
      :sku-error="skuError"
      :selected-warehouse="selectedWarehouse"
      :selected-location="selectedLocation"
      :selected-total-qty="selectedTotalQty"
      @update:form="Object.assign(form, $event)"
      @update:line-form="Object.assign(lineForm, $event)"
      @closed="resetDraft"
      @warehouse-change="onWarehouseChange"
      @add-line="addLine"
      @remove-line="removeLine"
      @submit="submitInbound"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { formatNumber } from '../common/format.js'
import { useWarehouseOptions } from '../common/use-warehouse-options.js'
import { useSkuOptions } from '../common/use-sku-options.js'
import InboundStats from './InboundStats.vue'
import InboundLogTable from './InboundLogTable.vue'
import InboundDrawer from './InboundDrawer.vue'
import { useInboundLogs } from './use-inbound-logs.js'
import { useInboundDraft } from './use-inbound-draft.js'

const loading = ref(false)

const {
  warehouses,
  locations,
  warehouseError,
  locationError,
  loadWarehouses,
  loadLocations,
} = useWarehouseOptions()

const {
  skus,
  skuLoading,
  skuLoadFailed,
  skuError,
  loadSkus,
  findSku,
} = useSkuOptions()

const {
  tableLoading,
  pageError,
  logs,
  logFilters,
  loadInboundLogs,
  searchInboundLogs,
  resetInboundLogFilters,
} = useInboundLogs()

const {
  saving,
  drawerVisible,
  lines,
  form,
  lineForm,
  activeStep,
  selectedWarehouse,
  selectedLocation,
  selectedTotalQty,
  onWarehouseChange,
  addLine,
  removeLine,
  resetDraft,
  submitInbound,
} = useInboundDraft({
  warehouses,
  locations,
  findSku,
  loadLocations,
  loadInboundLogs,
})

const recentInboundQty = computed(() => (
  logs.value.reduce((sum, row) => sum + Math.abs(Number(row.qty_change || 0)), 0)
))

const statCards = computed(() => [
  { key: 'logs', label: '最近入库记录', value: logs.value.length, hint: '来自库存流水', tone: 'info' },
  { key: 'qty', label: '最近入库件数', value: formatNumber(recentInboundQty.value), hint: '按当前记录汇总', tone: 'success' },
  { key: 'warehouses', label: '可选仓库', value: warehouses.value.length, hint: '仓储基础资料', tone: 'primary' },
  { key: 'skus', label: '可选 SKU', value: skus.value.length, hint: '商品档案联动', tone: 'warning' },
])

async function loadAll() {
  loading.value = true
  try {
    const firstId = await loadWarehouses({ autoSelectFirst: true, selectedId: form.warehouse_id })
    if (firstId) form.warehouse_id = firstId
    await Promise.allSettled([loadSkus(), loadInboundLogs()])
    if (form.warehouse_id) {
      form.location_id = await loadLocations(form.warehouse_id, { currentLocationId: form.location_id })
    }
  } finally {
    loading.value = false
  }
}

async function openCreate() {
  drawerVisible.value = true
  if (!warehouses.value.length) {
    const firstId = await loadWarehouses({ autoSelectFirst: true })
    if (firstId) form.warehouse_id = firstId
  }
  if (!skus.value.length && !skuLoadFailed.value) await loadSkus()
}

onMounted(loadAll)
</script>

<style lang="less" scoped>
.stock-inbound {
  max-width: none;
  padding: 16px 18px 28px;

  .inbound-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 24px;
    border: 1px solid var(--app-border);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  }

  .eyebrow {
    margin: 0 0 6px;
    color: var(--color-primary-600);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 { margin: 0; color: var(--color-gray-900); font-size: 26px; font-weight: 750; }
  .hero-desc { margin-top: 8px; color: var(--color-gray-500); font-size: 14px; line-height: 1.7; }
  .hero-actions { display: flex; flex-shrink: 0; gap: 10px; }
  .page-alert { margin-bottom: 14px; }

  :deep(.inbound-table-card) {
    border: 1px solid var(--app-border);
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04) !important;
  }
}

@media (max-width: 768px) {
  .stock-inbound {
    padding: 12px;
    .inbound-hero { align-items: flex-start; flex-direction: column; }
    .hero-actions { width: 100%; .el-button { flex: 1; } }
  }
}
</style>
