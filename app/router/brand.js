module.exports = (app, router) => {
  const { brand: c } = app.controller
  router.get('/api/proj/brand/list', c.list.bind(c))
  router.get('/api/proj/brand', c.get.bind(c))
  router.post('/api/proj/brand', c.create.bind(c))
  router.put('/api/proj/brand', c.update.bind(c))
}
