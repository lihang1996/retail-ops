<template>
  <el-alert v-if="pickingMode" class="picking-banner" type="success" :closable="false" show-icon>
    <template #default>
      <div class="picking-banner-inner">
        <div class="picking-banner-text">
          <div class="picking-banner-title">拣货导航 · 发货单 {{ shipmentNo }}</div>
          <div class="picking-banner-desc">共 {{ pointCount }} 个拣货点，按侧栏顺序依次前往库位取货。</div>
        </div>
        <el-link type="primary" :underline="false" class="picking-banner-link" @click="$emit('go-fulfillment')">
          返回履约中心
        </el-link>
      </div>
    </template>
  </el-alert>

  <el-alert v-else class="guide-banner" type="info" :closable="false" show-icon>
    <template #title>浏览模式</template>
    <template #default>
      当前未关联发货单。可在
      <el-link type="primary" :underline="false" @click="$emit('go-fulfillment')">履约中心</el-link>
      对订单点击「3D 拣货」进入拣货导航；也可直接点击库位查看 SKU 与流水。
    </template>
  </el-alert>
</template>

<script setup>
defineProps({
  pickingMode: Boolean,
  shipmentNo: { type: String, default: '' },
  pointCount: { type: Number, default: 0 },
})
defineEmits(['go-fulfillment'])
</script>
