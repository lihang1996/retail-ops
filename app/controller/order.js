const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class OrderController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service.order.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    get = wrap(async function get(ctx) {
      const data = await app.service.order.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    importFile = wrap(async function importFile(ctx) {
      const data = await app.service.order.importFile(ctx, ctx.request.file)
      this.success(ctx, data)
    })

    importResult = wrap(async function importResult(ctx) {
      const data = await app.service.order.importResult(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    mockPay = wrap(async function mockPay(ctx) {
      const data = await app.service.order.mockPay(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    allocate = wrap(async function allocate(ctx) {
      const data = await app.service.order.allocate(ctx, ctx.request.body)
      this.success(ctx, data)
    })
  }
}
