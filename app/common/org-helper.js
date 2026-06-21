/**
 * @module common/org-helper
 * @description 组织与租户通用工具：DB 校验、租户/操作人提取、业务异常、审计委托、租户归属断言。
 * 关键规则：getTenantId 优先 ctx.state.tenant；assertRowInTenant 强制 tenant_id 匹配防跨租户访问；
 * syncUserRoles 仅绑定本租户有效 role_id。
 */
const idGen = require('./id')

/** 确保 app.db 已配置，否则抛出 50000 */
function ensureDb(app) {
  if (!app.db) {
    const err = new Error('数据库未配置')
    err.code = 50000
    throw err
  }
  return app.db
}

/** 从上下文提取当前租户 ID（tenant 中间件或 JWT payload） */
function getTenantId(ctx) {
  return ctx.state.tenant?.tenantId || ctx.state.user?.tenant_id
}

/** 从上下文提取当前操作人 user_id */
function getOperatorId(ctx) {
  return ctx.state.user?.user_id
}

/** 抛出带业务错误码的异常，默认 42200 */
function bizError(message, code = 42200) {
  const err = new Error(message)
  err.code = code
  throw err
}

/** 委托 audit 服务写入操作留痕 */
async function audit(app, ctx, payload) {
  if (!app.service?.audit) return
  await app.service.audit.record({
    tenantId: getTenantId(ctx),
    operatorId: getOperatorId(ctx),
    actionCode: payload.actionCode,
    objectType: payload.objectType,
    objectId: payload.objectId,
    detail: payload.detail,
    ctx,
  })
}

/** 全量替换用户角色绑定，仅保留本租户有效 role_id */
async function syncUserRoles(trx, tenantId, userId, roleIds = []) {
  await trx('user_roles').where({ user_id: userId }).del()
  if (!Array.isArray(roleIds) || !roleIds.length) return []

  const validRoleIds = await trx('roles')
    .where({ tenant_id: tenantId })
    .whereIn('role_id', roleIds)
    .pluck('role_id')

  if (validRoleIds.length) {
    await trx('user_roles').insert(
      validRoleIds.map((roleId) => ({ user_id: userId, role_id: roleId }))
    )
  }
  return validRoleIds
}

/** 断言部门属于当前租户 */
async function assertDeptInTenant(db, tenantId, deptId) {
  if (!deptId) return
  const dept = await db('departments').where({ tenant_id: tenantId, dept_id: deptId }).first()
  if (!dept) bizError('部门不存在', 40400)
}

/** 断言记录存在且 tenant_id 匹配，用于防跨租户读写 */
async function assertRowInTenant(db, table, tenantId, idField, id, label = '记录') {
  if (!id) return null
  const row = await db(table).where({ tenant_id: tenantId, [idField]: id }).first()
  if (!row) bizError(`${label}不存在`, 40400)
  return row
}

/** 查询构建器附加 deleted_at IS NULL 条件（软删除过滤） */
function activeOnly(qb) {
  return qb.whereNull('deleted_at')
}

module.exports = {
  idGen,
  ensureDb,
  getTenantId,
  getOperatorId,
  bizError,
  audit,
  syncUserRoles,
  assertDeptInTenant,
  assertRowInTenant,
  activeOnly,
}
