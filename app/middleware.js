// 注册业务全局中间件（顺序：auth -> tenant -> permission）
module.exports = (app) => {
  app.use(app.middlewares.auth)
  app.use(app.middlewares.tenantContext)
  app.use(app.middlewares.permission)
}
