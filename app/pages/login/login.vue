<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-title">Retail Ops</div>
        <div class="login-subtitle">智能零售运营中台</div>
      </template>

      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="账号">
          <el-input v-model="account" placeholder="admin@retail.demo" clearable />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            placeholder="demo123"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-alert
          v-if="errorMsg"
          :title="errorMsg"
          type="error"
          show-icon
          :closable="false"
          class="login-error"
        />
        <el-button type="primary" class="login-btn" :loading="loading" @click="onSubmit">
          登录
        </el-button>
      </el-form>

      <div class="demo-accounts">
        <span class="tip">演示账号（密码均为 demo123）：</span>
        <el-button
          v-for="item in demoAccounts"
          :key="item.account"
          size="small"
          link
          type="primary"
          @click="fillDemo(item)"
        >
          {{ item.label }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { setToken, getToken } from '$retailAuth'

const account = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const demoAccounts = [
  { label: '管理员', account: 'admin@retail.demo' },
  { label: '运营', account: 'ops@retail.demo' },
  { label: '仓库', account: 'warehouse@retail.demo' },
]

onMounted(() => {
  if (getToken()) {
    window.location.href = '/view/project-list'
  }
})

const fillDemo = (item) => {
  account.value = item.account
  password.value = 'demo123'
}

const onSubmit = async () => {
  if (!account.value || !password.value) {
    errorMsg.value = '请输入账号和密码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: account.value, password: password.value }),
    })
    const data = await res.json()
    if (!data.success) {
      errorMsg.value = data.message || '登录失败'
      return
    }
    setToken(data.data.token)
    window.location.href = data.data.defaultEntry || '/view/project-list'
  } catch {
    errorMsg.value = '网络异常，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="less" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}
.login-card {
  width: 400px;
}
.login-title {
  font-size: 22px;
  font-weight: bold;
}
.login-subtitle {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.login-btn {
  width: 100%;
  margin-top: 8px;
}
.login-error {
  margin-bottom: 12px;
}
.demo-accounts {
  margin-top: 16px;
  font-size: 12px;
  color: #909399;
  .tip {
    display: block;
    margin-bottom: 6px;
  }
}
</style>
