const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class FinanceController extends BaseController {
    summary = wrap(async function summary(ctx) {
      const data = await app.service.finance.summary(ctx)
      this.success(ctx, data)
    })
  }
}
