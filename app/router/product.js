module.exports = (app, router) => {
  const { product: c } = app.controller
  router.get('/api/proj/product/list', c.list.bind(c))
  router.get('/api/proj/product', c.get.bind(c))
  router.post('/api/proj/product', c.create.bind(c))
  router.put('/api/proj/product', c.update.bind(c))
  router.delete('/api/proj/product', c.remove.bind(c))

  router.get('/api/proj/product/sku_list', c.skuList.bind(c))
  router.post('/api/proj/product/sku', c.skuCreate.bind(c))
  router.put('/api/proj/product/sku', c.skuUpdate.bind(c))
  router.delete('/api/proj/product/sku', c.skuRemove.bind(c))

  router.post('/api/proj/product/submit_review', c.submitReview.bind(c))
  router.post('/api/proj/product/on_sale', c.onSale.bind(c))
  router.post('/api/proj/product/off_sale', c.offSale.bind(c))
}
