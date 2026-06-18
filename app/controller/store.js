const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class StoreController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service.store.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    get = wrap(async function get(ctx) {
      const data = await app.service.store.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    create = wrap(async function create(ctx) {
      const data = await app.service.store.create(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    update = wrap(async function update(ctx) {
      const data = await app.service.store.update(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    remove = wrap(async function remove(ctx) {
      const data = await app.service.store.delete(ctx, ctx.request.body)
      this.success(ctx, data)
    })
  }
}
