<template>
  <div v-loading="loading" class="org-role-perm">
    <el-card>
      <template #header>
        <div class="header-row">
          <span>角色权限分配</span>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </div>
      </template>

      <el-form label-width="90px">
        <el-form-item label="选择角色">
          <el-select v-model="selectedRoleId" placeholder="请选择角色" style="width: 320px" @change="loadRolePermissions">
            <el-option
              v-for="role in roles"
              :key="role.role_id"
              :label="`${role.role_name} (${role.role_code})`"
              :value="role.role_id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="tipMsg"
        :title="tipMsg"
        :type="tipType"
        show-icon
        :closable="false"
        class="tip-alert"
      />

      <el-empty v-if="!selectedRoleId" description="请先选择角色" />

      <div v-else class="perm-groups">
        <el-card v-for="(items, group) in permissionTree" :key="group" class="perm-group" shadow="never">
          <template #header>{{ groupLabel(group) }}</template>
          <el-checkbox-group v-model="checkedIds">
            <el-checkbox
              v-for="item in items"
              :key="item.permissionId"
              :label="item.permissionId"
              class="perm-item"
            >
              {{ item.description || item.permissionCode }}
              <span class="perm-code">{{ item.permissionCode }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const loading = ref(false)
const saving = ref(false)
const roles = ref([])
const permissionTree = ref({})
const selectedRoleId = ref('')
const checkedIds = ref([])
const tipMsg = ref('')
const tipType = ref('success')

const groupLabel = (group) => ({
  menu: '菜单权限',
  action: '操作权限',
  data: '数据权限',
  field: '字段权限',
}[group] || group)

async function loadRoles() {
  const res = await $curl({
    method: 'get',
    url: '/api/proj/org/role/list',
  })
  if (res?.success) {
    roles.value = res.data || []
  }
}

async function loadPermissionTree() {
  const res = await $curl({
    method: 'get',
    url: '/api/proj/permission/tree',
  })
  if (res?.success) {
    permissionTree.value = res.data || {}
  }
}

async function loadRolePermissions() {
  if (!selectedRoleId.value) return
  loading.value = true
  try {
    const res = await $curl({
      method: 'get',
      url: '/api/proj/org/role_permissions',
      query: { role_id: selectedRoleId.value },
    })
    checkedIds.value = res?.data?.permissionIds || []
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!selectedRoleId.value) {
    tipType.value = 'warning'
    tipMsg.value = '请先选择角色'
    return
  }
  saving.value = true
  tipMsg.value = ''
  try {
    const res = await $curl({
      method: 'post',
      url: '/api/proj/org/role_permissions',
      data: {
        role_id: selectedRoleId.value,
        permission_ids: checkedIds.value,
      },
    })
    if (res?.success) {
      tipType.value = 'success'
      tipMsg.value = '权限已保存'
    }
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadRoles(), loadPermissionTree()])
  } finally {
    loading.value = false
  }
})
</script>

<style lang="less" scoped>
.org-role-perm {
  padding: 16px;
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.perm-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.perm-group {
  :deep(.el-card__body) {
    padding-top: 8px;
  }
}
.perm-item {
  display: flex;
  width: 100%;
  margin-right: 0;
  margin-bottom: 8px;
}
.perm-code {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
.tip-alert {
  margin-bottom: 12px;
}
</style>
