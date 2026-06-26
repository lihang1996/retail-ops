const idBody = (idField) => ({
  body: {
    type: 'object',
    properties: { [idField]: { type: 'string' } },
    required: [idField],
  },
})

module.exports = {
  '/api/proj/store/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          store_name: { type: 'string' },
          store_type: { type: 'string' },
          status: { type: 'string' },
          page: { type: 'string' },
          size: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/store': {
    get: {
      query: {
        type: 'object',
        properties: { store_id: { type: 'string' } },
        required: ['store_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          store_name: { type: 'string' },
          store_type: { type: 'string' },
        },
        required: ['store_name'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          store_id: { type: 'string' },
          store_name: { type: 'string' },
          store_type: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['store_id'],
      },
    },
    delete: idBody('store_id'),
  },
}
