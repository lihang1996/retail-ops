module.exports = {
  '/api/auth/login': {
    post: {
      body: {
        type: 'object',
        properties: {
          account: { type: 'string' },
          password: { type: 'string' },
        },
        required: ['account', 'password'],
      },
    },
  },
}
