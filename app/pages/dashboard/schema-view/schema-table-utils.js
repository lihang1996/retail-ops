const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function isStatusColumn(key) {
  return key === 'status' || key.endsWith('_status') || key === 'stock_risk' || key === 'risk_level'
}

export function statusDomain(key) {
  if (key === 'stock_risk' || key === 'risk_level') return 'stock'
  if (key === 'approval_status') return 'approval'
  if (key === 'status') return 'product'
  return 'common'
}

export function normalizeColumnOption(key, option = {}) {
  const next = { ...option }
  const width = Number(next.width)

  delete next['show-overflow-tooltip']
  next.showOverflowTooltip = false

  if (!Number.isNaN(width) && width > 0) {
    next.minWidth = width
    delete next.width
  } else if (next.minWidth === undefined && next['min-width'] === undefined) {
    next.minWidth = 96
  }

  if (isStatusColumn(key)) {
    next.align = 'center'
    next.className = 'col-status'
    if (key === 'stock_risk' || key === 'risk_level' || key === 'approval_status') {
      next.minWidth = Math.max(Number(next.minWidth) || 0, 108)
    }
  }

  return next
}

export function visibleSchemaEntries(schema = {}) {
  const properties = schema?.properties ?? {}
  return Object.entries(properties).filter(([, item]) => item?.option?.visible !== false)
}

export function resolveOperationWidth(buttons = []) {
  if (!buttons.length) return 64
  const textWidth = buttons.reduce((sum, btn) => sum + (btn.label?.length ?? 2) * 14, 0)
  return Math.max(64, textWidth + (buttons.length - 1) * 10 + 20)
}

export function shouldEnableFixedColumns(schema = {}, operationWidth = 64) {
  const entries = visibleSchemaEntries(schema)
  if (entries.length >= 8) return true

  const totalMin = entries.reduce((sum, [, item]) => {
    const raw = item?.option?.width ?? 96
    return sum + (Number(raw) || 96)
  }, 0) + operationWidth

  return totalMin >= 1020
}

export function buildSchemaColumns(schema = {}, { enableFixedColumns = false } = {}) {
  return visibleSchemaEntries(schema).map(([key, item], index) => {
    const option = { ...normalizeColumnOption(key, item.option ?? {}) }

    if (enableFixedColumns && index === 0 && key.endsWith('_id')) {
      const idWidth = Math.min(Number(option.minWidth) || 168, 156)
      option.fixed = 'left'
      option.width = idWidth
      delete option.minWidth
      option.className = 'col-id'
      option.showOverflowTooltip = false
    }

    return { key, schema: item, option }
  })
}

export function formatCellValue(value, key, option) {
  if (value === undefined || value === null || value === '') return '—'

  if (option?.toFixed !== undefined && typeof value === 'number') {
    return value.toFixed(option.toFixed)
  }

  if ((key.endsWith('_at') || key.endsWith('_time')) && typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return dateFormatter.format(date).replaceAll('/', '-')
  }

  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function shouldShowCellTooltip(value) {
  return value !== undefined && value !== null && value !== ''
}
