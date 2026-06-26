<template>
  <aside class="sidebar">
    <el-tabs :model-value="sidebarTab" class="sidebar-tabs" @update:model-value="$emit('update:sidebarTab', $event)">
      <el-tab-pane label="库位列表" name="locations">
        <el-input
          :model-value="locationSearch"
          placeholder="搜索库位"
          clearable
          size="small"
          class="sidebar-search"
          @update:model-value="$emit('update:locationSearch', $event)"
        />
        <div class="sidebar-filters">
          <el-check-tag
            v-for="item in legendItems"
            :key="item.level"
            :checked="!legendOff.has(item.level)"
            @change="(on) => $emit('legend-level', item.level, on)"
          >
            {{ item.label }}
          </el-check-tag>
        </div>
        <el-scrollbar height="calc(100vh - 420px)" class="location-scroll">
          <div
            v-for="loc in filteredLocations"
            :key="loc.location_id"
            class="location-row"
            :class="{ active: selectedLocation?.locationId === loc.location_id }"
            @click="$emit('focus', loc.location_id, loc.location_code)"
          >
            <div class="loc-code">{{ loc.location_code }}</div>
            <el-tag :type="riskTagType(rowLevel(loc.location_id))" size="small">
              {{ riskLabel(rowLevel(loc.location_id)) }}
            </el-tag>
            <div class="loc-qty">{{ rowQty(loc.location_id) }} 件</div>
          </div>
          <el-empty v-if="!filteredLocations.length" description="无匹配库位" :image-size="64" />
        </el-scrollbar>
      </el-tab-pane>

      <el-tab-pane :label="pickingTabLabel" name="picking">
        <template v-if="pickingMode && pickingRoute?.points?.length">
          <div
            v-for="point in pickingRoute.points"
            :key="`${point.location_id}-${point.seq}`"
            class="pick-step"
            :class="{ active: activePickSeq === point.seq }"
            @click="$emit('picking-step', point)"
          >
            <div class="pick-seq">{{ point.seq }}</div>
            <div class="pick-body">
              <div class="pick-loc">{{ point.location_code }}</div>
              <div class="pick-sku">{{ point.sku_code }} × {{ point.qty }}</div>
            </div>
            <el-button link type="primary" size="small" @click.stop="$emit('picking-step', point)">定位</el-button>
          </div>
        </template>
        <el-empty v-else description="请从履约中心带入发货单" :image-size="80">
          <el-button type="primary" plain size="small" @click="$emit('go-fulfillment')">去履约中心</el-button>
        </el-empty>
      </el-tab-pane>
    </el-tabs>
  </aside>
</template>

<script setup>
import { riskLabel, riskTagType } from './warehouse-3d-meta.js'

defineProps({
  sidebarTab: String,
  locationSearch: String,
  legendItems: Array,
  legendOff: Object,
  filteredLocations: Array,
  selectedLocation: Object,
  pickingTabLabel: String,
  pickingMode: Boolean,
  pickingRoute: Object,
  activePickSeq: Number,
  rowLevel: { type: Function, required: true },
  rowQty: { type: Function, required: true },
})

defineEmits([
  'update:sidebarTab',
  'update:locationSearch',
  'legend-level',
  'focus',
  'picking-step',
  'go-fulfillment',
])
</script>

<style lang="less" scoped>
.sidebar {
  width: 300px;
  flex-shrink: 0;
  border: 1px solid var(--app-border);
  border-radius: var(--radius-xl);
  background: white;
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
}

.sidebar-search { margin-bottom: var(--spacing-2); }

.sidebar-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--spacing-3);
}

.location-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 8px;
  padding: 10px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid transparent;
  &:hover { background: var(--color-gray-50); }
  &.active {
    background: var(--color-primary-50);
    border-color: var(--color-primary-200);
  }
  .loc-code { font-family: var(--font-mono); font-weight: var(--font-semibold); font-size: 13px; }
  .loc-qty { grid-column: 1 / -1; font-size: 11px; color: var(--color-gray-500); }
}

.pick-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  margin-bottom: 6px;
  border-radius: var(--radius-md);
  border: 1px solid var(--app-border);
  cursor: pointer;
  &:hover { border-color: var(--color-primary-300); }
  &.active {
    border-color: var(--color-primary-500);
    background: var(--color-primary-50);
  }
  .pick-seq {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-primary-600);
    color: white;
    font-size: 13px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pick-body { flex: 1; min-width: 0; }
  .pick-loc { font-family: var(--font-mono); font-weight: 600; font-size: 13px; }
  .pick-sku { font-size: 11px; color: var(--color-gray-500); margin-top: 2px; }
}

@media (max-width: 1100px) {
  .sidebar { width: 100%; max-height: 360px; }
}
</style>
