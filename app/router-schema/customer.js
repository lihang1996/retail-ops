module.exports = {
  '/api/proj/customer/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          customer_segment: { type: 'string' },
          page: { type: 'string' },
          size: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/customer': {
    get: {
      query: {
        type: 'object',
        properties: { customer_id: { type: 'string' } },
        required: ['customer_id'],
      },
    },
  },
}
