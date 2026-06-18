module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class PermissionController extends BaseController {
    async list(ctx) {
      const list = await app.service.permission.listAll()
      this.success(ctx, list, { total: list.length })
    }

    async tree(ctx) {
      const tree = await app.service.permission.listTree()
      this.success(ctx, tree)
    }
  }
}
