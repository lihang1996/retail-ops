module.exports = (app) => {
  const { ensureDb, getTenantId } = require('../common/org-helper')

  return class AuditService {
    async record({ tenantId, operatorId, actionCode, objectType, objectId, detail, ctx }) {
      if (!app.db) return
      const idGen = require('../common/id')
      try {
        await app.db('audit_logs').insert({
          audit_id: idGen.next('audit'),
          tenant_id: tenantId,
          operator_id: operatorId || 'system',
          action_code: actionCode,
          object_type: objectType || null,
          object_id: objectId || null,
          request_id: ctx?.request?.headers?.['x-request-id'] || null,
          ip: ctx?.ip || null,
          user_agent: ctx?.headers?.['user-agent'] || null,
          detail_json: detail ? JSON.stringify(detail) : null,
        })
      } catch (e) {
        app.logger?.warn?.(`[audit] write failed: ${e.message}`)
      }
    }

    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('audit_logs as a')
        .leftJoin('users as u', 'a.operator_id', 'u.user_id')
        .where('a.tenant_id', tenantId)
        .select('a.*', 'u.display_name as operator_name', 'u.account as operator_account')

      if (query.operator_id) qb = qb.andWhere('a.operator_id', query.operator_id)
      if (query.action_code) qb = qb.andWhere('a.action_code', 'like', `%${query.action_code}%`)
      if (query.object_type) qb = qb.andWhere('a.object_type', query.object_type)
      if (query.object_id) qb = qb.andWhere('a.object_id', query.object_id)
      if (query.created_from) qb = qb.andWhere('a.created_at', '>=', query.created_from)
      if (query.created_to) qb = qb.andWhere('a.created_at', '<=', query.created_to)

      const list = await qb.orderBy('a.created_at', 'desc').limit(200)
      return { list, total: list.length }
    }
  }
}
