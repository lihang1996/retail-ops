<template>
  <el-drawer
    :model-value="visible"
    class="inbound-drawer"
    title="新建入库作业"
    size="560px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @closed="$emit('closed')"
  >
    <div class="drawer-body">
      <el-steps :active="activeStep" finish-status="success" simple>
        <el-step title="选择仓库" />
        <el-step title="添加明细" />
        <el-step title="确认入库" />
      </el-steps>

      <section class="drawer-section">
        <h3>1. 入库位置</h3>
        <el-form label-width="86px">
          <el-form-item label="仓库">
            <el-select
              :model-value="form.warehouse_id"
              placeholder="选择仓库"
              filterable
              class="full-control"
              @update:model-value="onWarehouseUpdate"
            >
              <el-option
                v-for="warehouse in warehouses"
                :key="warehouse.warehouse_id"
                :label="warehouse.warehouse_name"
                :value="warehouse.warehouse_id"
              />
            </el-select>
            <div v-if="warehouseError" class="field-tip error">{{ warehouseError }}</div>
          </el-form-item>
          <el-form-item label="库位">
            <el-select
              :model-value="form.location_id"
              placeholder="可选，不选则只入仓库库存"
              clearable
              filterable
              class="full-control"
              @update:model-value="$emit('update:form', { ...form, location_id: $event })"
            >
              <el-option
                v-for="location in locations"
                :key="location.location_id"
                :label="location.location_code"
                :value="location.location_id"
              />
            </el-select>
            <div v-if="locationError" class="field-tip warning">{{ locationError }}</div>
          </el-form-item>
        </el-form>
      </section>

      <InboundLineEditor
        :lines="lines"
        :line-form="lineForm"
        :skus="skus"
        :sku-loading="skuLoading"
        :sku-load-failed="skuLoadFailed"
        :sku-error="skuError"
        @add-line="$emit('add-line')"
        @remove-line="$emit('remove-line', $event)"
        @update:line-form="$emit('update:lineForm', $event)"
      />

      <section class="drawer-section summary-section">
        <h3>3. 确认作业</h3>
        <div class="summary-grid">
          <div><span>仓库</span><strong>{{ selectedWarehouse?.warehouse_name || '未选择' }}</strong></div>
          <div><span>库位</span><strong>{{ selectedLocation?.location_code || '未指定' }}</strong></div>
          <div><span>SKU 行数</span><strong>{{ lines.length }}</strong></div>
          <div><span>入库总数</span><strong>{{ formatNumber(selectedTotalQty) }}</strong></div>
        </div>
        <el-input
          :model-value="form.remark"
          type="textarea"
          :rows="3"
          maxlength="120"
          show-word-limit
          placeholder="备注，例如：采购补货 / 盘盈调整 / 门店退回"
          @update:model-value="$emit('update:form', { ...form, remark: $event })"
        />
      </section>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <el-button @click="$emit('update:visible', false)">取消</el-button>
        <el-button type="primary" :loading="saving" @click="$emit('submit')">确认入库</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { formatNumber } from '../common/format.js'
import InboundLineEditor from './InboundLineEditor.vue'

const props = defineProps({
  visible: Boolean,
  saving: Boolean,
  activeStep: Number,
  form: Object,
  lineForm: Object,
  lines: Array,
  warehouses: Array,
  locations: Array,
  warehouseError: String,
  locationError: String,
  skus: Array,
  skuLoading: Boolean,
  skuLoadFailed: Boolean,
  skuError: String,
  selectedWarehouse: Object,
  selectedLocation: Object,
  selectedTotalQty: Number,
})

const emit = defineEmits([
  'update:visible',
  'update:form',
  'update:lineForm',
  'closed',
  'warehouse-change',
  'add-line',
  'remove-line',
  'submit',
])

function onWarehouseUpdate(value) {
  emit('update:form', { ...props.form, warehouse_id: value, location_id: '' })
  emit('warehouse-change')
}
</script>

<style lang="less" scoped>
.drawer-body { display: flex; flex-direction: column; gap: 16px; }
.drawer-section {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: #fff;
  h3 { margin: 0 0 14px; color: var(--color-gray-900); font-size: 15px; font-weight: 700; }
}
.full-control { width: 100%; }
.field-tip {
  width: 100%;
  margin-top: 8px;
  color: var(--color-gray-500);
  font-size: 12px;
  line-height: 1.6;
  &.warning { color: var(--color-warning-600); }
  &.error { color: var(--color-error-600); }
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
  div { padding: 12px; border-radius: 12px; background: var(--color-gray-50); }
  span { display: block; margin-bottom: 4px; color: var(--color-gray-500); font-size: 12px; }
  strong { color: var(--color-gray-900); font-weight: 700; }
}
.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; }
</style>
