module.exports = (app, router) => {
  const { order: c } = app.controller
  const upload = app.middlewares.upload.single('file')

  router.get('/api/proj/order/list', c.list.bind(c))
  router.get('/api/proj/order', c.get.bind(c))
  router.post('/api/proj/order/import', upload, c.importFile.bind(c))
  router.get('/api/proj/order/import_result', c.importResult.bind(c))
  router.post('/api/proj/order/mock_pay', c.mockPay.bind(c))
  router.post('/api/proj/order/allocate', c.allocate.bind(c))
}
