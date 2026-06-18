const { createDictController } = require('../common/dict-controller')

module.exports = (app) => createDictController(app, 'category')
