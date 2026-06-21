<template>
  <div v-loading="loading" class="audit-page">
    <h2 class="page-title">审计日志</h2>

    <el-card class="filter-card">
      <el-form :inline="true" size="small" @submit.prevent="loadList">
        <el-form-item label="操作码">
          <el-input v-model="filters.action_code" placeholder="如 product:on_sale" clearable />
        </el-form-item>
        <el-form-item label="对象类型">
          <el-input v-model="filters.object_type" placeholder="如 order" clearable />
        </el-form-item>
        <el-form-item label="对象ID">
          <el-input v-model="filters.object_id" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="list" size="small" stripe>
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="action_code" label="操作码" width="180" show-overflow-tooltip />
        <el-table-column prop="object_type" label="对象类型" width="100" />
        <el-table-column prop="object_id" label="对象ID" width="160" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="120" />
        <el-table-column label="详情" min-width="200">
          <template #default="{ row }">
            <span class="detail-text">{{ formatDetail(row.detail_json) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
// 审计日志查询：展示关键业务操作留痕（登录、入库、出库、审批等）
import { ref, reactive, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(false)
const list = ref([])
const filters = reactive({
  action_code: '',
  object_type: '',
  object_id: '',
})

function formatDetail(json) {
  if (!json) return '-'
  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json
    return JSON.stringify(obj)
  } catch {
    return String(json)
  }
}

function resetFilters() {
  filters.action_code = ''
  filters.object_type = ''
  filters.object_id = ''
  loadList()
}

async function loadList() {
  loading.value = true
  try {
    const query = {}
    if (filters.action_code) query.action_code = filters.action_code
    if (filters.object_type) query.object_type = filters.object_type
    if (filters.object_id) query.object_id = filters.object_id
    const res = await $curl({ method: 'get', url: '/api/proj/audit/list', query })
    if (res?.success) list.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

onMounted(loadList)
</script>

<style lang="less" scoped>
.audit-page { padding: 16px 20px; }
.page-title { margin: 0 0 16px; font-size: 20px; }
.filter-card { margin-bottom: 16px; }
.detail-text { font-size: 12px; color: #606266; word-break: break-all; }
</style>
