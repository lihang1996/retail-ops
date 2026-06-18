module.exports = (app, router) => {
  const { auth: authController } = app.controller
  router.post('/api/auth/login', authController.login.bind(authController))
  router.post('/api/auth/logout', authController.logout.bind(authController))
  router.get('/api/auth/me', authController.me.bind(authController))
  router.get('/api/auth/permissions', authController.permissions.bind(authController))
}
