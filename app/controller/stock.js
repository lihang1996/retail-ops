const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class StockController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service.stock.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    locationList = wrap(async function locationList(ctx) {
      const result = await app.service.stock.listLocations(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    logList = wrap(async function logList(ctx) {
      const result = await app.service.stock.listLogs(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    inbound = wrap(async function inbound(ctx) {
      const data = await app.service.stock.inbound(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    lock = wrap(async function lock(ctx) {
      const data = await app.service.stock.lock(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    unlock = wrap(async function unlock(ctx) {
      const data = await app.service.stock.unlock(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    outbound = wrap(async function outbound(ctx) {
      const data = await app.service.stock.outbound(ctx, ctx.request.body)
      this.success(ctx, data)
    })
  }
}
