module.exports = {
  '/api/proj/shipment/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          order_id: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/shipment': {
    get: {
      query: {
        type: 'object',
        properties: { shipment_id: { type: 'string' } },
        required: ['shipment_id'],
      },
    },
  },
  '/api/proj/shipment/create_from_order': {
    post: {
      body: {
        type: 'object',
        properties: { order_id: { type: 'string' } },
        required: ['order_id'],
      },
    },
  },
  '/api/proj/shipment/start_pick': {
    post: {
      body: {
        type: 'object',
        properties: { shipment_id: { type: 'string' } },
        required: ['shipment_id'],
      },
    },
  },
  '/api/proj/shipment/confirm_pick': {
    post: {
      body: {
        type: 'object',
        properties: { shipment_id: { type: 'string' } },
        required: ['shipment_id'],
      },
    },
  },
  '/api/proj/shipment/ship': {
    post: {
      body: {
        type: 'object',
        properties: {
          shipment_id: { type: 'string' },
          carrier: { type: 'string' },
          tracking_no: { type: 'string' },
        },
        required: ['shipment_id'],
      },
    },
  },
}
