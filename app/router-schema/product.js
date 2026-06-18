module.exports = {
  '/api/proj/product/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          product_name: { type: 'string' },
          status: { type: 'string' },
          category_id: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/product': {
    get: {
      query: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          product_name: { type: 'string' },
          category_id: { type: 'string' },
          brand_id: { type: 'string' },
          main_image: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['product_name'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          product_name: { type: 'string' },
          category_id: { type: 'string' },
          brand_id: { type: 'string' },
          main_image: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['product_id'],
      },
    },
    delete: {
      body: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
    },
  },
  '/api/proj/product/sku_list': {
    get: {
      query: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
    },
  },
  '/api/proj/product/sku': {
    post: {
      body: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          sku_code: { type: 'string' },
          barcode: { type: 'string' },
          sale_price: { type: 'number' },
          cost_price: { type: 'number' },
        },
        required: ['product_id', 'sku_code'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          sku_id: { type: 'string' },
          barcode: { type: 'string' },
          sale_price: { type: 'number' },
          cost_price: { type: 'number' },
          status: { type: 'string' },
        },
        required: ['sku_id'],
      },
    },
    delete: {
      body: {
        type: 'object',
        properties: { sku_id: { type: 'string' } },
        required: ['sku_id'],
      },
    },
  },
  '/api/proj/product/submit_review': {
    post: {
      body: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
    },
  },
  '/api/proj/product/on_sale': {
    post: {
      body: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
    },
  },
  '/api/proj/product/off_sale': {
    post: {
      body: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
    },
  },
}
