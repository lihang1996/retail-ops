module.exports = {
  '/api/proj/workbench/fulfillment': {
    get: {
      query: {
        type: 'object',
        properties: {
          tab: { type: 'string' },
          date_scope: { type: 'string' },
          order_no: { type: 'string' },
          keyword: { type: 'string' },
          store_name: { type: 'string' },
          customer_name: { type: 'string' },
          warehouse_name: { type: 'string' },
          shipment_no: { type: 'string' },
          page: { type: 'string' },
          page_size: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/workbench/ops': {
    get: {
      query: {
        type: 'object',
        properties: {},
      },
    },
  },
}
