module.exports = {
  '/api/proj/approval/submit': {
    post: {
      body: {
        type: 'object',
        properties: {
          ref_type: { type: 'string' },
          ref_id: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['ref_id'],
      },
    },
  },
  '/api/proj/approval/todo_list': {
    get: {
      query: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          keyword: { type: 'string' },
          product_status: { type: 'string' },
          applicant_name: { type: 'string' },
          page: { type: 'string' },
          size: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/approval/approve': {
    post: {
      body: {
        type: 'object',
        properties: {
          approval_id: { type: 'string' },
          remark: { type: 'string' },
        },
        required: ['approval_id'],
      },
    },
  },
  '/api/proj/approval/reject': {
    post: {
      body: {
        type: 'object',
        properties: {
          approval_id: { type: 'string' },
          remark: { type: 'string' },
        },
        required: ['approval_id'],
      },
    },
  },
}
