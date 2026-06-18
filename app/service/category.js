const { createDictService } = require('../common/dict-service')

module.exports = (app) =>
  createDictService(app, {
    table: 'categories',
    idField: 'category_id',
    nameField: 'category_name',
    auditPrefix: 'product:category',
    label: '类目',
  })
