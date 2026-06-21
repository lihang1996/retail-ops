/**
 * @module service/approval
 * @description 审批流服务：商品上架等业务的提交、待办、通过/驳回。
 * 状态流转：pending → approved/rejected；通过 product_on_sale 时联动商品 on_sale。
 * 关键规则：同一 ref 不可重复 pending；驳回时将商品退回 draft。
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
    /** 提交审批，product_on_sale 时同步将商品置 pending_review */
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

        await app.service.product._transitionStatus(ctx, refId, 'pending_review', {
          allowedFrom: ['draft', 'off_sale'],
          auditCode: 'product:submit_review',
        })
      } else {
        bizError('不支持的审批类型', 42200)
      }

      const approvalId = idGen.next('appr')
      const nodeId = idGen.next('anode')
      await db.transaction(async (trx) => {
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

      await audit(app, ctx, {
        actionCode: 'approval:submit',
        objectType: 'approval',
        objectId: approvalId,
        detail: { refType, refId },
      })

      return { approvalId }
    }

    /** 待办审批列表，默认仅 pending */
    async todoList(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('approvals as a')
        .leftJoin('users as u', 'a.applicant_id', 'u.user_id')
        .where('a.tenant_id', tenantId)
        .select('a.*', 'u.display_name as applicant_name')

      if (query.status) qb = qb.andWhere('a.status', query.status)
      else qb = qb.andWhere('a.status', 'pending')

      const list = await qb.orderBy('a.created_at', 'desc').limit(100)
      return { list, total: list.length }
    }

    /** 通过审批，product_on_sale 时触发商品上架 */
    async approve(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { approval_id: approvalId, remark } = body
      if (!approvalId) bizError('approval_id 不能为空')

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
      })

      if (approval.ref_type === 'product_on_sale') {
        await app.service.product.onSale(ctx, { product_id: approval.ref_id })
      }

      await audit(app, ctx, {
        actionCode: 'approval:approve',
        objectType: 'approval',
        objectId: approvalId,
        detail: { remark },
      })

      return { approvalId, status: 'approved' }
    }

    /** 驳回审批，商品退回 draft 并标记 review_status=rejected */
    async reject(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { approval_id: approvalId, remark } = body
      if (!approvalId) bizError('approval_id 不能为空')

      const approval = await assertRowInTenant(db, 'approvals', tenantId, 'approval_id', approvalId, '审批')
      if (approval.status !== 'pending') bizError('审批已处理', 40900)

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

      if (approval.ref_type === 'product_on_sale') {
        const product = await db('products').where({ product_id: approval.ref_id }).first()
        if (product?.status === 'pending_review') {
          await db('products').where({ product_id: approval.ref_id }).update({
            status: 'draft',
            review_status: 'rejected',
          })
        }
      }

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
