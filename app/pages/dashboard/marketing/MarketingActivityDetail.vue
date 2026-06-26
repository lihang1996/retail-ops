<template>
  <section v-loading="loading" class="marketing-detail">
    <div class="marketing-section-head">
      <h3>活动商品与价格</h3>
      <span v-if="detail">{{ detail.products?.length || 0 }} 个关联商品</span>
    </div>
    <empty-state v-if="!detail" class="ops-empty" title="请选择活动" description="从左侧选择活动后查看活动商品和价格。" />
    <template v-else>
      <div class="detail-hero">
        <div>
          <strong>{{ detail.activity_name }}</strong>
          <span>{{ typeLabel(detail.activity_type) }} · {{ formatDate(detail.start_at) }} 至 {{ formatDate(detail.end_at) }}</span>
        </div>
        <status-tag :value="detail.status" domain="common" />
      </div>
      <div class="ops-table-wrap">
        <el-table :data="detail.products || []" size="small">
          <el-table-column prop="product_name" label="商品" min-width="200" show-overflow-tooltip />
          <el-table-column prop="sku_code" label="SKU" min-width="150" show-overflow-tooltip />
          <el-table-column label="原价" min-width="110" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.sale_price) }}</template>
          </el-table-column>
          <el-table-column label="活动价" min-width="120" align="right">
            <template #default="{ row }"><strong class="promo-price">¥{{ formatMoney(row.promo_price) }}</strong></template>
          </el-table-column>
          <el-table-column label="优惠幅度" min-width="130" align="right">
            <template #default="{ row }">{{ discountLabel(row) }}</template>
          </el-table-column>
          <template #empty><empty-state title="未关联商品" description="该活动尚未配置参与商品。" /></template>
        </el-table>
      </div>
    </template>
  </section>
</template>

<script setup>
import EmptyState from '../common/empty-state.vue'
import StatusTag from '../common/status-tag.vue'
import { formatDate, formatMoney } from '../common/format.js'

defineProps({
  loading: { type: Boolean, default: false },
  detail: { type: Object, default: null },
  typeLabel: { type: Function, required: true },
})

function discountLabel(row) {
  const original = Number(row.sale_price || 0)
  const promo = Number(row.promo_price || 0)
  if (!original || !promo) return '—'
  return `${Math.max(0, Math.round((1 - promo / original) * 100))}%`
}
</script>

<style lang="less" scoped>
.marketing-detail { min-width: 0; }
.marketing-section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 2px 10px; }
.marketing-section-head h3 { margin: 0; color: #0f172a; font-size: 14px; font-weight: 700; }
.marketing-section-head span { color: #94a3b8; font-size: 11px; }
.detail-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding: 14px; border-radius: 12px; background: linear-gradient(135deg, #f8fbff, #eff6ff); }
.detail-hero strong, .detail-hero span { display: block; }
.detail-hero strong { color: #0f172a; font-size: 16px; }
.detail-hero span { margin-top: 6px; color: #64748b; font-size: 11px; }
.promo-price { color: #dc2626; }
</style>
