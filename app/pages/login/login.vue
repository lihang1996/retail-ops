<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-title">Retail Ops</div>
        <div class="login-subtitle">智能零售运营中台</div>
      </template>

      <el-alert
        v-if="enableDemoLogin"
        title="本地演示账号 · 点击后填入账号"
        type="info"
        :closable="false"
        show-icon
        class="demo-alert"
      />

      <el-table v-if="enableDemoLogin" :data="demoAccounts" size="small" class="demo-table" @row-click="fillDemo">
        <el-table-column prop="label" label="角色" width="88" />
        <el-table-column prop="account" label="账号" min-width="160" />
        <el-table-column label="操作" width="72" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="fillDemo(row)">填入</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-form label-position="top" class="login-form" @submit.prevent="onSubmit">
        <el-form-item label="账号">
          <el-input v-model="account" clearable />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
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
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getToken, login } from '$retailAuth'

const DEFAULT_ACCOUNT = 'admin@retail.demo'
const enableDemoLogin = (() => {
  const host = window.location.hostname
  const demoQuery = new URLSearchParams(window.location.search).get('demo_login')
  return demoQuery === '1' || ['localhost', '127.0.0.1', '0.0.0.0'].includes(host)
})()

const account = ref(enableDemoLogin ? DEFAULT_ACCOUNT : '')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const demoAccounts = [
  { label: '管理员', account: 'admin@retail.demo' },
  { label: '运营', account: 'ops@retail.demo' },
  { label: '仓库主管', account: 'warehouse@retail.demo' },
  { label: '财务', account: 'finance@retail.demo' },
  { label: '分析师', account: 'analyst@retail.demo' },
]

onMounted(() => {
  if (getToken()) {
    window.location.href = '/view/project-list'
  }
})

const fillDemo = (row) => {
  account.value = row.account
  password.value = ''
}

const onSubmit = async () => {
  if (!account.value || !password.value) {
    errorMsg.value = '请输入账号和密码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    const payload = await login(account.value, password.value)
    window.location.href = payload.defaultEntry || '/view/project-list'
  } catch (error) {
    errorMsg.value = error?.message || '网络异常，请稍后重试'
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
  padding: 24px;
  background:
    radial-gradient(ellipse 70% 55% at 18% 12%, rgba(37, 99, 235, 0.13), transparent),
    radial-gradient(ellipse 55% 50% at 88% 78%, rgba(14, 165, 233, 0.11), transparent),
    linear-gradient(160deg, #f8fbff 0%, #eef5ff 48%, #f7f9fc 100%);
}

.login-card {
  width: 100%;
  max-width: 440px;
  border: 1px solid rgba(203, 213, 225, 0.78);
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.13);

  :deep(.el-card__header) {
    padding: 24px 24px 16px;
    border-bottom: 1px solid var(--app-border, rgba(203, 213, 225, 0.7));
  }

  :deep(.el-card__body) {
    padding: 20px 24px 24px;
  }
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--el-text-color-primary, #0f172a);
}

.login-subtitle {
  font-size: 13px;
  color: var(--app-text-muted, #64748b);
  margin-top: 6px;
}

.demo-alert {
  margin-bottom: 14px;
}

.demo-table {
  margin-bottom: 16px;
  cursor: pointer;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  overflow: hidden;
}

.login-form {
  margin-top: 4px;
}

.login-btn {
  width: 100%;
  margin-top: 12px;
  height: 40px;
  font-weight: 600;
}

.login-error {
  margin-bottom: 12px;
}
</style>
