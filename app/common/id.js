const crypto = require('crypto')

module.exports = {
  next(prefix = 'id') {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  },
}
