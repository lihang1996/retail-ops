const { createDictController, wrap } = require('./dict-controller')

/**
 * 资源型 CRUD 控制器工厂（在 dict-controller 基础上扩展 remove / 自定义动作）
 */
function createResourceController(app, serviceName, options = {}) {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)
  const customActions = options.customActions || {}
  const withRemove = options.withRemove !== false
  const removeMethod = options.removeMethod || 'remove'

  return class ResourceController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service[serviceName].list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    get = wrap(async function get(ctx) {
      const data = await app.service[serviceName].get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    create = wrap(async function create(ctx) {
      const data = await app.service[serviceName].create(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    update = wrap(async function update(ctx) {
      const data = await app.service[serviceName].update(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    remove = withRemove
      ? wrap(async function remove(ctx) {
        const data = await app.service[serviceName][removeMethod](ctx, ctx.request.body)
        this.success(ctx, data)
      })
      : undefined
  }

  Object.entries(customActions).forEach(([methodName, handler]) => {
    ResourceController.prototype[methodName] = wrap(handler)
  })

  return ResourceController
}

module.exports = {
  createResourceController,
  createDictController,
  wrap,
}
