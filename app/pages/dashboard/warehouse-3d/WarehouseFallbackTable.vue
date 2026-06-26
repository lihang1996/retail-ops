<template>
  <div class="fallback-panel">
    <el-alert title="当前环境已降级为 2D 库位列表" type="warning" :closable="false" show-icon />
    <div class="fallback-toolbar">
      <el-input
        :model-value="locationSearch"
        placeholder="搜索库位编码"
        clearable
        size="small"
        style="width: 200px"
        @update:model-value="$emit('update:locationSearch', $event)"
      />
      <el-checkbox
        :model-value="stockedOnly"
        @update:model-value="$emit('update:stockedOnly', $event)"
        @change="$emit('stocked-only-change')"
      >
        仅看有货
      </el-checkbox>
    </div>
    <el-table
      v-loading="loading"
      :data="locations"
      size="small"
      stripe
      height="520"
      @row-click="(row) => $emit('row-click', row)"
    >
      <el-table-column prop="location_code" label="库位" width="110" />
      <el-table-column label="状态" width="88">
        <template #default="{ row }">
          <el-tag :type="riskTagType(rowLevel(row.location_id))" size="small">
            {{ riskLabel(rowLevel(row.location_id)) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="库存" min-width="100">
        <template #default="{ row }">{{ rowQty(row.location_id) }} / {{ row.capacity || '-' }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { riskLabel, riskTagType } from './warehouse-3d-meta.js'

defineProps({
  loading: Boolean,
  locations: { type: Array, default: () => [] },
  locationSearch: { type: String, default: '' },
  stockedOnly: Boolean,
  rowLevel: { type: Function, required: true },
  rowQty: { type: Function, required: true },
})
defineEmits(['update:locationSearch', 'update:stockedOnly', 'stocked-only-change', 'row-click'])
</script>
