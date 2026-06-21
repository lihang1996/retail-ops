const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class ApprovalController extends BaseController {
    submit = wrap(async function submit(ctx) {
      const data = await app.service.approval.submit(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    todoList = wrap(async function todoList(ctx) {
      const result = await app.service.approval.todoList(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    approve = wrap(async function approve(ctx) {
      const data = await app.service.approval.approve(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    reject = wrap(async function reject(ctx) {
      const data = await app.service.approval.reject(ctx, ctx.request.body)
      this.success(ctx, data)
    })
  }
}
