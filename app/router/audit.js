module.exports = (app, router) => {
  const { audit: c } = app.controller
  router.get('/api/proj/audit/list', c.list.bind(c))
}
