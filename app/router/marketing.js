module.exports = (app, router) => {
  const { marketing: c } = app.controller
  router.get('/api/proj/marketing/activity/list', c.list.bind(c))
  router.get('/api/proj/marketing/activity', c.get.bind(c))
}
