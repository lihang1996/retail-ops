/**
 * @module service/ai
 * @description AI 业务助手：优先回答业务流程（playbook），其次只读问数（库存/订单）。
 */
const { ensureDb, getTenantId, getOperatorId, bizError, idGen } = require('../common/org-helper')
const { getUserPermissionCodes } = require('../common/permission-resolver')
const { buildOverviewPath, buildSchemaPath } = require('../common/dashboard-paths')
const {
  matchPlaybook,
  buildPlaybookResponse,
  getSuggestedQuestions,
  listAccessiblePlaybooks,
} = require('../knowledge')

const DATA_KEYWORDS = {
  stock: ['库存不足的', '缺货', '风险sku', '低于预警'],
  order: ['最近7天', '订单趋势', '近7天', '销量趋势'],
}

async function runDataQuery(app, tenantId, question) {
  const db = ensureDb(app)
  const q = question.toLowerCase()

  if (DATA_KEYWORDS.stock.some((k) => question.includes(k) || q.includes(k.replace(/\s/g, '')))) {
    const rows = await db('stocks as s')
      .join('product_skus as sku', 's.sku_id', 'sku.sku_id')
      .leftJoin('products as p', 'sku.product_id', 'p.product_id')
      .where('s.tenant_id', tenantId)
      .whereRaw('s.available_qty <= s.warning_qty')
      .select('sku.sku_code', 'p.product_name', 's.available_qty', 's.warning_qty')
      .limit(20)
    return {
      type: 'data',
      answer: rows.length
        ? `发现 ${rows.length} 个 SKU 库存低于预警值。`
        : '当前无库存风险 SKU。',
      dataSource: 'stocks + product_skus + products',
      queryCondition: 'available_qty <= warning_qty',
      rows,
      steps: [],
      links: [{ label: '查看库存', path: buildSchemaPath({ moduleKey: 'warehouse', siderKey: 'stock_list' }) }],
    }
  }

  if (DATA_KEYWORDS.order.some((k) => q.includes(k) || question.includes(k))) {
    const since = new Date()
    since.setDate(since.getDate() - 6)
    const rows = await db('orders')
      .where({ tenant_id: tenantId })
      .where('created_at', '>=', since)
      .select(db.raw('DATE(created_at) as day'))
      .count('order_id as cnt')
      .sum('total_amount as gmv')
      .groupByRaw('DATE(created_at)')
      .orderBy('day', 'asc')
    return {
      type: 'data',
      answer: `近 7 天共 ${rows.reduce((s, r) => s + (parseInt(r.cnt, 10) || 0), 0)} 笔订单。`,
      dataSource: 'orders',
      queryCondition: 'last 7 days group by date',
      rows,
      steps: [],
      links: [{ label: '经营总览', path: buildOverviewPath() }],
    }
  }

  return null
}

function buildFallbackResponse(permissionCodes) {
  const suggestions = getSuggestedQuestions(permissionCodes, 6)
  const playbooks = listAccessiblePlaybooks(permissionCodes)
  const lines = [
    '我是零售运营业务助手，可以帮你：',
    '1. 讲解业务流程（如订单履约、商品上架、入库拣货）',
    '2. 查询库存风险、近 7 天订单趋势（只读）',
    '',
    suggestions.length ? `你可以试试问：${suggestions.slice(0, 3).join(' / ')}` : '请描述你想了解的流程。',
  ]
  return {
    type: 'fallback',
    answer: lines.join('\n'),
    dataSource: 'none',
    queryCondition: null,
    rows: [],
    steps: [],
    links: playbooks.slice(0, 3).map((p) => ({
      label: p.title,
      path: buildOverviewPath(),
    })),
    suggestions,
  }
}

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class AiService extends BaseService {
    async resolvePermissions(ctx) {
      const db = ensureDb(app)
      const userId = getOperatorId(ctx)
      const tenantId = getTenantId(ctx)
      if (!userId || !tenantId) return new Set()
      return getUserPermissionCodes(db, userId, tenantId)
    }

    async query(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = getOperatorId(ctx)
      const { question, conversation_id: conversationId } = body
      if (!question) bizError('question 不能为空')

      const permissionCodes = await this.resolvePermissions(ctx)
      const trimmed = question.trim()

      let result = null
      const matched = matchPlaybook(trimmed, permissionCodes)
      if (matched) {
        result = buildPlaybookResponse(matched.playbook)
      }
      if (!result) {
        result = await runDataQuery(app, tenantId, trimmed)
      }
      if (!result) {
        result = buildFallbackResponse(permissionCodes)
      }

      const convId = conversationId || idGen.next('conv')
      if (!conversationId) {
        await db('ai_conversations').insert({
          conversation_id: convId,
          tenant_id: tenantId,
          user_id: userId,
          title: trimmed.slice(0, 50),
        })
      }

      const queryId = idGen.next('aiq')
      await db('ai_queries').insert({
        query_id: queryId,
        conversation_id: convId,
        tenant_id: tenantId,
        user_id: userId,
        question: trimmed,
        answer: result.answer,
        data_source: result.dataSource,
        query_condition: result.queryCondition,
      })

      await db('ai_reports').insert({
        report_id: idGen.next('air'),
        query_id: queryId,
        tenant_id: tenantId,
        report_json: JSON.stringify({
          type: result.type,
          playbookId: result.playbookId,
          playbookTitle: result.playbookTitle,
          steps: result.steps,
          rows: result.rows,
          links: result.links,
          suggestions: result.suggestions,
        }),
      })

      return {
        conversationId: convId,
        queryId,
        type: result.type,
        playbookId: result.playbookId,
        playbookTitle: result.playbookTitle,
        answer: result.answer,
        dataSource: result.dataSource,
        queryCondition: result.queryCondition,
        rows: result.rows,
        steps: result.steps || [],
        links: result.links || [],
        suggestions: result.suggestions,
      }
    }

    async suggestions(ctx) {
      const permissionCodes = await this.resolvePermissions(ctx)
      return {
        questions: getSuggestedQuestions(permissionCodes, 8),
        playbooks: listAccessiblePlaybooks(permissionCodes),
      }
    }

    async history(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = getOperatorId(ctx)

      let qb = db('ai_queries').where({ tenant_id: tenantId, user_id: userId })
      if (query.conversation_id) qb = qb.andWhere({ conversation_id: query.conversation_id })

      const list = await qb.orderBy('created_at', 'desc').limit(50)
      const queryIds = list.map((row) => row.query_id)
      const reportMap = {}

      if (queryIds.length) {
        const reports = await db('ai_reports')
          .where({ tenant_id: tenantId })
          .whereIn('query_id', queryIds)
          .select('query_id', 'report_json')

        reports.forEach((row) => {
          try {
            reportMap[row.query_id] = JSON.parse(row.report_json || '{}')
          } catch {
            reportMap[row.query_id] = {}
          }
        })
      }

      const enriched = list.map((row) => {
        const report = reportMap[row.query_id] || {}
        return {
          ...row,
          type: report.type,
          playbookId: report.playbookId,
          playbookTitle: report.playbookTitle,
          steps: report.steps || [],
          links: report.links || [],
        }
      })

      return { list: enriched, total: enriched.length }
    }
  }
}
