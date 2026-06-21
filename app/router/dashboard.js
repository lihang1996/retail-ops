module.exports = (app, router) => {
  const { dashboard: c } = app.controller
  router.get('/api/proj/dashboard/overview', c.overview.bind(c))
}
