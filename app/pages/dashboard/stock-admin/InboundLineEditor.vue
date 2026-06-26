<template>
  <section class="drawer-section">
    <h3>2. 入库明细</h3>
    <div class="line-editor">
      <el-select
        v-if="!skuLoadFailed"
        :model-value="lineForm.sku_id"
        filterable
        placeholder="选择 SKU"
        :loading="skuLoading"
        class="sku-control"
        @update:model-value="updateLineForm('sku_id', $event)"
      >
        <el-option
          v-for="sku in skus"
          :key="sku.sku_id"
          :label="`${sku.sku_code} · ${sku.product_name || ''}`"
          :value="sku.sku_id"
        />
      </el-select>
      <el-input
        v-else
        :model-value="lineForm.sku_id"
        placeholder="SKU 列表加载失败，可手动输入 SKU ID"
        class="sku-control"
        @update:model-value="updateLineForm('sku_id', $event)"
      />
      <el-input-number
        :model-value="lineForm.qty"
        :min="1"
        :max="999999"
        controls-position="right"
        @update:model-value="updateLineForm('qty', $event)"
      />
      <el-button type="primary" plain @click="$emit('add-line')">添加</el-button>
    </div>
    <div v-if="skuError" class="field-tip warning">{{ skuError }}</div>

    <div v-if="lines.length" class="line-table">
      <div v-for="(line, index) in lines" :key="`${line.sku_id}-${index}`" class="line-row">
        <div>
          <strong>{{ line.product_name || '手动录入 SKU' }}</strong>
          <span>{{ line.sku_code || line.sku_id }}</span>
        </div>
        <em>× {{ formatNumber(line.qty) }}</em>
        <el-button link type="danger" @click="$emit('remove-line', index)">移除</el-button>
      </div>
    </div>
    <el-empty v-else :image-size="80" description="还没有添加入库明细" />
  </section>
</template>

<script setup>
import { formatNumber } from '../common/format.js'

const props = defineProps({
  lines: Array,
  lineForm: Object,
  skus: Array,
  skuLoading: Boolean,
  skuLoadFailed: Boolean,
  skuError: String,
})

const emit = defineEmits(['add-line', 'remove-line', 'update:lineForm'])

function updateLineForm(key, value) {
  emit('update:lineForm', { ...props.lineForm, [key]: value })
}
</script>

<style lang="less" scoped>
.drawer-section {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: #fff;
  h3 { margin: 0 0 14px; color: var(--color-gray-900); font-size: 15px; font-weight: 700; }
}

.line-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px 72px;
  gap: 10px;
  align-items: center;
  .sku-control { width: 100%; }
}

.field-tip {
  width: 100%;
  margin-top: 8px;
  color: var(--color-gray-500);
  font-size: 12px;
  &.warning { color: var(--color-warning-600); }
}

.line-table {
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.line-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px 52px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--app-border);
  &:last-child { border-bottom: none; }
  div { min-width: 0; }
  strong, span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  strong { color: var(--color-gray-800); font-weight: 650; }
  span { margin-top: 4px; color: var(--color-gray-500); font-size: 12px; }
  em { color: var(--color-success-600); font-style: normal; font-weight: 700; text-align: right; }
}

@media (max-width: 768px) {
  .line-editor { grid-template-columns: 1fr; }
}
</style>
