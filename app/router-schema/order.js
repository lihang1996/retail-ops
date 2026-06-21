module.exports = {
  '/api/proj/order/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          store_id: { type: 'string' },
          order_no: { type: 'string' },
          created_from: { type: 'string' },
          created_to: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/order': {
    get: {
      query: {
        type: 'object',
        properties: { order_id: { type: 'string' } },
        required: ['order_id'],
      },
    },
  },
  '/api/proj/order/import_result': {
    get: {
      query: {
        type: 'object',
        properties: { batch_id: { type: 'string' } },
        required: ['batch_id'],
      },
    },
  },
  '/api/proj/order/mock_pay': {
    post: {
      body: {
        type: 'object',
        properties: { order_id: { type: 'string' } },
        required: ['order_id'],
      },
    },
  },
  '/api/proj/order/allocate': {
    post: {
      body: {
        type: 'object',
        properties: { order_id: { type: 'string' } },
        required: ['order_id'],
      },
    },
  },
}
