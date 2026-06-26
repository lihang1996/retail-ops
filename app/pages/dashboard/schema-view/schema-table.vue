<template>
  <div class="schema-table" :class="{ 'schema-table--compact': !enableFixedColumns }">
    <div ref="tableScrollRef" class="table-scroll">
      <el-table
        v-if="columns.length"
        ref="tableRef"
        v-loading="loading"
        element-loading-text="查询中..."
        element-loading-background="rgba(255, 255, 255, 0.72)"
        :data="tableData"
        class="table"
        fit
        style="width: 100%"
      >
        <template #empty>
          <empty-state title="暂无数据" description="可调整筛选条件，或通过上方按钮新增一条数据。" />
        </template>
        <el-table-column
          v-for="column in columns"
          :key="column.key"
          :prop="column.key"
          :label="column.schema.label"
          v-bind="column.option"
        >
          <template #default="{ row }">
            <status-tag
              v-if="isStatusColumn(column.key)"
              :value="row[column.key]"
              :domain="statusDomain(column.key)"
            />
            <el-tooltip
              v-else
              :disabled="!shouldShowCellTooltip(row[column.key])"
              :show-after="260"
              :hide-after="0"
              placement="top"
              effect="light"
              popper-class="schema-cell-tooltip"
              teleported
            >
              <template #content>
                <div class="schema-cell-tooltip-content">
                  {{ formatCellValue(row[column.key], column.key, column.option) }}
                </div>
              </template>
              <span
                class="cell-value"
                :aria-label="formatCellValue(row[column.key], column.key, column.option)"
              >
                {{ formatCellValue(row[column.key], column.key, column.option) }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column
          v-if="buttons?.length"
          label="操作"
          :fixed="enableFixedColumns ? 'right' : false"
          align="left"
          :width="operationWidth"
          :show-overflow-tooltip="false"
          class-name="col-ops"
        >
          <template #default="scope">
            <div class="ops-actions">
              <button
                v-for="item in buttons"
                :key="`${item.eventKey}-${item.label}`"
                type="button"
                class="ops-link"
                :class="{ danger: item.type === 'danger' }"
                @click="operationHandler({ btnConfig: item, rowData: scope.row })"
              >
                {{ item.label }}
              </button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="total > 0" class="pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="sizes, prev, pager, next, jumper"
        @size-change="onPageSizeChange"
        @current-change="onCurrentPageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, toRefs, watch } from 'vue'
import StatusTag from '../common/status-tag.vue'
import EmptyState from '../common/empty-state.vue'
import { apiList, parseListResponse } from '../api/http.js'
import { useRemoteTable, cleanQueryParams } from '../common/use-remote-table.js'
import {
  buildSchemaColumns,
  formatCellValue,
  isStatusColumn,
  resolveOperationWidth,
  shouldEnableFixedColumns,
  shouldShowCellTooltip,
  statusDomain,
} from './schema-table-utils.js'

const props = defineProps({
  schema: Object,
  api: String,
  apiParams: Object,
  buttons: Array,
})
const { schema, api, buttons, apiParams } = toRefs(props)
const emit = defineEmits(['operate', 'total-change', 'loading-change'])

const operationWidth = computed(() => resolveOperationWidth(buttons.value ?? []))

/** 列多 / 总宽超出时才固定首尾列，避免店铺等窄表出现无意义阴影和滚动条 */
const enableFixedColumns = computed(() => shouldEnableFixedColumns(schema.value, operationWidth.value))

const columns = computed(() => buildSchemaColumns(schema.value, {
  enableFixedColumns: enableFixedColumns.value,
}))

const tableScrollRef = ref(null)
const tableRef = ref(null)

const {
  loading,
  rows: tableData,
  currentPage,
  pageSize,
  total,
  load: loadTableData,
  onPageChange: onCurrentPageChange,
  onPageSizeChange,
  showLoading: showTableLoading,
  hideLoading: hideTableLoading,
} = useRemoteTable({
  initialPageSize: 20,
  fetchPage: async ({ page, pageSize: size }) => {
    if (!api.value) return { rows: [], total: 0 }

    const res = await apiList(api.value, {
      page,
      size,
      ...cleanQueryParams(apiParams.value ?? {}),
    })
    const parsed = parseListResponse(res)
    if (!parsed.ok) throw new Error(parsed.message)
    return { rows: parsed.rows.map((item) => ({ ...item })), total: parsed.total }
  },
})

const initData = async () => {
  currentPage.value = 1
  await nextTick()
  return loadTableData()
}

const operationHandler = ({ btnConfig, rowData }) => emit('operate', { btnConfig, rowData })

onMounted(initData)
watch([schema, api, apiParams], initData, { deep: true })
watch(total, (value) => {
  emit('total-change', value)
}, { immediate: true })
watch(loading, (value) => {
  emit('loading-change', value)
}, { immediate: true })

defineExpose({ initData, loadTableData, showLoading: showTableLoading, hideLoading: hideTableLoading })
</script>

<style lang="less" scoped>
.schema-table {
  width: 100%;
  min-width: 0;
  overflow: visible;
  background: transparent;

  .table-scroll {
    width: 100%;
    overflow: hidden;
    background: #fff;
  }

  &.schema-table--compact {
    :deep(.el-table__body-wrapper) {
      overflow-x: hidden !important;
    }
  }

  /* 仅隐藏水平滚动条轨道，不能隐藏 el-scrollbar__wrap（那是表格 body 容器） */
  :deep(.el-scrollbar__bar.is-horizontal) {
    display: none !important;
    height: 0 !important;
    opacity: 0 !important;
  }

  :deep(.el-scrollbar__view) {
    width: 100% !important;
  }

  .table {
    width: 100%;
  }

  .cell-value {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
  }

  .pagination {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    margin: 0 !important;
    padding: 4px 0 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;

    :deep(.el-pagination) {
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
    }
  }
}

:deep(.el-table th.el-table__cell .cell) {
  white-space: nowrap;
}

:deep(.el-table th.el-table__cell),
:deep(.el-table td.el-table__cell) {
  padding: 8px;
}

:deep(.el-table-fixed-column--left::before),
:deep(.el-table-fixed-column--right::before),
:deep(.el-table-fixed-column--left::after),
:deep(.el-table-fixed-column--right::after) {
  display: none !important;
  content: none !important;
  box-shadow: none !important;
  background: none !important;
  width: 0 !important;
}

:deep(.el-table-fixed-column--left),
:deep(.el-table-fixed-column--right) {
  background: #fff !important;
}

:deep(.el-table__body tr:hover > .el-table-fixed-column--left),
:deep(.el-table__body tr:hover > .el-table-fixed-column--right) {
  background: #f7fbff !important;
}

:deep(.col-id .cell) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.col-status.el-table__cell),
:deep(.col-status .cell) {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: nowrap !important;
}

