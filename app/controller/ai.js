const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class AiController extends BaseController {
    query = wrap(async function query(ctx) {
      const data = await app.service.ai.query(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    history = wrap(async function history(ctx) {
      const result = await app.service.ai.history(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    suggestions = wrap(async function suggestions(ctx) {
      const data = await app.service.ai.suggestions(ctx)
      this.success(ctx, data)
    })
  }
}
