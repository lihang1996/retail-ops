/**
 * @module service/approval
 * @description 审批流服务：商品上架等业务的提交、待办、通过/驳回。
 *
 * 核心职责：
 * 1. 提交审批（创建审批单和审批节点）
 * 2. 待办审批列表查询
 * 3. 通过审批（触发联动业务逻辑）
 * 4. 驳回审批（回退业务状态）
 *
 * 状态流转：
 * pending → approved/rejected
 *
 * 业务联动：
 * - product_on_sale 审批通过：触发商品上架（调用 product.onSale）
 * - product_on_sale 审批驳回：商品退回 draft 状态
 *
 * 关键规则：
 * - 同一 ref 不可重复 pending（防止重复提交）
 * - 提交时商品状态须为 draft 或 off_sale
 * - 驳回时将商品退回 draft 并标记 review_status=rejected
 *
 * 数据模型：
 * - approvals: 审批单主表
 * - approval_nodes: 审批节点（支持多节点审批）
 * - approval_logs: 审批操作日志
 */
const {
  ensureDb,
  getTenantId,
  getOperatorId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
  activeOnly,
} = require('../common/org-helper')
const { paginateQuery } = require('../common/pagination')
const { applyFilters } = require('../common/apply-filters')

const APPROVAL_TODO_FILTERS = [
  { key: 'product_status', column: 'p.status' },
  { key: 'applicant_name', column: 'u.display_name', op: 'like' },
]

/**
 * 写入审批操作日志
 * @param {Object} db - Knex 数据库实例
 * @param {Object} params - 日志参数
 * @param {string} params.approvalId - 审批单 ID
 * @param {string} params.action - 操作类型（submit/approve/reject）
 * @param {string} params.operatorId - 操作人 ID
 * @param {string} params.remark - 备注
 */
