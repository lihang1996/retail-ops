module.exports = {
  '/api/proj/customer/list': {
    get: {
      query: {
        type: 'object',
        properties: { customer_name: { type: 'string' } },
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
