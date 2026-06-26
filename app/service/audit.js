/**
 * @module service/audit
 * @description 审计日志服务：记录与查询租户内操作留痕。
 *
 * 核心职责：
 * 1. 写入审计日志（操作人、对象、请求上下文）
 * 2. 分页查询审计日志（支持多维度筛选）
 *
 * 关键规则：
 * - 写入失败不阻断主流程（warn 日志）
 * - 查询按 tenant_id 隔离
 * - 记录完整的请求上下文（IP、User-Agent、Request ID）
 *
 * 使用场景：
 * - 操作审计追踪
 * - 安全事件排查
 * - 合规审计报告
 */
const { paginateQuery } = require('../common/pagination')
const { applyFilters } = require('../common/apply-filters')

const AUDIT_LIST_FILTERS = [
  { key: 'operator_id', column: 'a.operator_id' },
  { key: 'action_code', column: 'a.action_code', op: 'like' },
  { key: 'object_type', column: 'a.object_type' },
  { key: 'object_id', column: 'a.object_id' },
  { key: 'created_from', column: 'a.created_at', op: 'gte' },
  { key: 'created_to', column: 'a.created_at', op: 'lte' },
]

module.exports = (app) => {
  const { ensureDb, getTenantId } = require('../common/org-helper')

  return class AuditService {
    /**
     * 写入审计日志，含操作人、对象、请求上下文
     * @param {Object} params - 日志参数
     * @param {string} params.tenantId - 租户 ID
     * @param {string} params.operatorId - 操作人 ID（默认 'system'）
     * @param {string} params.actionCode - 操作代码（如 'order:create'）
     * @param {string} params.objectType - 对象类型（如 'order'）
     * @param {string} params.objectId - 对象 ID
     * @param {Object} params.detail - 详细信息（JSON）
     * @param {Object} params.ctx - Koa 上下文（用于提取请求信息）
     *
     * 记录内容：
     * - 操作人 ID
     * - 操作代码（用于分类和搜索）
     * - 操作对象类型和 ID
     * - 请求 ID（追踪整个请求链路）
     * - IP 地址
     * - User-Agent
     * - 详细信息 JSON
     *
     * 错误处理：
     * - 写入失败不抛异常（不阻断主流程）
     * - 仅记录 warn 日志
     */
    async record({ tenantId, operatorId, actionCode, objectType, objectId, detail, ctx }) {
      if (!app.db) return  // 数据库未连接则跳过

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
        // 审计日志写入失败不阻断业务
        app.logger?.warn?.(`[audit] write failed: ${e.message}`)
      }
    }

    /**
     * 分页查询审计日志，支持操作人/动作/对象筛选
     * @param {Object} ctx - Koa 上下文
     * @param {Object} query - 查询参数
     * @param {string} query.operator_id - 操作人筛选
     * @param {string} query.action_code - 操作代码模糊搜索
     * @param {string} query.object_type - 对象类型筛选
     * @param {string} query.object_id - 对象 ID 筛选
     * @param {string} query.created_from - 起始时间
     * @param {string} query.created_to - 结束时间
     * @returns {Object} { list, total }
     *
     * 返回字段：
     * - audit_id: 审计日志 ID
     * - action_code: 操作代码
     * - object_type: 对象类型
     * - object_id: 对象 ID
     * - operator_id: 操作人 ID
     * - operator_name: 操作人姓名
     * - operator_account: 操作人账号
     * - ip: IP 地址
     * - user_agent: User-Agent
     * - detail_json: 详细信息 JSON
     * - created_at: 创建时间
     */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('audit_logs as a')
        .leftJoin('users as u', 'a.operator_id', 'u.user_id')
        .where('a.tenant_id', tenantId)
        .select('a.*', 'u.display_name as operator_name', 'u.account as operator_account')

      qb = applyFilters(qb, query, AUDIT_LIST_FILTERS)
      if (query.operator_name) {
        qb = qb.andWhere(function matchOperator() {
          this.where('u.display_name', 'like', `%${query.operator_name}%`)
            .orWhere('u.account', 'like', `%${query.operator_name}%`)
        })
      }

      return paginateQuery(qb.orderBy('a.created_at', 'desc'), query, { countColumn: 'a.audit_id' })
    }
  }
}
