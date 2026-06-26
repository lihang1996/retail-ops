module.exports = (app, router) => {
  const { ai: c } = app.controller
  router.post('/api/proj/ai/query', c.query.bind(c))
  router.get('/api/proj/ai/history', c.history.bind(c))
  router.get('/api/proj/ai/suggestions', c.suggestions.bind(c))
}
