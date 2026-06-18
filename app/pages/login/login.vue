<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-title">Retail Ops</div>
        <div class="login-subtitle">智能零售运营中台</div>
      </template>

      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="账号">
          <el-input v-model="account" placeholder="请输入账号" clearable />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            placeholder="请输入密码"
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
        <el-button
          type="primary"
          class="login-btn"
          :loading="loading"
          @click="onSubmit"
        >
          登录
        </el-button>
      </el-form>

      <div class="login-tip">演示账号将在 M1 接入后提供</div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const account = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const onSubmit = () => {
  if (!account.value || !password.value) {
    errorMsg.value = '请输入账号和密码'
    return
  }
  // M1 接入真实登录 API
  errorMsg.value = '登录功能开发中，请等待 M1 完成'
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
  color: #303133;
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
.login-tip {
  margin-top: 16px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}
</style>
