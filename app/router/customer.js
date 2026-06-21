module.exports = (app, router) => {
  const { customer: c } = app.controller
  router.get('/api/proj/customer/list', c.list.bind(c))
  router.get('/api/proj/customer', c.get.bind(c))
}