async function writeApprovalLog(db, { approvalId, action, operatorId, remark }) {
  await db('approval_logs').insert({
    log_id: idGen.next('alog'),
    approval_id: approvalId,
    action,
    operator_id: operatorId || null,
    remark: remark || null,
  })
}

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class ApprovalService extends BaseService {
    /**
     * 提交审批，product_on_sale 时同步将商品置 pending_review
     * @param {Object} ctx - Koa 上下文
     * @param {Object} body - 请求体
     * @param {string} body.ref_type - 审批类型（默认 'product_on_sale'）
     * @param {string} body.ref_id - 关联对象 ID（商品 ID）
     * @param {string} body.title - 审批标题
     * @returns {Object} { approvalId }
     *
     * 业务流程：
     * 1. 校验商品状态（draft/off_sale）
     * 2. 检查是否已有待审批记录
     * 3. 商品状态 → pending_review
     * 4. 创建审批单和审批节点
     * 5. 记录审批日志
     *
     * 审批节点：
     * - 默认审批人角色：role_admin
     * - 支持扩展多节点审批流程
     */
    async submit(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { ref_type: refType = 'product_on_sale', ref_id: refId, title } = body
      if (!refId) bizError('ref_id 不能为空')

      if (refType === 'product_on_sale') {
        const product = await activeOnly(db('products'))
          .where({ tenant_id: tenantId, product_id: refId })
          .first()
        if (!product) bizError('商品不存在', 40400)
        if (!['draft', 'off_sale'].includes(product.status)) {
          bizError(`商品状态 ${product.status} 不可提交审批`, 40900)
        }

        const pending = await db('approvals')
          .where({ tenant_id: tenantId, ref_type: refType, ref_id: refId, status: 'pending' })
          .first()
        if (pending) bizError('该商品已有待审批记录', 40900)
      } else {
        bizError('不支持的审批类型', 42200)
      }

      const approvalId = idGen.next('appr')
      const nodeId = idGen.next('anode')
      await db.transaction(async (trx) => {
        if (refType === 'product_on_sale') {
          const product = await activeOnly(trx('products'))
            .where({ tenant_id: tenantId, product_id: refId })
            .first()
          if (!product || !['draft', 'off_sale'].includes(product.status)) {
            bizError(`商品状态不可提交审批`, 40900)
          }

          await trx('products').where({ product_id: refId }).update({
            status: 'pending_review',
            review_status: 'pending',
            updated_by: operatorId,
          })
          await trx('product_status_logs').insert({
            log_id: idGen.next('pslog'),
            tenant_id: tenantId,
            product_id: refId,
            from_status: product.status,
            to_status: 'pending_review',
            operator_id: operatorId,
            remark: title || null,
          })
        }

        await trx('approvals').insert({
          approval_id: approvalId,
          tenant_id: tenantId,
          ref_type: refType,
          ref_id: refId,
          title: title || `上架审批 ${refId}`,
          status: 'pending',
          applicant_id: operatorId,
          current_node_id: nodeId,
        })

        await trx('approval_nodes').insert({
          node_id: nodeId,
          approval_id: approvalId,
          node_order: 1,
          approver_role_id: 'role_admin',
          status: 'pending',
        })

        await writeApprovalLog(trx, {
          approvalId,
          action: 'submit',
          operatorId,
          remark: title,
        })
      })

      // 审计日志
      await audit(app, ctx, {
        actionCode: 'approval:submit',
        objectType: 'approval',
        objectId: approvalId,
        detail: { refType, refId },
      })

      if (refType === 'product_on_sale') {
        await audit(app, ctx, {
          actionCode: 'product:submit_review',
          objectType: 'product',
          objectId: refId,
          detail: { refType },
        })
      }

      return { approvalId }
    }

    /**
     * 待办审批列表，默认仅 pending
     * @param {Object} ctx - Koa 上下文
     * @param {Object} query - 查询参数
     * @param {string} query.status - 状态筛选（默认 pending）
     * @returns {Object} { list, total }
     *
     * 返回字段：
     * - approval_id: 审批单 ID
     * - title: 审批标题
     * - ref_type: 审批类型
     * - ref_id: 关联对象 ID
     * - status: 审批状态
     * - applicant_name: 申请人姓名
     * - created_at: 创建时间
     */
    async todoList(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('approvals as a')
        .leftJoin('users as u', 'a.applicant_id', 'u.user_id')
        .leftJoin('products as p', function joinProduct() {
          this.on('a.ref_id', 'p.product_id').andOn('a.tenant_id', 'p.tenant_id')
        })
        .where('a.tenant_id', tenantId)
        .select(
          'a.*',
          'u.display_name as applicant_name',
          'p.product_name',
          'p.status as product_status',
          'p.review_status'
        )

      // 状态筛选（默认仅显示待审批）
      if (query.status) {
        if (query.status !== 'all') qb = qb.andWhere('a.status', query.status)
      } else {
        qb = qb.andWhere('a.status', 'pending')
      }
      if (query.keyword) {
        qb = qb.andWhere(function matchKeyword() {
          this.where('a.title', 'like', `%${query.keyword}%`)
            .orWhere('a.ref_id', 'like', `%${query.keyword}%`)
            .orWhere('p.product_name', 'like', `%${query.keyword}%`)
            .orWhere('u.display_name', 'like', `%${query.keyword}%`)
        })
      }
      qb = applyFilters(qb, query, APPROVAL_TODO_FILTERS)

      const result = await paginateQuery(qb.orderBy('a.created_at', 'desc'), query, { countColumn: 'a.approval_id' })
      const now = Date.now()
      return {
        ...result,
        list: result.list.map((row) => ({
          ...row,
          wait_hours: Math.max(0, Math.round((now - new Date(row.created_at).getTime()) / 3600000)),
        })),
      }
    }

    /**
     * 通过审批，product_on_sale 时触发商品上架
     * @param {Object} ctx - Koa 上下文
     * @param {Object} body - 请求体
     * @param {string} body.approval_id - 审批单 ID（必填）
     * @param {string} body.remark - 审批意见
     * @returns {Object} { approvalId, status: 'approved' }
     *
     * 业务流程：
     * 1. 检查审批单状态（须为 pending）
     * 2. 更新审批单状态 → approved
     * 3. 更新审批节点状态
     * 4. 记录审批日志
     * 5. 触发业务联动（商品上架）
     */
    async approve(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { approval_id: approvalId, remark } = body
      if (!approvalId) bizError('approval_id 不能为空')

      // 校验审批单存在且状态为 pending
      const approval = await assertRowInTenant(db, 'approvals', tenantId, 'approval_id', approvalId, '审批')
      if (approval.status !== 'pending') bizError('审批已处理', 40900)

      await db.transaction(async (trx) => {
        await trx('approvals').where({ approval_id: approvalId }).update({ status: 'approved' })
        await trx('approval_nodes')
          .where({ approval_id: approvalId, status: 'pending' })
          .update({ status: 'approved', acted_by: operatorId, acted_at: trx.fn.now() })
        await writeApprovalLog(trx, {
          approvalId,
          action: 'approve',
          operatorId,
          remark,
        })

        if (approval.ref_type === 'product_on_sale') {
          const product = await activeOnly(trx('products'))
            .where({ tenant_id: tenantId, product_id: approval.ref_id })
            .first()
          if (!product) bizError('商品不存在', 40400)
          if (product.status !== 'pending_review') {
            bizError(`当前状态 ${product.status} 不可上架`, 40900)
          }
          await app.service.product._validateOnSale(trx, tenantId, product)
          await trx('products').where({ product_id: approval.ref_id }).update({
            status: 'on_sale',
            review_status: 'approved',
            updated_by: operatorId,
          })
          await trx('product_status_logs').insert({
            log_id: idGen.next('pslog'),
            tenant_id: tenantId,
            product_id: approval.ref_id,
            from_status: product.status,
            to_status: 'on_sale',
            operator_id: operatorId,
            remark: remark || '审批通过上架',
          })
        }
      })

      if (approval.ref_type === 'product_on_sale') {
        await audit(app, ctx, {
          actionCode: 'product:on_sale',
          objectType: 'product',
          objectId: approval.ref_id,
          detail: { from: 'pending_review', to: 'on_sale' },
        })
      }

      // 审计日志
      await audit(app, ctx, {
        actionCode: 'approval:approve',
        objectType: 'approval',
        objectId: approvalId,
        detail: { remark },
      })

      return { approvalId, status: 'approved' }
    }

    /**
     * 驳回审批，商品退回 draft 并标记 review_status=rejected
     * @param {Object} ctx - Koa 上下文
     * @param {Object} body - 请求体
     * @param {string} body.approval_id - 审批单 ID（必填）
     * @param {string} body.remark - 驳回原因
     * @returns {Object} { approvalId, status: 'rejected' }
     *
     * 业务流程：
     * 1. 检查审批单状态（须为 pending）
     * 2. 更新审批单状态 → rejected
     * 3. 更新审批节点状态
     * 4. 记录审批日志
     * 5. 商品退回 draft 并标记 review_status=rejected
     */
    async reject(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { approval_id: approvalId, remark } = body
      if (!approvalId) bizError('approval_id 不能为空')

      // 校验审批单存在且状态为 pending
      const approval = await assertRowInTenant(db, 'approvals', tenantId, 'approval_id', approvalId, '审批')
      if (approval.status !== 'pending') bizError('审批已处理', 40900)

      // 更新审批单和审批节点
      await db.transaction(async (trx) => {
        await trx('approvals').where({ approval_id: approvalId }).update({ status: 'rejected' })
        await trx('approval_nodes')
          .where({ approval_id: approvalId, status: 'pending' })
          .update({ status: 'rejected', acted_by: operatorId, acted_at: trx.fn.now() })
        await writeApprovalLog(trx, {
          approvalId,
          action: 'reject',
          operatorId,
          remark,
        })
      })

      // 业务联动：商品退回 draft 状态
      if (approval.ref_type === 'product_on_sale') {
        const product = await db('products').where({ product_id: approval.ref_id }).first()
        if (product?.status === 'pending_review') {
          await db('products').where({ product_id: approval.ref_id }).update({
            status: 'draft',
            review_status: 'rejected',
          })
        }
      }

      // 审计日志
      await audit(app, ctx, {
        actionCode: 'approval:reject',
        objectType: 'approval',
        objectId: approvalId,
        detail: { remark },
      })

      return { approvalId, status: 'rejected' }
    }
  }
}
