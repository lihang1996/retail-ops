module.exports = {
  '/api/proj/audit/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          operator_id: { type: 'string' },
          action_code: { type: 'string' },
          object_type: { type: 'string' },
          object_id: { type: 'string' },
          created_from: { type: 'string' },
          created_to: { type: 'string' },
        },
      },
    },
  },
}
