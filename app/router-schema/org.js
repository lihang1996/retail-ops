module.exports = {
  '/api/proj/org/department/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          dept_name: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/org/department': {
    get: {
      query: {
        type: 'object',
        properties: {
          dept_id: { type: 'string' },
        },
        required: ['dept_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          dept_name: { type: 'string' },
          parent_id: { type: 'string' },
        },
        required: ['dept_name'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          dept_id: { type: 'string' },
          dept_name: { type: 'string' },
          parent_id: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['dept_id'],
      },
    },
    delete: {
      body: {
        type: 'object',
        properties: {
          dept_id: { type: 'string' },
        },
        required: ['dept_id'],
      },
    },
  },
  '/api/proj/org/department/disable': {
    post: {
      body: {
        type: 'object',
        properties: {
          dept_id: { type: 'string' },
        },
        required: ['dept_id'],
      },
    },
  },
  '/api/proj/org/user/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          account: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/org/user': {
    get: {
      query: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
        },
        required: ['user_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          account: { type: 'string' },
          display_name: { type: 'string' },
          password: { type: 'string' },
          dept_id: { type: 'string' },
          role_ids: { type: 'array', items: { type: 'string' } },
        },
        required: ['account', 'display_name'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          display_name: { type: 'string' },
          dept_id: { type: 'string' },
          role_ids: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
        },
        required: ['user_id'],
      },
    },
  },
  '/api/proj/org/user/reset_password': {
    post: {
      body: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          password: { type: 'string' },
        },
        required: ['user_id'],
      },
    },
  },
  '/api/proj/org/user/lock': {
    post: {
      body: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
        },
        required: ['user_id'],
      },
    },
  },
  '/api/proj/org/user/unlock': {
    post: {
      body: {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
        },
        required: ['user_id'],
      },
    },
  },
  '/api/proj/org/role/list': {
    get: {
      query: {
        type: 'object',
        properties: {
          role_name: { type: 'string' },
          status: { type: 'string' },
        },
      },
    },
  },
  '/api/proj/org/role': {
    get: {
      query: {
        type: 'object',
        properties: {
          role_id: { type: 'string' },
        },
        required: ['role_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          role_code: { type: 'string' },
          role_name: { type: 'string' },
        },
        required: ['role_code', 'role_name'],
      },
    },
    put: {
      body: {
        type: 'object',
        properties: {
          role_id: { type: 'string' },
          role_name: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['role_id'],
      },
    },
  },
  '/api/proj/org/role_permissions': {
    get: {
      query: {
        type: 'object',
        properties: {
          role_id: { type: 'string' },
        },
        required: ['role_id'],
      },
    },
    post: {
      body: {
        type: 'object',
        properties: {
          role_id: { type: 'string' },
          permission_ids: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['role_id'],
      },
    },
  },
}
