const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class WarehouseController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service.warehouse.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    get = wrap(async function get(ctx) {
      const data = await app.service.warehouse.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    create = wrap(async function create(ctx) {
      const data = await app.service.warehouse.create(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    update = wrap(async function update(ctx) {
      const data = await app.service.warehouse.update(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    locationList = wrap(async function locationList(ctx) {
      const result = await app.service.warehouse.listLocations(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    locationGet = wrap(async function locationGet(ctx) {
      const data = await app.service.warehouse.getLocation(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    locationCreate = wrap(async function locationCreate(ctx) {
      const data = await app.service.warehouse.createLocation(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    locationUpdate = wrap(async function locationUpdate(ctx) {
      const data = await app.service.warehouse.updateLocation(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    layout = wrap(async function layout(ctx) {
      const data = await app.service.warehouse.getLayout(ctx, ctx.request.query)
      this.success(ctx, data)
    })
  }
}
