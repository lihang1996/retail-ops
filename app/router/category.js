module.exports = (app, router) => {
  const { category: c } = app.controller
  router.get('/api/proj/category/list', c.list.bind(c))
  router.get('/api/proj/category', c.get.bind(c))
  router.post('/api/proj/category', c.create.bind(c))
  router.put('/api/proj/category', c.update.bind(c))
}
