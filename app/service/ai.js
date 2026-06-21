/**
 * @module service/ai
 * @description AI 问数服务：基于关键词的只读查询（库存风险、订单趋势等）。
 * 关键规则：仅执行预定义只读 SQL，结果按 tenant_id 隔离；会话与查询历史持久化。
 */
const { ensureDb, getTenantId, getOperatorId, bizError, idGen } = require('../common/org-helper')

const KEYWORDS = {
  stock: ['库存', '缺货', '风险', '不足'],
  order: ['订单', '销量', 'gmv', '趋势'],
  product: ['商品', '上架', 'sku'],
}

async function runReadOnlyQuery(app, tenantId, question) {
  const db = ensureDb(app)
  const q = question.toLowerCase()

  if (KEYWORDS.stock.some((k) => question.includes(k))) {
    const rows = await db('stocks as s')
      .join('product_skus as sku', 's.sku_id', 'sku.sku_id')
      .leftJoin('products as p', 'sku.product_id', 'p.product_id')
      .where('s.tenant_id', tenantId)
      .whereRaw('s.available_qty <= s.warning_qty')
      .select('sku.sku_code', 'p.product_name', 's.available_qty', 's.warning_qty')
      .limit(20)
    return {
      answer: rows.length
        ? `发现 ${rows.length} 个 SKU 库存低于预警值。`
        : '当前无库存风险 SKU。',
      dataSource: 'stocks + product_skus + products',
      queryCondition: 'available_qty <= warning_qty',
      rows,
      links: [{ label: '查看库存', path: '/view/dashboard/sider/schema?proj_key=retail&key=warehouse&sider_key=stock_list' }],
    }
  }

  if (KEYWORDS.order.some((k) => q.includes(k) || question.includes(k))) {
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
      answer: `近 7 天共 ${rows.reduce((s, r) => s + (parseInt(r.cnt, 10) || 0), 0)} 笔订单。`,
      dataSource: 'orders',
      queryCondition: 'last 7 days group by date',
      rows,
      links: [{ label: '经营总览', path: '/view/dashboard/overview?proj_key=retail' }],
    }
  }

  return {
    answer: '我可以帮你查询库存风险、订单趋势、商品信息。请尝试：「库存不足的 SKU」或「最近 7 天订单趋势」。',
    dataSource: 'none',
    queryCondition: null,
    rows: [],
    links: [],
  }
}

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class AiService extends BaseService {
    /** 解析自然语言问题，执行只读查询并保存会话/报告 */
    async query(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = getOperatorId(ctx)
      const { question, conversation_id: conversationId } = body
      if (!question) bizError('question 不能为空')

      const convId = conversationId || idGen.next('conv')
      if (!conversationId) {
        await db('ai_conversations').insert({
          conversation_id: convId,
          tenant_id: tenantId,
          user_id: userId,
          title: question.slice(0, 50),
        })
      }

      const result = await runReadOnlyQuery(app, tenantId, question)
      const queryId = idGen.next('aiq')

      await db('ai_queries').insert({
        query_id: queryId,
        conversation_id: convId,
        tenant_id: tenantId,
        user_id: userId,
        question,
        answer: result.answer,
        data_source: result.dataSource,
        query_condition: result.queryCondition,
      })

      await db('ai_reports').insert({
        report_id: idGen.next('air'),
        query_id: queryId,
        tenant_id: tenantId,
        report_json: JSON.stringify({ rows: result.rows, links: result.links }),
      })

      return {
        conversationId: convId,
        queryId,
        answer: result.answer,
        dataSource: result.dataSource,
        queryCondition: result.queryCondition,
        rows: result.rows,
        links: result.links,
      }
    }

    /** 查询当前用户的历史问数记录 */
    async history(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const userId = getOperatorId(ctx)

      let qb = db('ai_queries').where({ tenant_id: tenantId, user_id: userId })
      if (query.conversation_id) qb = qb.andWhere({ conversation_id: query.conversation_id })

      const list = await qb.orderBy('created_at', 'desc').limit(50)
      return { list, total: list.length }
    }
  }
}
