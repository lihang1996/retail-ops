module.exports = (app, router) => {
  const { approval: c } = app.controller
  router.post('/api/proj/approval/submit', c.submit.bind(c))
  router.get('/api/proj/approval/todo_list', c.todoList.bind(c))
  router.post('/api/proj/approval/approve', c.approve.bind(c))
  router.post('/api/proj/approval/reject', c.reject.bind(c))
}
