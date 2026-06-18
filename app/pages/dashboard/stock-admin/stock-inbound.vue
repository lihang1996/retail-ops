<template>
  <div v-loading="loading" class="stock-inbound">
    <el-card>
      <template #header>商品入库</template>
      <el-form label-width="100px" @submit.prevent="submit">
        <el-form-item label="仓库">
          <el-select v-model="form.warehouse_id" placeholder="选择仓库" style="width: 320px" @change="loadLocations">
            <el-option v-for="w in warehouses" :key="w.warehouse_id" :label="w.warehouse_name" :value="w.warehouse_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="库位">
          <el-select v-model="form.location_id" placeholder="可选" clearable style="width: 320px">
            <el-option v-for="l in locations" :key="l.location_id" :label="l.location_code" :value="l.location_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="SKU ID">
          <el-input v-model="form.sku_id" placeholder="如 sku_demo_01" style="width: 320px" />
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="form.qty" :min="1" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" style="width: 320px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="submit">确认入库</el-button>
        </el-form-item>
      </el-form>
      <el-alert v-if="tipMsg" :title="tipMsg" :type="tipType" show-icon :closable="false" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(false)
const saving = ref(false)
const warehouses = ref([])
const locations = ref([])
const tipMsg = ref('')
const tipType = ref('success')
const form = reactive({
  warehouse_id: '',
  location_id: '',
  sku_id: 'sku_demo_01',
  qty: 10,
  remark: '',
})

async function loadWarehouses() {
  const res = await $curl({ method: 'get', url: '/api/proj/warehouse/list' })
  if (res?.success) warehouses.value = res.data || []
}

async function loadLocations() {
  form.location_id = ''
  if (!form.warehouse_id) {
    locations.value = []
    return
  }
  const res = await $curl({
    method: 'get',
    url: '/api/proj/warehouse/location/list',
    query: { warehouse_id: form.warehouse_id },
  })
  if (res?.success) locations.value = res.data || []
}

async function submit() {
  if (!form.warehouse_id || !form.sku_id || !form.qty) {
    tipType.value = 'warning'
    tipMsg.value = '请填写仓库、SKU 和数量'
    return
  }
  saving.value = true
  tipMsg.value = ''
  try {
    const res = await $curl({
      method: 'post',
      url: '/api/proj/stock/inbound',
      data: { ...form },
    })
    if (res?.success) {
      tipType.value = 'success'
      tipMsg.value = '入库成功'
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadWarehouses()
  } finally {
    loading.value = false
  }
})
</script>

<style lang="less" scoped>
.stock-inbound {
  padding: 16px;
}
</style>
