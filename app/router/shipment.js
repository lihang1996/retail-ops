module.exports = (app, router) => {
  const { shipment: c } = app.controller
  router.get('/api/proj/shipment/list', c.list.bind(c))
  router.get('/api/proj/shipment', c.get.bind(c))
  router.post('/api/proj/shipment/create_from_order', c.createFromOrder.bind(c))
  router.post('/api/proj/shipment/start_pick', c.startPick.bind(c))
  router.post('/api/proj/shipment/confirm_pick', c.confirmPick.bind(c))
  router.post('/api/proj/shipment/ship', c.ship.bind(c))
  router.get('/api/proj/shipment/picking_route', c.pickingRoute.bind(c))
}
