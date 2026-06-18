module.exports = (app, router) => {
  const { permission: permissionController } = app.controller
  router.get('/api/proj/permission/list', permissionController.list.bind(permissionController))
  router.get('/api/proj/permission/tree', permissionController.tree.bind(permissionController))
}
