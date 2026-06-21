const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class DashboardController extends BaseController {
    overview = wrap(async function overview(ctx) {
      const data = await app.service.dashboard.overview(ctx)
      this.success(ctx, data)
    })
  }
}
