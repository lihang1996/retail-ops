<template>
  <el-card class="table-panel" shadow="never">
    <div
      v-if="tableConfig?.headerButtons?.length || recordLoaded"
      class="operation-panel"
    >
      <span v-if="recordLoaded" class="panel-meta">共 {{ recordTotal }} 条</span>
      <div v-if="tableConfig?.headerButtons?.length" class="operation-actions">
        <el-button
          v-for="item in tableConfig.headerButtons"
          :key="`${item.eventKey}-${item.label}`"
          v-bind="normalizeBtn(item)"
          @click="operationHandler({ btnConfig: item })"
        >
          {{ item.label }}
        </el-button>
      </div>
    </div>

    <schema-table
      ref="schemaTableRef"
      :schema="tableSchema"
      :api="api"
      :api-params="apiParams"
      :buttons="tableConfig?.rowButtons ?? []"
      @operate="operationHandler"
      @total-change="onTotalChange"
      @loading-change="emit('loading-change', $event)"
    />
  </el-card>
</template>

<script setup>
import { inject, ref } from 'vue'
import { ElMessageBox, ElNotification } from 'element-plus'
import $curl from '$elpisCommon/curl.js'
import SchemaTable from './schema-table.vue'

const emit = defineEmits(['operate', 'loading-change'])
const { api, apiParams, tableSchema, tableConfig } = inject('schemaViewData')
const schemaTableRef = ref(null)
const recordTotal = ref(0)
const recordLoaded = ref(false)

function onTotalChange(total) {
  recordTotal.value = Number(total) || 0
  recordLoaded.value = true
}

function normalizeBtn(item) {
  const { plain, ...rest } = item
  if (rest.type === 'primary' && plain === undefined) return rest
  return item
}

const operationHandler = ({ btnConfig, rowData }) => {
  if (btnConfig?.eventKey === 'remove') {
    removeData({ btnConfig, rowData })
    return
  }
  emit('operate', { btnConfig, rowData })
}

async function removeData({ btnConfig, rowData }) {
  const params = btnConfig?.eventOption?.params
  if (!params || !rowData) return

  const removeKey = Object.keys(params)[0]
  const [source, field] = String(params[removeKey] ?? '').split('::')
  const removeValue = source === 'schema' && field ? rowData[field] : undefined
  if (!removeKey || removeValue === undefined) return

  try {
    await ElMessageBox.confirm(
      `确定删除 ${removeValue} 吗？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    schemaTableRef.value?.showLoading()
    const res = await $curl({
      method: 'delete',
      url: api.value,
      data: { [removeKey]: removeValue },
      errorMessage: '删除失败',
    })

    if (!res?.success) return
    ElNotification({ title: '删除成功', message: '数据已删除', type: 'success' })
    await schemaTableRef.value?.initData()
  } catch (error) {
    // 用户取消
  } finally {
    schemaTableRef.value?.hideLoading()
  }
}

const loadTableData = () => schemaTableRef.value?.loadTableData()

defineExpose({ loadTableData })
</script>

<style lang="less" scoped>
.table-panel {
  flex: 0 0 auto;
  min-width: 0;
  margin: 8px 0 0;
  border: 1px solid var(--app-border);
  background: var(--app-bg-surface);
  box-shadow: none !important;

  &:hover,
  &:focus-within {
    box-shadow: none !important;
  }

  .operation-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 40px;
    margin-bottom: 4px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
    flex-wrap: wrap;
  }

  .panel-meta {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .operation-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
}

:deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 8px;
}
</style>
