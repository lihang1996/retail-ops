module.exports = (app, router) => {
  const { stock: c } = app.controller
  router.get('/api/proj/stock/list', c.list.bind(c))
  router.get('/api/proj/stock/location_list', c.locationList.bind(c))
  router.get('/api/proj/stock/location/list', c.locationList.bind(c))
  router.get('/api/proj/stock/log_list', c.logList.bind(c))
  router.get('/api/proj/stock/log/list', c.logList.bind(c))
  router.post('/api/proj/stock/inbound', c.inbound.bind(c))
  router.post('/api/proj/stock/lock', c.lock.bind(c))
  router.post('/api/proj/stock/unlock', c.unlock.bind(c))
  router.post('/api/proj/stock/outbound', c.outbound.bind(c))
}
