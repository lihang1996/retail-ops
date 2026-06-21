module.exports = {
  '/api/proj/marketing/activity/list': {
    get: {
      query: {
        type: 'object',
        properties: { status: { type: 'string' } },
      },
    },
  },
  '/api/proj/marketing/activity': {
    get: {
      query: {
        type: 'object',
        properties: { activity_id: { type: 'string' } },
        required: ['activity_id'],
      },
    },
  },
}
