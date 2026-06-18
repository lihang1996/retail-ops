module.exports = (app, router) => {
  const { warehouse: c } = app.controller
  router.get('/api/proj/warehouse/list', c.list.bind(c))
  router.get('/api/proj/warehouse', c.get.bind(c))
  router.post('/api/proj/warehouse', c.create.bind(c))
  router.put('/api/proj/warehouse', c.update.bind(c))
  router.get('/api/proj/warehouse/layout', c.layout.bind(c))

  router.get('/api/proj/warehouse/location/list', c.locationList.bind(c))
  router.get('/api/proj/warehouse/location', c.locationGet.bind(c))
  router.post('/api/proj/warehouse/location', c.locationCreate.bind(c))
  router.put('/api/proj/warehouse/location', c.locationUpdate.bind(c))
}
