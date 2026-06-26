<template>
  <el-drawer :model-value="visible" :title="title" size="400px" @update:model-value="$emit('update:visible', $event)">
    <div v-loading="loading">
      <el-alert
        v-if="activePickPoint && drawerPickSku"
        type="success"
        :closable="false"
        show-icon
        class="drawer-pick-hint"
      >
        当前拣货：<strong>{{ drawerPickSku }}</strong> × {{ activePickPoint.qty }}
      </el-alert>
      <template v-if="locationDetail">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="库位编码">
            {{ locationDetail.location?.location_code }}
          </el-descriptions-item>
          <el-descriptions-item label="占用状态">
            <el-tag :type="riskTagType(locationDetail.risk?.level)" size="small">
              {{ riskLabel(locationDetail.risk?.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="库存量">
            {{ locationDetail.risk?.totalQty || 0 }} / {{ locationDetail.risk?.capacity || '-' }}
          </el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <h4>SKU 明细</h4>
        <el-empty v-if="!locationDetail.skus?.length" description="无库存" />
        <el-table v-else :data="locationDetail.skus" size="small" :row-class-name="skuRowClass">
          <el-table-column prop="sku_code" label="SKU" />
          <el-table-column prop="qty" label="数量" width="80" />
        </el-table>
        <el-divider />
        <h4>最近流水</h4>
        <el-empty v-if="!locationDetail.recentLogs?.length" description="无流水" />
        <ul v-else class="log-list">
          <li v-for="(log, i) in locationDetail.recentLogs" :key="i">
            {{ log.action_type }} {{ log.qty_change > 0 ? '+' : '' }}{{ log.qty_change }}
            · {{ log.sku_code || '-' }} · {{ formatDateTime(log.created_at) }}
          </li>
        </ul>
      </template>
    </div>
  </el-drawer>
</template>

<script setup>
import { riskLabel, riskTagType } from './warehouse-3d-meta.js'
import { formatDateTime } from '../common/format.js'

defineProps({
  visible: Boolean,
  title: String,
  loading: Boolean,
  locationDetail: Object,
  activePickPoint: Object,
  drawerPickSku: String,
  skuRowClass: { type: Function, default: () => '' },
})

defineEmits(['update:visible'])
</script>

<style lang="less" scoped>
.drawer-pick-hint { margin-bottom: var(--spacing-4); }
:deep(.sku-pick-row) { background: var(--color-success-50) !important; font-weight: 600; }
.log-list {
  padding-left: var(--spacing-5);
  margin: 0;
  li {
    font-size: var(--text-sm);
    color: var(--color-gray-600);
    margin-bottom: 6px;
  }
}
</style>
