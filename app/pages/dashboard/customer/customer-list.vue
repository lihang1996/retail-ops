<template>
  <div v-loading="loading" class="customer-page">
    <h2 class="page-title">客户中心</h2>

    <el-card>
      <el-form :inline="true" size="small" class="filter" @submit.prevent="loadList">
        <el-form-item label="客户名称">
          <el-input v-model="keyword" clearable placeholder="模糊搜索" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" size="small" stripe>
        <el-table-column prop="customer_name" label="客户名称" min-width="140" />
        <el-table-column prop="phone" label="手机号" width="140">
          <template #default="{ row }">
            <span>{{ row.phone }}</span>
            <el-tag v-if="row.phone_masked" size="small" type="info" style="margin-left: 6px">脱敏</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="等级" width="80" />
        <el-table-column prop="created_at" label="创建时间" width="170" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(false)
const keyword = ref('')
const list = ref([])

async function loadList() {
  loading.value = true
  try {
    const query = {}
    if (keyword.value) query.customer_name = keyword.value
    const res = await $curl({ method: 'get', url: '/api/proj/customer/list', query })
    if (res?.success) list.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

onMounted(loadList)
</script>

<style lang="less" scoped>
.customer-page { padding: 16px 20px; }
.page-title { margin: 0 0 16px; font-size: 20px; }
.filter { margin-bottom: 12px; }
</style>
