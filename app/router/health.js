module.exports = (app, router) => {
  const { health: healthController } = app.controller
  router.get('/health', healthController.ping.bind(healthController))
  router.get('/health/detail', healthController.detail.bind(healthController))
}
