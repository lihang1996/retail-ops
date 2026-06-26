module.exports = {
  '/api/proj/brand/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          brand_name: { type: 'string' },
          status: { type: 'string' },
          page: { type: 'string' },
          size: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/brand': {
    get: {
      query: {
        type: 'object',
        properties: { brand_id: { type: 'string' } },
        required: ['brand_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: { brand_name: { type: 'string' } },
        required: ['brand_name'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          brand_id: { type: 'string' },
          brand_name: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['brand_id'],
      },
    },
  },
}
