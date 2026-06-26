module.exports = (app, router) => {
  const { workbench: c } = app.controller
  router.get('/api/proj/workbench/fulfillment', c.fulfillment.bind(c))
  router.get('/api/proj/workbench/ops', c.ops.bind(c))
}
