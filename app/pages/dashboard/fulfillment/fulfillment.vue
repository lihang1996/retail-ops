<template>
  <div v-loading="loading" class="fulfillment-page biz-page biz-page-fluid">
    <p class="page-desc">
      订单支付 → 分仓 → 生成发货单 → 拣货 → 出库，在此一站式处理履约全流程
    </p>

    <FulfillmentStats
      :cards="statCards"
      :active-tab="activeTab"
      @select="setTab"
    />

    <section class="workbench-panel">
      <FulfillmentFilterBar
        ref="filterBarRef"
        v-model:search-order-no="searchOrderNo"
        v-model:search-keyword="searchKeyword"
        v-model:search-shipment-no="searchShipmentNo"
        v-model:search-warehouse-name="searchWarehouseName"
        v-model:active-tab="activeTab"
        :loading="loading"
        :importing="importing"
        :total="total"
        :date-scope="dateScope"
        :import-result="importResult"
        :tabs="FULFILLMENT_TABS"
        @search="onSearch"
        @reset="resetSearch"
        @refresh="loadWorkbench"
        @import="triggerImport"
        @file-input="handleFileInput"
        @clear-date-scope="clearDateScope"
        @clear-import-result="clearImportResult"
        @tab-change="onTabChange"
      />

      <FulfillmentTable
        :loading="loading"
        :rows="rows"
        :total="total"
        :page="page"
        :page-size="pageSize"
        :active-tab="activeTab"
        :empty-title="emptyTitle"
        :empty-description="emptyDescription"
        :get-action-split="getActionSplit"
        :is-action-loading="isActionLoading"
        :action-loading-label="actionLoadingLabel"
        :run-more-action="runMoreAction"
        @row-click="openDetail"
        @import="triggerImport"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      />
    </section>

    <OrderDetailDrawer
      v-model:visible="drawerVisible"
      :title="drawerTitle"
      :loading="detailLoading"
      :detail="detail"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import FulfillmentStats from './FulfillmentStats.vue'
import FulfillmentFilterBar from './FulfillmentFilterBar.vue'
import FulfillmentTable from './FulfillmentTable.vue'
import OrderDetailDrawer from './OrderDetailDrawer.vue'
import { FULFILLMENT_TABS, useFulfillmentWorkbench } from './use-fulfillment-workbench.js'
import { useFulfillmentActions } from './use-fulfillment-actions.js'
import { useOrderImport } from './use-order-import.js'

const filterBarRef = ref(null)

const {
  activeTab,
  dateScope,
  searchOrderNo,
  searchKeyword,
  searchShipmentNo,
  searchWarehouseName,
  loading,
  rows,
  total,
  page,
  pageSize,
  statCards,
  emptyTitle,
  emptyDescription,
  loadWorkbench,
  onTabChange,
  onSearch,
  resetSearch,
  onPageChange,
  onPageSizeChange,
  clearDateScope,
  setTab,
} = useFulfillmentWorkbench()

const {
  drawerVisible,
  drawerTitle,
  detailLoading,
  detail,
  getActionSplit,
  isActionLoading,
  actionLoadingLabel,
  runMoreAction,
  openDetail,
  toast,
} = useFulfillmentActions({ loadWorkbench })

const {
  importing,
  importResult,
  onFileInput,
  clearImportResult,
} = useOrderImport({ loadWorkbench })

function triggerImport() {
  filterBarRef.value && filterBarRef.value.triggerImport()
}

async function handleFileInput(event) {
  await onFileInput(event, { activeTab, page })
}

onMounted(loadWorkbench)
</script>

<style lang="less" scoped>
.fulfillment-page {
  box-sizing: border-box;
  width: 100%;
  padding-top: 8px;
}

.page-desc {
  margin: 0 0 16px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
  max-width: 960px;
}

.workbench-panel {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
</style>