:deep(.col-status .cell) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.col-status .biz-status-tag) {
  max-width: none;
  vertical-align: middle;
}

:deep(.col-ops .cell) {
  overflow: visible !important;
  text-overflow: clip !important;
  white-space: nowrap !important;
  padding-left: 8px !important;
  padding-right: 8px !important;
}

.ops-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: nowrap;
}

.ops-link {
  border: none;
  background: none;
  padding: 0;
  color: var(--color-primary-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: var(--color-primary-700);
    text-decoration: underline;
  }

  &.danger {
    color: var(--color-error-600);

    &:hover {
      color: var(--color-error-700);
    }
  }
}

:deep(.el-table__inner-wrapper::before),
:deep(.el-table__inner-wrapper::after) {
  display: none !important;
  content: none !important;
  box-shadow: none !important;
  background: none !important;
}

:deep(.el-table__inner-wrapper),
:deep(.el-table__header-wrapper),
:deep(.el-table__body-wrapper) {
  width: 100%;
}

:deep(.el-table__body-wrapper) {
  overflow-x: hidden !important;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
}

:deep(.el-table .el-scrollbar__bar.is-horizontal) {
  display: none !important;
  height: 0 !important;
}

:deep(.el-table__fixed-right-patch) {
  display: none !important;
  width: 0 !important;
}

:deep(.el-table__empty-block) {
  min-height: 160px;
}

:global(.schema-cell-tooltip) {
  max-width: 520px;
}

:global(.schema-cell-tooltip .schema-cell-tooltip-content) {
  max-width: 500px;
  line-height: 1.55;
  white-space: normal;
  word-break: break-all;
}

@media (max-width: 1080px) {
  .schema-table .table-scroll {
    overflow-x: auto;
  }
}
</style>
