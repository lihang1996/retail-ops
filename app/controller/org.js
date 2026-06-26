const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class OrgController extends BaseController {
    departmentList = wrap(async function departmentList(ctx) {
      const result = await app.service.org.listDepartments(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    departmentGet = wrap(async function departmentGet(ctx) {
      const data = await app.service.org.getDepartment(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    departmentCreate = wrap(async function departmentCreate(ctx) {
      const data = await app.service.org.createDepartment(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    departmentUpdate = wrap(async function departmentUpdate(ctx) {
      const data = await app.service.org.updateDepartment(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    departmentDisable = wrap(async function departmentDisable(ctx) {
      const data = await app.service.org.disableDepartment(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    departmentDelete = wrap(async function departmentDelete(ctx) {
      const data = await app.service.org.deleteDepartment(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    userList = wrap(async function userList(ctx) {
      const result = await app.service.org.listUsers(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    userGet = wrap(async function userGet(ctx) {
      const data = await app.service.org.getUser(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    userCreate = wrap(async function userCreate(ctx) {
      const data = await app.service.org.createUser(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    userUpdate = wrap(async function userUpdate(ctx) {
      const data = await app.service.org.updateUser(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    userResetPassword = wrap(async function userResetPassword(ctx) {
      const data = await app.service.org.resetUserPassword(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    userLock = wrap(async function userLock(ctx) {
      const data = await app.service.org.lockUser(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    userUnlock = wrap(async function userUnlock(ctx) {
      const data = await app.service.org.unlockUser(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    roleList = wrap(async function roleList(ctx) {
      const result = await app.service.org.listRoles(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    roleGet = wrap(async function roleGet(ctx) {
      const data = await app.service.org.getRole(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    roleCreate = wrap(async function roleCreate(ctx) {
      const data = await app.service.org.createRole(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    roleUpdate = wrap(async function roleUpdate(ctx) {
      const data = await app.service.org.updateRole(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    rolePermissionsGet = wrap(async function rolePermissionsGet(ctx) {
      const tenantId = ctx.state.tenant?.tenantId || ctx.state.user.tenant_id
      const { role_id: roleId } = ctx.request.query
      const permissionIds = await app.service.permission.getRolePermissionIds({ tenantId, roleId })
      if (permissionIds === null) {
        return this.fail(ctx, '角色不存在', 40400)
      }
      this.success(ctx, { roleId, permissionIds })
    })

    rolePermissionsUpdate = wrap(async function rolePermissionsUpdate(ctx) {
      const tenantId = ctx.state.tenant?.tenantId || ctx.state.user.tenant_id
      const { role_id: roleId, permission_ids: permissionIds = [] } = ctx.request.body
      const result = await app.service.permission.updateRolePermissions({
        tenantId,
        roleId,
        permissionIds,
      })
      if (!result.ok) {
        return this.fail(ctx, result.message, result.code)
      }

      await app.service.audit.record({
        tenantId,
        operatorId: ctx.state.user.user_id,
        actionCode: 'org:role:permission:update',
        objectType: 'role',
        objectId: roleId,
        detail: { permissionIds: result.permissionIds },
        ctx,
      })

      this.success(ctx, result)
    })
  }
}
