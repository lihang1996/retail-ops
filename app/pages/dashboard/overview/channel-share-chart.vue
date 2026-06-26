<template>
  <div class="channel-share-chart">
    <div v-if="!rows.length" class="channel-empty">暂无渠道成交数据</div>
    <template v-else>
      <div class="channel-summary">
        <span>
          <small>前 {{ rows.length }} 渠道销售额</small>
          <strong>¥{{ formatMoney(listedRevenue) }}</strong>
        </span>
        <em>{{ listedOrders }} 单</em>
      </div>

      <div class="channel-list">
        <div v-for="row in rows" :key="row.store_id || row.store_name" class="channel-row">
          <div class="channel-row-head">
            <strong class="channel-name">{{ row.store_name || '未命名店铺' }}</strong>
            <strong class="channel-money">¥{{ formatMoney(row.revenue) }}</strong>
          </div>
          <div class="channel-row-meta">
            <span>{{ row.order_count || 0 }} 笔订单</span>
            <span>{{ row.share || 0 }}%</span>
          </div>
          <span class="channel-track">
            <span class="channel-fill" :style="{ width: `${barWidth(row.share)}%` }" />
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatMoney } from '../common/format.js'

const props = defineProps({
  stores: { type: Array, default: () => [] },
})

const rows = computed(() => [...(props.stores || [])]
  .sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0)))

const listedRevenue = computed(() => rows.value.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0))
const listedOrders = computed(() => rows.value.reduce((sum, row) => sum + (Number(row.order_count) || 0), 0))

function barWidth(share) {
  const value = Math.max(0, Math.min(100, Number(share) || 0))
  if (!value) return 0
  return Math.max(3, Math.round(value * 10) / 10)
}
</script>

<style lang="less" scoped>
.channel-share-chart {
  box-sizing: border-box;
  width: 100%;
  min-height: 248px;
  padding: 12px 14px 14px;
}

.channel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  color: #94a3b8;
  font-size: 13px;
}

.channel-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fbff 100%);

  span,
  small,
  strong {
    display: block;
  }

  small {
    color: #64748b;
    font-size: 11px;
    font-weight: 650;
  }

  strong {
    margin-top: 4px;
    color: #1d4ed8;
    font-size: 21px;
    font-weight: 850;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  em {
    flex-shrink: 0;
    color: #64748b;
    font-size: 12px;
    font-style: normal;
    font-weight: 700;
  }
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.channel-row {
  padding: 8px 0 7px;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: 0;
  }
}

.channel-row-head,
.channel-row-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.channel-name {
  min-width: 0;
  overflow: hidden;
  color: #334155;
  font-size: 13px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-money {
  flex-shrink: 0;
  color: #0f172a;
  font-size: 15px;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
}

.channel-row-meta {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 650;
}

.channel-track {
  display: block;
  height: 8px;
  margin-top: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #eef2ff;
}

.channel-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #93c5fd 0%, #2563eb 100%);
}
</style>
