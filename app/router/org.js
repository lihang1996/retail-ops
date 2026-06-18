module.exports = (app, router) => {
  const { org: orgController } = app.controller

  router.get('/api/proj/org/department/list', orgController.departmentList.bind(orgController))
  router.get('/api/proj/org/department', orgController.departmentGet.bind(orgController))
  router.post('/api/proj/org/department', orgController.departmentCreate.bind(orgController))
  router.put('/api/proj/org/department', orgController.departmentUpdate.bind(orgController))
  router.delete('/api/proj/org/department', orgController.departmentDelete.bind(orgController))
  router.post('/api/proj/org/department/disable', orgController.departmentDisable.bind(orgController))

  router.get('/api/proj/org/user/list', orgController.userList.bind(orgController))
  router.get('/api/proj/org/user', orgController.userGet.bind(orgController))
  router.post('/api/proj/org/user', orgController.userCreate.bind(orgController))
  router.put('/api/proj/org/user', orgController.userUpdate.bind(orgController))
  router.post('/api/proj/org/user/reset_password', orgController.userResetPassword.bind(orgController))
  router.post('/api/proj/org/user/lock', orgController.userLock.bind(orgController))
  router.post('/api/proj/org/user/unlock', orgController.userUnlock.bind(orgController))

  router.get('/api/proj/org/role/list', orgController.roleList.bind(orgController))
  router.get('/api/proj/org/role', orgController.roleGet.bind(orgController))
  router.post('/api/proj/org/role', orgController.roleCreate.bind(orgController))
  router.put('/api/proj/org/role', orgController.roleUpdate.bind(orgController))
  router.get('/api/proj/org/role_permissions', orgController.rolePermissionsGet.bind(orgController))
  router.post('/api/proj/org/role_permissions', orgController.rolePermissionsUpdate.bind(orgController))
}
