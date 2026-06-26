<template>
  <div v-loading="loading" class="overview-page">
    <header class="page-head">
      <p class="page-desc">
        聚合订单、履约、库存与出入库指标。先看异常，再进入具体业务处理。
      </p>
      <div v-if="data.stockHealthRate != null" class="health-pill" :class="healthTone">
        <span class="health-label">库存健康度</span>
        <strong>{{ data.stockHealthRate }}%</strong>
      </div>
    </header>

    <section v-if="showAiGuide" class="ai-guide-banner">
      <div class="ai-guide-copy">
        <strong>不懂业务流程？</strong>
        <p>在 AI 业务助手中用自然语言提问，例如「订单怎么发货」「上架审批在哪里」，获取分步操作与页面跳转。</p>
      </div>
      <div class="ai-guide-actions">
        <el-button type="primary" @click="go(aiWorkbenchPath)">打开 AI 业务助手</el-button>
        <el-button @click="goAiWithQuestion('我是新人，从哪里开始？')">新人入门</el-button>
      </div>
    </section>

    <div v-if="error" class="overview-error">
      <span>{{ error.message }}</span>
      <el-button size="small" @click="load">重试</el-button>
    </div>

    <section v-if="metricCards.length" class="metrics-section">
      <div class="metrics-grid">
        <KpiCard
          v-for="item in metricCards"
          :key="item.key"
          :icon="item.icon"
          :label="item.label"
          :value="item.value"
          :hint="item.hint"
          :tone="item.tone"
          :clickable="Boolean(item.path)"
          @select="item.path && go(item.path)"
        />
      </div>
    </section>

    <el-empty
      v-else-if="!loading"
      description="当前角色无可查看的经营指标"
    />

    <div class="content-grid">
      <section
        v-if="data.visibility && data.visibility.trend && data.trend && data.trend.length"
        class="panel trend-panel"
      >
        <div class="panel-head">
          <h3 class="panel-title">近 7 天订单趋势</h3>
          <span v-if="trendSummary" class="panel-meta trend-summary">
            <span class="trend-summary-item">
              <i class="trend-summary-dot orders" aria-hidden="true" />
              7日 {{ trendSummary.orders }} 单
            </span>
            <span class="trend-summary-sep" aria-hidden="true">·</span>
            <span class="trend-summary-item">
              <i class="trend-summary-dot gmv" aria-hidden="true" />
              ¥{{ formatMoney(trendSummary.gmv) }}
            </span>
          </span>
        </div>
        <TrendChart :trend="data.trend" class="trend-chart-wrap" />
      </section>

      <section class="panel focus-panel">
        <div class="panel-head">
          <h3 class="panel-title">今日关注</h3>
          <span class="panel-meta">自动汇总</span>
        </div>
        <ul class="focus-list">
          <li v-for="item in todoItems" :key="item.key">
            <button type="button" class="focus-item" @click="go(item.path)">
              <span class="focus-dot" :class="item.tone" />
              <span class="focus-body">
                <span class="focus-title">{{ item.title }}</span>
                <span class="focus-desc">{{ item.desc }}</span>
              </span>
              <span class="focus-value">{{ item.value }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <section
      v-if="data.visibility && data.visibility.audit && enrichedAuditLogs.length"
      class="panel-wrap"
    >
      <OverviewAuditFeed
        :items="enrichedAuditLogs"
        :today-count="data.todayAuditCount"
        view-all-path="audit"
        @view-all="go(opsPath('audit_log'))"
      />
    </section>

    <QuickEntryGrid :items="quickCards" @select="go" />
  </div>
</template>

<script setup>
import TrendChart from './trend-chart.vue'
import KpiCard from '../common/kpi-card.vue'
import { formatMoney } from '../common/format.js'
import OverviewAuditFeed from './OverviewAuditFeed.vue'
import QuickEntryGrid from './QuickEntryGrid.vue'
import { useOverviewData } from './use-overview-data.js'

const {
  loading,
  error,
  data,
  healthTone,
  trendSummary,
  metricCards,
  todoItems,
  quickCards,
  enrichedAuditLogs,
  showAiGuide,
  aiWorkbenchPath,
  opsPath,
  go,
  load,
} = useOverviewData()

function goAiWithQuestion(q) {
  const base = aiWorkbenchPath.value
  if (!base) return
  const sep = base.includes('?') ? '&' : '?'
  go(`${base}${sep}q=${encodeURIComponent(q)}`)
}
</script>

<style lang="less" scoped>
.overview-page {
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  min-width: 0;
  overflow-x: hidden;
  padding: 16px 24px 32px;
}

.overview-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
}

.panel-wrap :deep(.audit-panel) {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

@media (min-width: 1440px) {
  .overview-page {
    padding-inline: 28px;
  }
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-desc {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.ai-guide-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
}

.ai-guide-copy {
  min-width: 0;

  strong {
    display: block;
    margin-bottom: 4px;
    color: #0f172a;
    font-size: 14px;
  }

  p {
    margin: 0;
    color: #475569;
    font-size: 12px;
    line-height: 1.6;
  }
}

.ai-guide-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  flex-wrap: wrap;
}

.health-pill {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;

  &.is-good strong { color: #16a34a; }
  &.is-warn strong { color: #d97706; }
  &.is-bad strong { color: #dc2626; }
}

.health-label {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
}

.health-pill strong {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.metrics-section {
  margin-bottom: 20px;
}

.metrics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.metrics-grid :deep(.biz-kpi-card) {
  flex: 1 1 0;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  min-width: 0;
  width: 100%;
}

.panel {
  min-width: 0;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.panel-title {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.panel-meta {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
}

.trend-panel {
  overflow: hidden;
  min-width: 0;
}

.trend-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.trend-summary-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.trend-summary-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;

  &.orders { background: #2563eb; }
  &.gmv { background: #f59e0b; border-radius: 999px; }
}

.trend-summary-sep {
  color: #cbd5e1;
}

.trend-chart-wrap {
  padding: 0 16px 14px 12px;
  box-sizing: border-box;
  overflow: hidden;
}

.focus-list {
  list-style: none;
  margin: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.focus-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  background: #fafbfc;
  cursor: pointer;
  text-align: left;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: #dbeafe;
    background: #f8fbff;
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }
}

.focus-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #94a3b8;

  &.warning { background: #f59e0b; }
  &.danger { background: #ef4444; }
  &.success { background: #22c55e; }
  &.info { background: #3b82f6; }
}

.focus-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.focus-title {
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
}

.focus-desc {
  color: #94a3b8;
  font-size: 11px;
}

.focus-value {
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .overview-page {
    padding: 16px 16px 24px;
  }

  .ai-guide-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .page-head {
    flex-direction: column;
    align-items: stretch;
  }

  .health-pill {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .metrics-grid :deep(.biz-kpi-card) {
    flex: 1 1 calc(50% - 6px);
    min-width: calc(50% - 6px);
  }

}
</style>
