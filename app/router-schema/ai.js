module.exports = {
  '/api/proj/ai/query': {
    post: {
      body: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          conversation_id: { type: 'string' },
        },
        required: ['question'],
      },
    },
  },
  '/api/proj/ai/history': {
    get: {
      query: {
        type: 'object',
        properties: { conversation_id: { type: 'string' } },
      },
    },
  },
  '/api/proj/ai/suggestions': {
    get: {},
  },
}
