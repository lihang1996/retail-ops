<template>
  <div class="biz-page-header">
    <div class="biz-page-header-main">
      <el-breadcrumb v-if="breadcrumb.length" separator="/" class="biz-page-header-crumb">
        <el-breadcrumb-item v-for="(item, idx) in breadcrumb" :key="idx">
          {{ item }}
        </el-breadcrumb-item>
      </el-breadcrumb>
      <h2 class="biz-page-header-title">{{ title }}</h2>
      <p v-if="subtitle" class="biz-page-header-subtitle">{{ subtitle }}</p>
    </div>
    <div class="biz-page-header-extra">
      <slot name="extra" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  breadcrumb: { type: Array, default: () => [] },
})
</script>

<style lang="less" scoped>
.biz-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.biz-page-header-crumb {
  margin-bottom: 8px;
  font-size: 12px;
}

.biz-page-header-title {
  margin: 0;
  color: var(--el-text-color-primary, #0f172a);
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.biz-page-header-subtitle {
  margin: 8px 0 0;
  color: var(--app-text-muted, #64748b);
  font-size: 13px;
}

.biz-page-header-extra {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: 960px) {
  .biz-page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
