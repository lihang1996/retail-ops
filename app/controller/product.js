const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class ProductController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service.product.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    get = wrap(async function get(ctx) {
      const data = await app.service.product.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    create = wrap(async function create(ctx) {
      const data = await app.service.product.create(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    update = wrap(async function update(ctx) {
      const data = await app.service.product.update(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    remove = wrap(async function remove(ctx) {
      const data = await app.service.product.delete(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    skuList = wrap(async function skuList(ctx) {
      const result = await app.service.product.listSkus(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    skuCreate = wrap(async function skuCreate(ctx) {
      const data = await app.service.product.createSku(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    skuUpdate = wrap(async function skuUpdate(ctx) {
      const data = await app.service.product.updateSku(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    skuRemove = wrap(async function skuRemove(ctx) {
      const data = await app.service.product.deleteSku(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    submitReview = wrap(async function submitReview(ctx) {
      const data = await app.service.product.submitReview(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    onSale = wrap(async function onSale(ctx) {
      const data = await app.service.product.onSale(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    offSale = wrap(async function offSale(ctx) {
      const data = await app.service.product.offSale(ctx, ctx.request.body)
      this.success(ctx, data)
    })
  }
}
