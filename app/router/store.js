module.exports = (app, router) => {
  const { store: c } = app.controller
  router.get('/api/proj/store/list', c.list.bind(c))
  router.get('/api/proj/store', c.get.bind(c))
  router.post('/api/proj/store', c.create.bind(c))
  router.put('/api/proj/store', c.update.bind(c))
  router.delete('/api/proj/store', c.remove.bind(c))
}
