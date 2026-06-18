module.exports = (app) => {
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
          detail_json: detail ? JSON.stringify(detail) : null,
        })
      } catch (e) {
        app.logger?.warn?.(`[audit] write failed: ${e.message}`)
      }
    }
  }
}
