const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class MarketingController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service.marketing.listActivities(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    get = wrap(async function get(ctx) {
      const data = await app.service.marketing.getActivity(ctx, ctx.request.query)
      this.success(ctx, data)
    })
  }
}
