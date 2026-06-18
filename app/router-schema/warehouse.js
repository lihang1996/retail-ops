module.exports = {
  '/api/proj/warehouse/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          warehouse_name: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/warehouse': {
    get: {
      query: {
        type: 'object',
        properties: { warehouse_id: { type: 'string' } },
        required: ['warehouse_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          warehouse_name: { type: 'string' },
          warehouse_code: { type: 'string' },
          address: { type: 'string' },
        },
        required: ['warehouse_name', 'warehouse_code'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          warehouse_name: { type: 'string' },
          address: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['warehouse_id'],
      },
    },
  },
  '/api/proj/warehouse/layout': {
    get: {
      query: {
        type: 'object',
        properties: { warehouse_id: { type: 'string' } },
        required: ['warehouse_id'],
      },
    },
  },
  '/api/proj/warehouse/location/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          location_code: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/warehouse/location': {
    get: {
      query: {
        type: 'object',
        properties: { location_id: { type: 'string' } },
        required: ['location_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          warehouse_id: { type: 'string' },
          location_code: { type: 'string' },
          zone_id: { type: 'string' },
          shelf_id: { type: 'string' },
          capacity: { type: 'number' },
          pos_x: { type: 'number' },
          pos_y: { type: 'number' },
          pos_z: { type: 'number' },
        },
        required: ['warehouse_id', 'location_code'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          location_id: { type: 'string' },
          capacity: { type: 'number' },
          pos_x: { type: 'number' },
          pos_y: { type: 'number' },
          pos_z: { type: 'number' },
          status: { type: 'string' },
        },
        required: ['location_id'],
      },
    },
  },
}
