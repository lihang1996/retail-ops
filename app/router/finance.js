module.exports = (app, router) => {
  const { finance: c } = app.controller
  router.get('/api/proj/finance/summary', c.summary.bind(c))
}
