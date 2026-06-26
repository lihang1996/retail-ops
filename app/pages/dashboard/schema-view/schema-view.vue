<template>
  <div
    class="schema-view-page schema-page"
    :class="{ 'schema-view-page--loading': tableLoading }"
    @keydown.enter.capture="onEnterSearch"
    @keyup.enter.capture="onEnterKeyup"
  >
    <p v-if="pageDesc" class="page-desc">{{ pageDesc }}</p>
    <el-row class="schema-view">
      <search-panel
        v-if="searchSchema?.properties && Object.keys(searchSchema.properties).length > 0"
        @search="onSearch"
        @reset="onReset"
      />
      <table-panel
        ref="tablePanelRef"
        @operate="onTableOperate"
        @loading-change="tableLoading = $event"
      />
      <component
        v-for="(item, key) in components"
        :key="key"
        :is="ComponentConfig[key]?.component"
        ref="comListRef"
        @command="onComponentCommand"
      />
    </el-row>
  </div>
</template>

<script setup>
import { computed, nextTick, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import SearchPanel from '$elpisPages/dashboard/complex-view/schema-view/complex-view/search-panel/search-panel.vue'
import ComponentConfig from '$elpisPages/dashboard/complex-view/schema-view/components/component-config.js'
import { useSchema } from '$elpisPages/dashboard/complex-view/schema-view/hooks/schema.js'
import TablePanel from './table-panel.vue'

const PAGE_DESC = {
  store: '维护全渠道店铺档案，订单与商品上架均按店铺维度归属。',
  category: '管理商品类目树，支撑前台导航与后台检索分类。',
  brand: '维护品牌主数据，商品建档时统一引用，避免重复录入。',
  product_item: '商品主档与 SKU 一览：查看库存、审批与上架状态，支持快速筛选与维护。',
  stock_list: '按仓库与 SKU 查看库存总量、可用量、锁定量和预警状态，可按商品、仓库及风险等级筛选。',
}

const route = useRoute()
const pageDesc = computed(() => PAGE_DESC[route.query.sider_key] || '')

const {
  api,
  tableSchema,
  tableConfig,
  searchSchema,
  searchConfig,
  components,
} = useSchema()

const apiParams = ref({})
const tableLoading = ref(false)
provide('schemaViewData', {
  api,
  tableSchema,
  tableConfig,
  searchSchema,
  searchConfig,
  apiParams,
  components,
})

const tablePanelRef = ref(null)
const comListRef = ref([])

const onSearch = (values) => {
  apiParams.value = { ...values }
}

const onReset = () => {
  apiParams.value = {}
}

let enterSearchTarget = null

const onEnterSearch = (event) => {
  const target = event.target
  const combobox = target?.closest?.('[role="combobox"]')
  if (
    target?.tagName === 'TEXTAREA'
    || target?.isContentEditable
    || target?.closest?.('button')
    || combobox?.getAttribute('aria-expanded') === 'true'
  ) return

  event.preventDefault()
  enterSearchTarget = target
  const container = event.currentTarget
  nextTick(() => {
    container
      ?.querySelector('.schema-search-bar .search-btn')
      ?.click()
  })
}

const onEnterKeyup = (event) => {
  if (!enterSearchTarget || event.target !== enterSearchTarget) return
  event.preventDefault()
  event.stopPropagation()
  enterSearchTarget = null
}

const eventHandlers = {
  showComponent,
}

const onTableOperate = ({ btnConfig, rowData }) => {
  const handler = eventHandlers[btnConfig?.eventKey]
  if (handler) handler({ btnConfig, rowData })
}

function showComponent({ btnConfig, rowData }) {
  const comName = btnConfig?.eventOption?.comName
  if (!comName) return

  const componentRef = comListRef.value.find((item) => item?.name === comName)
  if (typeof componentRef?.show === 'function') componentRef.show(rowData)
}

const onComponentCommand = ({ event } = {}) => {
  if (event === 'loadTableData') tablePanelRef.value?.loadTableData()
}
</script>

<style lang="less" scoped>
.schema-view-page {
  padding: 8px;
  max-width: none;
}

.schema-view {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  width: 100%;
  min-height: 100%;
}

.schema-view-page--loading {
  :deep(.schema-search-bar .search-btn) {
    position: relative;
    pointer-events: none;
    opacity: 0.92;

    &::before {
      content: '';
      width: 14px;
      height: 14px;
      margin-right: 6px;
      border: 2px solid rgba(255, 255, 255, 0.5);
      border-top-color: #fff;
      border-radius: 50%;
      animation: schema-search-spin 0.72s linear infinite;
    }
  }
}

@keyframes schema-search-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
