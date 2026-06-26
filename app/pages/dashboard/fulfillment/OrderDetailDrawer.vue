<template>
  <el-drawer
    :model-value="visible"
    :title="title"
    size="520px"
    destroy-on-close
    class="order-detail-drawer"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-loading="loading" class="drawer-body">
      <template v-if="detail">
        <div class="detail-hero">
          <div class="detail-hero-top">
            <span class="detail-hero-no">{{ detail.order_no }}</span>
            <status-tag :value="detail.status" domain="order" />
          </div>
          <div class="detail-hero-amount">¥{{ formatMoney(detail.total_amount) }}</div>
          <div class="detail-hero-meta">
            <span>{{ detail.store_name || '—' }}</span>
            <template v-if="detail.customer_name">
              <span class="meta-sep" aria-hidden="true">·</span>
              <span>{{ detail.customer_name }}</span>
            </template>
          </div>
          <div v-if="detail.warehouse_name" class="detail-hero-warehouse">
            分仓仓库：{{ detail.warehouse_name }}
          </div>
        </div>

        <section class="detail-section">
          <h4 class="detail-section-title">SKU 明细</h4>
          <div class="detail-card">
            <el-table :data="detail.items || []" size="small" class="detail-table">
              <el-table-column prop="sku_code" label="SKU" min-width="120" show-overflow-tooltip />
              <el-table-column prop="qty" label="数量" width="72" align="center" />
              <el-table-column label="金额" width="108" align="right">
                <template #default="{ row }">
                  <span class="detail-money">¥{{ formatMoney(row.amount) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>

        <section v-if="detail.stockLocks?.length" class="detail-section">
          <h4 class="detail-section-title">库存锁定</h4>
          <div class="detail-card">
            <el-table :data="detail.stockLocks" size="small" class="detail-table">
              <el-table-column prop="sku_id" label="SKU ID" min-width="120" show-overflow-tooltip />
              <el-table-column prop="qty" label="数量" width="72" align="center" />
              <el-table-column label="状态" width="96" align="center">
                <template #default="{ row }">
                  <status-tag :value="row.status" domain="common" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>

        <section v-if="detail.shipments?.length" class="detail-section">
          <h4 class="detail-section-title">发货单</h4>
          <div v-for="ship in detail.shipments" :key="ship.shipment_id" class="shipment-block">
            <div class="shipment-head">
              <strong>{{ ship.shipment_no }}</strong>
              <status-tag :value="ship.status" domain="shipment" />
            </div>
            <el-table :data="ship.items || []" size="small" class="detail-table">
              <el-table-column prop="sku_code" label="SKU" min-width="100" show-overflow-tooltip />
              <el-table-column prop="qty" label="数量" width="72" align="center" />
              <el-table-column prop="suggested_location_code" label="建议库位" min-width="100" show-overflow-tooltip />
            </el-table>
          </div>
        </section>

        <section v-if="detail.statusLogs?.length" class="detail-section">
          <h4 class="detail-section-title">状态时间线</h4>
          <div class="detail-card detail-card-padded">
            <el-timeline class="status-timeline">
              <el-timeline-item v-for="log in detail.statusLogs" :key="log.log_id" hide-timestamp>
                <div class="timeline-item">
                  <div class="timeline-item-head">
                    <status-tag :value="log.to_status" domain="order" />
                    <time class="timeline-time">{{ formatDateTime(log.created_at) }}</time>
                  </div>
                  <p v-if="log.remark" class="timeline-remark">{{ log.remark }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </section>

        <section v-if="detail.auditLogs?.length" class="detail-section">
          <h4 class="detail-section-title">审计记录</h4>
          <div class="detail-card">
            <el-table :data="detail.auditLogs" size="small" class="detail-table">
              <el-table-column prop="action_code" label="动作" min-width="140" show-overflow-tooltip />
              <el-table-column label="时间" width="156" align="right">
                <template #default="{ row }">
                  <span class="timeline-time">{{ formatDateTime(row.created_at) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>
      </template>
    </div>
  </el-drawer>
</template>

<script setup>
import StatusTag from '../common/status-tag.vue'
import { formatMoney, formatDateTime } from '../common/format.js'

defineProps({
  visible: Boolean,
  title: { type: String, default: '订单详情' },
  loading: Boolean,
  detail: Object,
})

defineEmits(['update:visible'])
</script>

<style lang="less" scoped>
.order-detail-drawer {
  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
  }
  :deep(.el-drawer__title) { font-size: 15px; font-weight: 700; color: #0f172a; }
  :deep(.el-drawer__body) { padding: 0; }
}

.drawer-body { padding: 16px 20px 28px; }

.detail-hero {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
}

.detail-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.detail-hero-no {
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}

.detail-hero-amount {
  color: #0f172a;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.detail-hero-meta { margin-top: 10px; color: #475569; font-size: 13px; line-height: 1.5; }
.meta-sep { margin: 0 6px; color: #cbd5e1; }
.detail-hero-warehouse {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
  color: #64748b;
  font-size: 12px;
}

.detail-section { margin-bottom: 20px; &:last-child { margin-bottom: 0; } }
.detail-section-title { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #334155; }
.detail-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fff; }
.detail-card-padded { padding: 12px 14px 4px; }

.detail-table {
  width: 100%;
  :deep(.el-table__inner-wrapper::before) { display: none; }
  :deep(.el-table__header th.el-table__cell) {
    background: #f8fafc;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
    padding: 8px 12px;
  }
  :deep(.el-table__body td.el-table__cell) { padding: 10px 12px; font-size: 13px; color: #334155; }
}

.detail-money {
  display: inline-block;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: #0f172a;
}

.shipment-block {
  margin-bottom: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  &:last-child { margin-bottom: 0; }
}

.shipment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
}

.status-timeline {
  margin: 0;
  padding: 0;
  :deep(.el-timeline-item) { padding-bottom: 16px; &:last-child { padding-bottom: 0; } }
  :deep(.el-timeline-item__tail) { border-left-color: #e2e8f0; }
  :deep(.el-timeline-item__node) { background: #3b82f6; border-color: #dbeafe; }
  :deep(.el-timeline-item__wrapper) { padding-left: 20px; }
}

.timeline-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.timeline-time {
  color: #94a3b8;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.timeline-remark { margin: 6px 0 0; color: #64748b; font-size: 12px; line-height: 1.5; }
</style>
