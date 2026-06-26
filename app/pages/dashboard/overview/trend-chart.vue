<template>
  <div ref="chartEl" class="trend-chart-echarts" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { formatMoney } from '../common/format.js'

const props = defineProps({
  trend: { type: Array, default: () => [] },
})

const chartEl = ref(null)
let chart = null
let resizeObserver = null

function formatAxisDate(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : dateStr
}

function formatGmvAxis(val) {
  const n = Number(val) || 0
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

function niceMax(value, fallback = 1) {
  const n = Math.max(Number(value) || 0, fallback)
  const magnitude = 10 ** Math.floor(Math.log10(n))
  const normalized = n / magnitude
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
  const nice = steps.find((step) => normalized <= step) || 10
  return nice * magnitude
}

function trimTrailingEmptyDays(trend) {
  const rows = [...trend]
  while (
    rows.length > 1
    && !Number(rows[rows.length - 1]?.orderCount || 0)
    && !Number(rows[rows.length - 1]?.gmv || 0)
  ) {
    rows.pop()
  }
  return rows
}

function buildOption(trend) {
  const displayTrend = trimTrailingEmptyDays(trend)
  const dates = displayTrend.map((t) => formatAxisDate(t.date))
  const orders = displayTrend.map((t) => Number(t.orderCount) || 0)
  const gmv = displayTrend.map((t) => Number(t.gmv) || 0)
  const maxOrder = Math.max(...orders, 1)
  const maxGmv = Math.max(...gmv, 1)
  const orderAxisMax = niceMax(maxOrder * 1.2, 5)
  const gmvAxisMax = niceMax(maxGmv * 1.12, 100)

  return {
    animationDuration: 420,
    animationEasing: 'cubicOut',
    backgroundColor: 'transparent',
    grid: {
      left: 8,
      right: 8,
      top: 48,
      bottom: 4,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: '#cbd5e1',
          width: 1,
          type: 'dashed',
        },
        label: { show: false },
      },
      confine: true,
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderWidth: 0,
      padding: [10, 12],
      extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(15,23,42,.15);',
      textStyle: { color: '#f8fafc', fontSize: 12, lineHeight: 20 },
      formatter(params) {
        const date = params[0]?.axisValue || ''
        const dataIndex = params[0]?.dataIndex ?? 0
        const order = params.find((p) => p.seriesName === '订单量')
        const revenue = params.find((p) => p.seriesName === 'GMV')
        return [
          `<div style="font-weight:600;margin-bottom:4px">${date}</div>`,
          `<span style="color:#fbbf24">●</span> GMV <b>¥${formatMoney(revenue?.value ?? gmv[dataIndex] ?? 0)}</b>`,
          `<br/><span style="color:#60a5fa">●</span> 订单量 <b>${order?.value ?? orders[dataIndex] ?? 0} 单</b>`,
        ].join('')
      },
    },
    axisPointer: {
      type: 'line',
      label: { show: false },
    },
    legend: {
      data: [
        { name: 'GMV', icon: 'roundRect', itemStyle: { color: '#f59e0b' } },
        { name: '订单量', icon: 'roundRect', itemStyle: { color: '#3b82f6' } },
      ],
      top: 4,
      right: 4,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: 500,
      },
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: true,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        margin: 10,
        hideOverlap: true,
      },
    },
    yAxis: [
      {
        type: 'value',
        position: 'left',
        max: gmvAxisMax,
        splitNumber: 4,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          formatter: formatGmvAxis,
        },
        splitLine: {
          lineStyle: { color: '#f1f5f9', type: 'dashed' },
        },
      },
      {
        type: 'value',
        position: 'right',
        max: orderAxisMax,
        minInterval: 1,
        splitNumber: 4,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '订单量',
        type: 'bar',
        yAxisIndex: 1,
        data: orders,
        barMaxWidth: 22,
        barGap: '30%',
        z: 1,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#93c5fd' },
            { offset: 1, color: '#3b82f6' },
          ]),
        },
        emphasis: {
          focus: 'none',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#bfdbfe' },
              { offset: 1, color: '#2563eb' },
            ]),
          },
        },
      },
      {
        name: 'GMV',
        type: 'line',
        yAxisIndex: 0,
        data: gmv,
        z: 3,
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: displayTrend.length <= 10,
        lineStyle: {
          width: 2.5,
          color: '#f59e0b',
          shadowColor: 'rgba(245, 158, 11, 0.2)',
          shadowBlur: 6,
          shadowOffsetY: 2,
        },
        itemStyle: {
          color: '#f59e0b',
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          focus: 'none',
          scale: false,
          itemStyle: {
            borderWidth: 2,
            shadowBlur: 4,
            shadowColor: 'rgba(245, 158, 11, 0.25)',
          },
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.18)' },
            { offset: 0.7, color: 'rgba(245, 158, 11, 0.04)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0)' },
          ]),
        },
      },
    ],
  }
}

function renderChart() {
  if (!chartEl.value) return
  if (!props.trend?.length) {
    chart?.clear()
    return
  }
  if (!chart) {
    chart = echarts.init(chartEl.value, null, { renderer: 'canvas' })
  }
  chart.setOption(buildOption(props.trend), { notMerge: true })
  chart.resize()
}

watch(
  () => props.trend,
  () => renderChart(),
  { deep: true },
)

onMounted(() => {
  renderChart()
  if (typeof ResizeObserver !== 'undefined' && chartEl.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(chartEl.value)
  }
  window.addEventListener('resize', handleWindowResize)
})

function handleWindowResize() {
  chart?.resize()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize)
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style lang="less" scoped>
.trend-chart-echarts {
  width: 100%;
  height: 280px;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
