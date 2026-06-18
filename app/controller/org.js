const { handleServiceError } = require('../common/controller-error')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class OrgController extends BaseController {
    async departmentList(ctx) {
      try {
        const result = await app.service.org.listDepartments(ctx, ctx.request.query)
        this.success(ctx, result.list, { total: result.total })
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async departmentGet(ctx) {
      try {
        const data = await app.service.org.getDepartment(ctx, ctx.request.query)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async departmentCreate(ctx) {
      try {
        const data = await app.service.org.createDepartment(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async departmentUpdate(ctx) {
      try {
        const data = await app.service.org.updateDepartment(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async departmentDisable(ctx) {
      try {
        const data = await app.service.org.disableDepartment(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async departmentDelete(ctx) {
      try {
        const data = await app.service.org.deleteDepartment(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async userList(ctx) {
      try {
        const result = await app.service.org.listUsers(ctx, ctx.request.query)
        this.success(ctx, result.list, { total: result.total })
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async userGet(ctx) {
      try {
        const data = await app.service.org.getUser(ctx, ctx.request.query)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async userCreate(ctx) {
      try {
        const data = await app.service.org.createUser(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async userUpdate(ctx) {
      try {
        const data = await app.service.org.updateUser(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async userResetPassword(ctx) {
      try {
        const data = await app.service.org.resetUserPassword(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async userLock(ctx) {
      try {
        const data = await app.service.org.lockUser(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async userUnlock(ctx) {
      try {
        const data = await app.service.org.unlockUser(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async roleList(ctx) {
      try {
        const result = await app.service.org.listRoles(ctx, ctx.request.query)
        this.success(ctx, result.list, { total: result.total })
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async roleGet(ctx) {
      try {
        const data = await app.service.org.getRole(ctx, ctx.request.query)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async roleCreate(ctx) {
      try {
        const data = await app.service.org.createRole(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async roleUpdate(ctx) {
      try {
        const data = await app.service.org.updateRole(ctx, ctx.request.body)
        this.success(ctx, data)
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async rolePermissionsGet(ctx) {
      try {
        const tenantId = ctx.state.tenant?.tenantId || ctx.state.user.tenant_id
        const { role_id: roleId } = ctx.request.query
        const permissionIds = await app.service.permission.getRolePermissionIds({ tenantId, roleId })
        if (permissionIds === null) {
          return this.fail(ctx, '角色不存在', 40400)
        }
        this.success(ctx, { roleId, permissionIds })
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }

    async rolePermissionsUpdate(ctx) {
      try {
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
      } catch (error) {
        handleServiceError(ctx, this, error)
      }
    }
  }
}
