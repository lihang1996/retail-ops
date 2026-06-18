const idGen = require('./id')

function ensureDb(app) {
  if (!app.db) {
    const err = new Error('数据库未配置')
    err.code = 50000
    throw err
  }
  return app.db
}

function getTenantId(ctx) {
  return ctx.state.tenant?.tenantId || ctx.state.user?.tenant_id
}

function getOperatorId(ctx) {
  return ctx.state.user?.user_id
}

function bizError(message, code = 42200) {
  const err = new Error(message)
  err.code = code
  throw err
}

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

async function assertDeptInTenant(db, tenantId, deptId) {
  if (!deptId) return
  const dept = await db('departments').where({ tenant_id: tenantId, dept_id: deptId }).first()
  if (!dept) bizError('部门不存在', 40400)
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
}
