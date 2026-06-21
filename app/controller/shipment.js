const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class ShipmentController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service.shipment.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    get = wrap(async function get(ctx) {
      const data = await app.service.shipment.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    createFromOrder = wrap(async function createFromOrder(ctx) {
      const data = await app.service.shipment.createFromOrder(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    startPick = wrap(async function startPick(ctx) {
      const data = await app.service.shipment.startPick(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    confirmPick = wrap(async function confirmPick(ctx) {
      const data = await app.service.shipment.confirmPick(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    ship = wrap(async function ship(ctx) {
      const data = await app.service.shipment.ship(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    pickingRoute = wrap(async function pickingRoute(ctx) {
      const data = await app.service.shipment.getPickingRoute(ctx, ctx.request.query)
      this.success(ctx, data)
    })
  }
}
