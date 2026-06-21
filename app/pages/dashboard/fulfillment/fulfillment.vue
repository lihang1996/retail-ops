<template>
  <div v-loading="loading" class="fulfillment-page">
    <el-card class="section-card">
      <template #header>
        <div class="card-header">
          <span>订单导入</span>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".xlsx,.xls,.csv"
            @change="onFileChange"
          >
            <el-button type="primary" :loading="importing">选择 Excel 导入</el-button>
          </el-upload>
        </div>
      </template>
      <el-alert
        title="模板列：店铺名称、SKU编码、数量、单价（可选：订单号、客户名称）"
        type="info"
        :closable="false"
        show-icon
      />
      <div v-if="importResult" class="import-result">
        <el-tag type="success">成功 {{ importResult.success }} 行</el-tag>
        <el-tag type="danger" style="margin-left: 8px">失败 {{ importResult.fail }} 行</el-tag>
        <el-table v-if="importResult.errors?.length" :data="importResult.errors" size="small" style="margin-top: 12px">
          <el-table-column prop="rowNo" label="行号" width="80" />
          <el-table-column prop="reason" label="原因" />
        </el-table>
      </div>
    </el-card>

    <el-card class="section-card">
      <template #header>待支付订单</template>
      <el-table :data="pendingOrders" size="small" stripe>
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="store_name" label="店铺" width="120" />
        <el-table-column prop="total_amount" label="金额" width="90" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" link :loading="actionId === row.order_id" @click="mockPay(row)">模拟支付</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card">
      <template #header>待分仓 / 已支付订单</template>
      <el-table :data="paidOrders" size="small" stripe>
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="store_name" label="店铺" width="120" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button type="warning" link @click="allocate(row)">分仓</el-button>
            <el-button type="primary" link @click="createShipment(row)">生成发货单</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card">
      <template #header>发货单 / 拣货</template>
      <el-table :data="shipments" size="small" stripe>
        <el-table-column prop="shipment_no" label="发货单号" width="180" />
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="warehouse_name" label="仓库" width="120" />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column label="操作" width="320">
          <template #default="{ row }">
            <el-button v-if="row.status === 'created'" type="primary" link @click="startPick(row)">开始拣货</el-button>
            <el-button v-if="row.status === 'picking'" type="warning" link @click="confirmPick(row)">确认拣货</el-button>
            <el-button v-if="row.status === 'picked'" type="success" link @click="ship(row)">出库发货</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-alert v-if="tipMsg" :title="tipMsg" :type="tipType" show-icon :closable="false" style="margin-top: 16px" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(false)
const importing = ref(false)
const actionId = ref('')
const tipMsg = ref('')
const tipType = ref('success')
const orders = ref([])
const shipments = ref([])
const importResult = ref(null)

const pendingOrders = computed(() => orders.value.filter((o) => o.status === 'pending_payment'))
const paidOrders = computed(() => orders.value.filter((o) => ['paid', 'allocated'].includes(o.status)))

function toast(msg, type = 'success') {
  tipMsg.value = msg
  tipType.value = type
}

async function loadAll() {
  loading.value = true
  try {
    const [orderRes, shipRes] = await Promise.all([
      $curl({ method: 'get', url: '/api/proj/order/list' }),
      $curl({ method: 'get', url: '/api/proj/shipment/list' }),
    ])
    if (orderRes?.success) orders.value = orderRes.data || []
    if (shipRes?.success) shipments.value = shipRes.data || []
  } finally {
    loading.value = false
  }
}

async function onFileChange(uploadFile) {
  const file = uploadFile?.raw
  if (!file) return
  importing.value = true
  tipMsg.value = ''
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $curl({
      method: 'post',
      url: '/api/proj/order/import',
      data: form,
    })
    if (res?.success) {
      importResult.value = res.data
      toast(`导入完成：成功 ${res.data.success}，失败 ${res.data.fail}`)
      await loadAll()
    } else {
      toast(res?.message || '导入失败', 'error')
    }
  } catch (e) {
    toast(e.message || '导入失败', 'error')
  } finally {
    importing.value = false
  }
}

async function mockPay(row) {
  actionId.value = row.order_id
  try {
    const res = await $curl({ method: 'post', url: '/api/proj/order/mock_pay', data: { order_id: row.order_id } })
    if (res?.success) {
      toast(`支付成功，仓库：${res.data.warehouseId}`)
      await loadAll()
    } else {
      toast(res?.message || '支付失败', 'error')
    }
  } finally {
    actionId.value = ''
  }
}

async function allocate(row) {
  const res = await $curl({ method: 'post', url: '/api/proj/order/allocate', data: { order_id: row.order_id } })
  if (res?.success) {
    toast(res.data.reason || '分仓完成')
    await loadAll()
  } else {
    toast(res?.message || '分仓失败', 'error')
  }
}

async function createShipment(row) {
  const res = await $curl({
    method: 'post',
    url: '/api/proj/shipment/create_from_order',
    data: { order_id: row.order_id },
  })
  if (res?.success) {
    toast(`发货单已创建：${res.data.shipmentNo}`)
    await loadAll()
  } else {
    toast(res?.message || '创建失败', 'error')
  }
}

async function startPick(row) {
  const res = await $curl({ method: 'post', url: '/api/proj/shipment/start_pick', data: { shipment_id: row.shipment_id } })
  if (res?.success) {
    toast('已开始拣货')
    await loadAll()
  } else {
    toast(res?.message || '操作失败', 'error')
  }
}

async function confirmPick(row) {
  const res = await $curl({ method: 'post', url: '/api/proj/shipment/confirm_pick', data: { shipment_id: row.shipment_id } })
  if (res?.success) {
    toast('拣货已确认')
    await loadAll()
  } else {
    toast(res?.message || '操作失败', 'error')
  }
}

async function ship(row) {
  const res = await $curl({ method: 'post', url: '/api/proj/shipment/ship', data: { shipment_id: row.shipment_id } })
  if (res?.success) {
    toast('出库发货完成')
    await loadAll()
  } else {
    toast(res?.message || '发货失败', 'error')
  }
}

onMounted(loadAll)
</script>

<style lang="less" scoped>
.fulfillment-page {
  padding: 16px;
}
.section-card {
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.import-result {
  margin-top: 12px;
}
</style>
