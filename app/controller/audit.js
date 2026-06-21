const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class AuditController extends BaseController {
    list = wrap(async function list(ctx) {
      const result = await app.service.audit.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })
  }
}
