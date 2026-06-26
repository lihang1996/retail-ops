<template>
  <div class="ai-page">
    <h2>AI 业务助手</h2>
    <p class="hint">
      面向新同事的业务流程向导：可问「订单怎么发货」「商品怎么上架」等，会给出分步操作与跳转链接；
      也支持只读问数（库存风险、近 7 天订单趋势）。
    </p>

    <div v-if="suggestions.length" class="suggestions">
      <span class="suggestions-label">试试这些问题：</span>
      <el-button
        v-for="q in suggestions"
        :key="q"
        size="small"
        round
        @click="askSuggestion(q)"
      >{{ q }}</el-button>
    </div>

    <el-card class="chat-card">
      <div class="history">
        <div v-for="item in messages" :key="item.queryId || item.question" class="msg-block">
          <div class="q">问：{{ item.question }}</div>
          <div v-if="item.playbookTitle" class="playbook-tag">
            流程指引 · {{ item.playbookTitle }}
          </div>
          <div class="a">答：{{ item.answer }}</div>

          <ol v-if="item.steps?.length" class="steps">
            <li v-for="step in item.steps" :key="step.order" class="step-item">
              <div class="step-head">
                <span class="step-order">{{ step.order }}</span>
                <strong>{{ step.title }}</strong>
              </div>
              <p class="step-desc">{{ step.description }}</p>
              <el-button
                v-if="step.path"
                type="primary"
                link
                @click="go(step.path)"
              >{{ step.linkLabel || step.title }} →</el-button>
            </li>
          </ol>

          <div v-if="item.dataSource && item.dataSource !== 'none'" class="meta">
            数据来源：{{ item.dataSource }}
          </div>
          <div v-if="item.links?.length && !item.steps?.length" class="links">
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
        placeholder="例如：订单从导入到发货怎么走？库存不足的 SKU 有哪些？"
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
import { useRoute } from 'vue-router'
import { aiApi } from '../api/ai-api.js'
import { unwrapData } from '../api/http.js'
import { useDashboardNav } from '../common/use-dashboard-nav.js'

const { go } = useDashboardNav()
const route = useRoute()

const question = ref('')
const loading = ref(false)
const messages = ref([])
const conversationId = ref('')
const suggestions = ref([])

function mapMessage(row) {
  return {
    queryId: row.query_id || row.queryId,
    question: row.question,
    answer: row.answer,
    type: row.type,
    playbookId: row.playbookId,
    playbookTitle: row.playbookTitle,
    dataSource: row.data_source || row.dataSource,
    steps: row.steps || [],
    links: row.links || [],
  }
}

async function loadSuggestions() {
  try {
    const res = await aiApi.suggestions()
    const data = unwrapData(res)
    suggestions.value = data?.questions || []
  } catch {
    suggestions.value = []
  }
}

async function loadHistory() {
  const res = await aiApi.history(conversationId.value ? { conversation_id: conversationId.value } : {})
  const rows = unwrapData(res, [])
  if (Array.isArray(rows)) {
    messages.value = rows.reverse().map(mapMessage)
  }
}

function askSuggestion(q) {
  question.value = q
  send()
}

async function send() {
  if (!question.value.trim()) return
  loading.value = true
  const asked = question.value
  try {
    const res = await aiApi.query({
      question: asked,
      conversation_id: conversationId.value || undefined,
    })
    const payload = unwrapData(res)
    if (payload) {
      conversationId.value = payload.conversationId
      messages.value.push(mapMessage({
        queryId: payload.queryId,
        question: asked,
        answer: payload.answer,
        type: payload.type,
        playbookId: payload.playbookId,
        playbookTitle: payload.playbookTitle,
        dataSource: payload.dataSource,
        steps: payload.steps,
        links: payload.links,
      }))
      question.value = ''
      if (payload.suggestions?.length) {
        suggestions.value = payload.suggestions
      }
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadSuggestions()
  await loadHistory()
  const preset = route.query.q
  if (typeof preset === 'string' && preset.trim()) {
    question.value = preset.trim()
    await send()
  }
})
</script>

<style lang="less" scoped>
.ai-page {
  padding: var(--spacing-6);
  max-width: 1000px;
  margin: 0 auto;

  h2 {
    margin: 0 0 var(--spacing-3);
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--color-gray-900);
    letter-spacing: var(--tracking-tight);
  }
}

.hint {
  color: var(--color-gray-600);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-5);
  background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-secondary-50) 100%);
  border-left: 4px solid var(--color-primary-500);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-5);

  .suggestions-label {
    font-size: var(--text-sm);
    color: var(--color-gray-600);
    margin-right: var(--spacing-1);
  }
}

.chat-card {
  border: 1px solid var(--app-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;

  :deep(.el-card__body) {
    padding: var(--spacing-6);
  }
}

.history {
  max-height: 500px;
  overflow-y: auto;
  margin-bottom: var(--spacing-5);
  padding-right: var(--spacing-2);
}

.msg-block {
  margin-bottom: var(--spacing-5);
  padding: var(--spacing-5);
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  border: 1px solid var(--app-border);

  &:last-child {
    margin-bottom: 0;
  }

  .q {
    font-weight: var(--font-semibold);
    margin-bottom: var(--spacing-2);
    color: var(--color-gray-900);
    font-size: var(--text-base);
  }

  .playbook-tag {
    display: inline-block;
    font-size: var(--text-xs);
    color: var(--color-primary-700);
    background: var(--color-primary-50);
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--radius-full);
    margin-bottom: var(--spacing-3);
  }

  .a {
    color: var(--color-gray-700);
    line-height: var(--leading-relaxed);
    font-size: var(--text-sm);
    padding: var(--spacing-4);
    background: white;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-gray-200);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .steps {
    margin: var(--spacing-4) 0 0;
    padding: 0;
    list-style: none;

    .step-item {
      padding: var(--spacing-3) var(--spacing-4);
      margin-bottom: var(--spacing-2);
      background: white;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-gray-200);
    }

    .step-head {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      margin-bottom: var(--spacing-1);
    }

    .step-order {
      width: 22px;
      height: 22px;
      border-radius: var(--radius-full);
      background: var(--color-primary-500);
      color: white;
      font-size: var(--text-xs);
      font-weight: var(--font-bold);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-desc {
      margin: 0 0 var(--spacing-2);
      font-size: var(--text-sm);
      color: var(--color-gray-600);
      line-height: var(--leading-relaxed);
    }
  }

  .meta {
    font-size: var(--text-xs);
    color: var(--color-gray-500);
    margin-top: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-primary-50);
    border-radius: var(--radius-sm);
    display: inline-block;
    font-family: var(--font-mono);
  }

  .links {
    margin-top: var(--spacing-3);
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }
}

.actions {
  margin-top: var(--spacing-4);
  text-align: right;
}
</style>
