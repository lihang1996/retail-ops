const { createResourceController } = require('../common/create-resource-controller')

module.exports = (app) => createResourceController(app, 'store', { removeMethod: 'delete' })
