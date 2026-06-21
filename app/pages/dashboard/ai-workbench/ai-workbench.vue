<template>
  <div class="ai-page">
    <h2>AI 工作台</h2>
    <p class="hint">只读分析：库存风险、订单趋势、商品信息（不执行写操作）</p>

    <el-card class="chat-card">
      <div class="history">
        <div v-for="item in messages" :key="item.queryId || item.question" class="msg-block">
          <div class="q">问：{{ item.question }}</div>
          <div class="a">答：{{ item.answer }}</div>
          <div v-if="item.dataSource" class="meta">数据来源：{{ item.dataSource }}</div>
          <div v-if="item.links?.length" class="links">
            <el-button
              v-for="link in item.links"
              :key="link.path"
              type="primary"
              link
              @click="go(link.path)"
            >{{ link.label }}</el-button>
          </div>
        </div>
      </div>

      <el-input
        v-model="question"
        type="textarea"
        :rows="3"
        placeholder="例如：库存不足的 SKU有哪些？最近7天订单趋势？"
        @keydown.enter.ctrl="send"
      />
      <div class="actions">
        <el-button type="primary" :loading="loading" @click="send">发送</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import $curl from '$elpisCommon/curl.js'

const question = ref('')
const loading = ref(false)
const messages = ref([])
const conversationId = ref('')

async function loadHistory() {
  const res = await $curl({
    method: 'get',
    url: '/api/proj/ai/history',
    query: conversationId.value ? { conversation_id: conversationId.value } : {},
  })
  if (res?.success) {
    messages.value = (res.data || []).reverse().map((r) => ({
      queryId: r.query_id,
      question: r.question,
      answer: r.answer,
      dataSource: r.data_source,
      links: [],
    }))
  }
}

async function send() {
  if (!question.value.trim()) return
  loading.value = true
  try {
    const res = await $curl({
      method: 'post',
      url: '/api/proj/ai/query',
      data: { question: question.value, conversation_id: conversationId.value || undefined },
    })
    if (res?.success) {
      conversationId.value = res.data.conversationId
      messages.value.push({
        queryId: res.data.queryId,
        question: question.value,
        answer: res.data.answer,
        dataSource: res.data.dataSource,
        links: res.data.links || [],
      })
      question.value = ''
    }
  } finally {
    loading.value = false
  }
}

function go(path) {
  window.location.href = path
}

onMounted(loadHistory)
</script>

<style lang="less" scoped>
.ai-page { padding: 20px 24px; }
.hint { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
.chat-card { max-width: 900px; }
.history { max-height: 420px; overflow-y: auto; margin-bottom: 16px; }
.msg-block {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
  .q { font-weight: 600; margin-bottom: 6px; }
  .a { color: #374151; }
  .meta { font-size: 12px; color: #9ca3af; margin-top: 6px; }
}
.actions { margin-top: 12px; text-align: right; }
</style>
