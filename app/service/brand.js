const { createDictService } = require('../common/dict-service')

module.exports = (app) =>
  createDictService(app, {
    table: 'brands',
    idField: 'brand_id',
    nameField: 'brand_name',
    auditPrefix: 'product:brand',
    label: '品牌',
  })
