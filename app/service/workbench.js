const { loadFulfillmentWorkbench } = require('../common/workbench/fulfillment-workbench')
const { loadOpsWorkbench } = require('../common/workbench/ops-workbench')

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class WorkbenchService extends BaseService {
    async fulfillment(ctx, query = {}) {
      return loadFulfillmentWorkbench(app, ctx, query)
    }

    async ops(ctx) {
      return loadOpsWorkbench(app, ctx)
    }
  }
}
