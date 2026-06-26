<template>
  <schema-drawer
    v-model="isShow"
    :title="title"
    size="400px"
  >
    <schema-form
      ref="schemaFormRef"
      v-loading="loading"
      :schema="components[name]?.schema"
      :model="dtoModel"
    />
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="loading" @click="save">{{ saveBtnText }}</el-button>
    </template>
  </schema-drawer>
</template>

<script setup>
import { ref, inject } from 'vue'
import { ElNotification } from 'element-plus'
import $curl from '$elpisCommon/curl.js'
import SchemaForm from '$elpisWidgets/schema-form/schema-form.vue'
import SchemaDrawer from '../schema-drawer.vue'

const { api, components } = inject('schemaViewData')

const emit = defineEmits(['command'])
const name = ref('editForm')

const schemaFormRef = ref(null)
const isShow = ref(false)
const loading = ref(false)
const title = ref('')
const saveBtnText = ref('')
const mainKey = ref('')
const mainValue = ref('')
const dtoModel = ref({})

const show = (rowData) => {
  const { config } = components.value[name.value]

  title.value = config.title
  saveBtnText.value = config.saveBtnText
  mainKey.value = config.mainKey
  mainValue.value = rowData[config.mainKey]
  dtoModel.value = {}

  isShow.value = true
  fetchFormData()
}

const close = () => {
  isShow.value = false
}

const fetchFormData = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await $curl({
      method: 'get',
      url: api.value,
      query: { [mainKey.value]: mainValue.value },
    })
    if (res?.success && res.data) dtoModel.value = res.data
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (loading.value) return
  if (!schemaFormRef.value.validate()) return

  loading.value = true
  try {
    const res = await $curl({
      method: 'put',
      url: api.value,
      data: {
        [mainKey.value]: mainValue.value,
        ...schemaFormRef.value.getValue(),
      },
    })
    if (!res?.success) return
    ElNotification({ title: '成功', message: '修改成功', type: 'success' })
    close()
    emit('command', { event: 'loadTableData' })
  } finally {
    loading.value = false
  }
}

defineExpose({ name, show })
</script>
