module.exports = {
  '/api/proj/category/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          category_name: { type: 'string' },
          status: { type: 'string' },
          page: { type: 'string' },
          size: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/category': {
    get: {
      query: {
        type: 'object',
        properties: { category_id: { type: 'string' } },
        required: ['category_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          category_name: { type: 'string' },
          parent_id: { type: 'string' },
        },
        required: ['category_name'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          category_id: { type: 'string' },
          category_name: { type: 'string' },
          parent_id: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['category_id'],
      },
    },
  },
}
