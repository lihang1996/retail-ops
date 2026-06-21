<template>
  <div v-loading="loading" class="approval-page">
    <h2 class="page-title">审批待办</h2>
    <p class="hint">当前支持「商品上架」审批；通过后自动调用商品上架接口。</p>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>待处理</span>
          <el-button type="primary" link @click="loadList">刷新</el-button>
        </div>
      </template>
      <el-table :data="list" size="small" stripe empty-text="暂无待审批">
        <el-table-column prop="approval_id" label="审批单号" width="180" show-overflow-tooltip />
        <el-table-column prop="title" label="标题" min-width="160" />
        <el-table-column prop="ref_type" label="类型" width="120">
          <template #default="{ row }">{{ refTypeLabel(row.ref_type) }}</template>
        </el-table-column>
        <el-table-column prop="ref_id" label="关联ID" width="160" show-overflow-tooltip />
        <el-table-column prop="applicant_name" label="申请人" width="100" />
        <el-table-column prop="created_at" label="提交时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link :loading="actingId === row.approval_id" @click="approve(row)">通过</el-button>
            <el-button type="danger" link :loading="actingId === row.approval_id" @click="reject(row)">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-alert v-if="tipMsg" :title="tipMsg" type="success" show-icon style="margin-top: 12px" />
  </div>
</template>

<script setup>
// 商品上架审批待办：运营提交、管理员审批通过/驳回
import { ref, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(false)
const actingId = ref('')
const list = ref([])
const tipMsg = ref('')

function refTypeLabel(type) {
  const map = { product_on_sale: '商品上架' }
  return map[type] || type
}

async function loadList() {
  loading.value = true
  try {
    const res = await $curl({ method: 'get', url: '/api/proj/approval/todo_list', query: { status: 'pending' } })
    if (res?.success) list.value = res.data?.list || []
  } finally {
    loading.value = false
  }
}

async function approve(row) {
  if (!window.confirm(`确认通过「${row.title}」？`)) return
  actingId.value = row.approval_id
  try {
    const res = await $curl({
      method: 'post',
      url: '/api/proj/approval/approve',
      data: { approval_id: row.approval_id, remark: '审批通过' },
    })
    if (res?.success) await loadList()
  } finally {
    actingId.value = ''
  }
}

async function reject(row) {
  const remark = window.prompt('请输入驳回原因', '不符合上架要求')
  if (remark === null) return
  actingId.value = row.approval_id
  try {
    const res = await $curl({
      method: 'post',
      url: '/api/proj/approval/reject',
      data: { approval_id: row.approval_id, remark },
    })
    if (res?.success) await loadList()
  } finally {
    actingId.value = ''
  }
}

onMounted(loadList)
</script>

<style lang="less" scoped>
.approval-page { padding: 16px 20px; }
.page-title { margin: 0 0 8px; font-size: 20px; }
.hint { color: #909399; font-size: 13px; margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
