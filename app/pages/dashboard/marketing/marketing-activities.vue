<template>
  <div v-loading="loading" class="marketing-page">
    <h2 class="page-title">营销活动</h2>

    <el-row :gutter="16">
      <el-col :span="10">
        <el-card>
          <template #header>活动列表</template>
          <el-table
            :data="activities"
            size="small"
            stripe
            highlight-current-row
            @current-change="onSelect"
          >
            <el-table-column prop="activity_name" label="活动名称" />
            <el-table-column prop="status" label="状态" width="90" />
            <el-table-column prop="start_at" label="开始" width="110" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="14">
        <el-card>
          <template #header>活动详情</template>
          <el-empty v-if="!detail" description="请选择左侧活动" />
          <template v-else>
            <p><b>{{ detail.activity_name }}</b>（{{ detail.status }}）</p>
            <p class="meta">{{ detail.description || '暂无描述' }}</p>
            <el-table :data="detail.products || []" size="small" style="margin-top: 12px">
              <el-table-column prop="product_name" label="关联商品" />
              <el-table-column prop="discount_type" label="优惠类型" width="100" />
              <el-table-column prop="discount_value" label="优惠值" width="90" />
            </el-table>
          </template>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(false)
const activities = ref([])
const detail = ref(null)

async function loadActivities() {
  loading.value = true
  try {
    const res = await $curl({ method: 'get', url: '/api/proj/marketing/activity/list' })
    if (res?.success) activities.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

async function onSelect(row) {
  if (!row) {
    detail.value = null
    return
  }
  const res = await $curl({
    method: 'get',
    url: '/api/proj/marketing/activity',
    query: { activity_id: row.activity_id },
  })
  if (res?.success) detail.value = res.data
}

onMounted(loadActivities)
</script>

<style lang="less" scoped>
.marketing-page { padding: 16px 20px; }
.page-title { margin: 0 0 16px; font-size: 20px; }
.meta { color: #909399; font-size: 13px; }
</style>
