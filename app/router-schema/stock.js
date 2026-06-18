module.exports = {
  '/api/proj/stock/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          sku_id: { type: 'string' },
          sku_code: { type: 'string' },
          risk: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/stock/location_list': {
    get: {
      query: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          sku_id: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/stock/location/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          sku_id: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/stock/log_list': {
    get: {
      query: {
        type: 'object',
        properties: {
          sku_id: { type: 'string' },
          warehouse_id: { type: 'string' },
          action_type: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/stock/inbound': {
    post: {
      body: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          location_id: { type: 'string' },
          sku_id: { type: 'string' },
          qty: { type: 'number' },
          remark: { type: 'string' },
        },
        required: ['warehouse_id', 'sku_id', 'qty'],
      },
    },
  },
  '/api/proj/stock/lock': {
    post: {
      body: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          sku_id: { type: 'string' },
          qty: { type: 'number' },
          ref_type: { type: 'string' },
          ref_id: { type: 'string' },
        },
        required: ['warehouse_id', 'sku_id', 'qty', 'ref_id'],
      },
    },
  },
  '/api/proj/stock/unlock': {
    post: {
      body: {
        type: 'object',
        properties: { lock_id: { type: 'string' } },
        required: ['lock_id'],
      },
    },
  },
  '/api/proj/stock/outbound': {
    post: {
      body: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          sku_id: { type: 'string' },
          qty: { type: 'number' },
          lock_id: { type: 'string' },
          ref_type: { type: 'string' },
          ref_id: { type: 'string' },
        },
        required: ['warehouse_id', 'sku_id', 'qty'],
      },
    },
  },
}
