<template>
  <div class="product-rank">
    <div v-for="(row, index) in items" :key="row.sku_code || index" class="rank-row">
      <span class="rank-index">{{ index + 1 }}</span>
      <span class="rank-copy">
        <strong>{{ row.product_name || row.sku_code }}</strong>
        <small>{{ row.sku_code }} · {{ row.order_count }} 笔订单</small>
      </span>
      <span class="rank-value">
        {{ row.sales_qty }} 件<br>
        <em>¥{{ formatMoney(row.sales_amount) }}</em>
      </span>
    </div>
  </div>
</template>

<script setup>
import { formatMoney } from '../common/format.js'

defineProps({
  items: { type: Array, default: () => [] },
})
</script>

<style lang="less" scoped>
.product-rank { padding: 6px 14px 10px; }
.rank-row {
  display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid #f1f5f9;
}
.rank-row:last-child { border-bottom: 0; }
.rank-index { color: #94a3b8; font-size: 13px; font-weight: 750; text-align: center; }
.rank-copy { min-width: 0; }
.rank-copy strong, .rank-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-copy strong { color: #334155; font-size: 12px; }
.rank-copy small { margin-top: 3px; color: #94a3b8; font-size: 10px; }
.rank-value { color: #334155; font-size: 12px; text-align: right; }
.rank-value em { color: #2563eb; font-size: 10px; font-style: normal; }
</style>
