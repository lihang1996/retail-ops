const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class WorkbenchController extends BaseController {
    fulfillment = wrap(async function fulfillment(ctx) {
      const data = await app.service.workbench.fulfillment(ctx, ctx.request.query)
      this.success(ctx, data.rows, {
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        summary: data.summary,
        orderStatusCounts: data.orderStatusCounts,
        shipmentStatusCounts: data.shipmentStatusCounts,
        recentAuditLogs: data.recentAuditLogs,
        tab: data.tab,
      })
    })

    ops = wrap(async function ops(ctx) {
      const data = await app.service.workbench.ops(ctx)
      this.success(ctx, data)
    })
  }
}
