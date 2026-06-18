const path = require('path')

module.exports = {
  resolve: {
    alias: {
      $retailAuth: path.resolve(process.cwd(), 'app/pages/common/auth.js'),
    },
  },
}
