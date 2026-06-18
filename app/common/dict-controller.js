const { handleServiceError } = require('./controller-error')

function wrap(serviceFn) {
  return async function wrapped(ctx) {
    try {
      return await serviceFn.call(this, ctx)
    } catch (error) {
      handleServiceError(ctx, this, error)
    }
  }
}

function createDictController(app, serviceName) {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class DictController extends BaseController {
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
  }
}

module.exports = { createDictController, wrap }
