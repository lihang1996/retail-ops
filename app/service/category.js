/**
 * @module service/category
 * @description 商品类目字典服务：租户内类目 CRUD，支持 parent_id 树形结构。
 * 基于 dict-service 工厂生成，名称租户内唯一。
 */
const { createDictService } = require('../common/dict-service')

module.exports = (app) =>
  createDictService(app, {
    table: 'categories',
    idField: 'category_id',
    nameField: 'category_name',
    auditPrefix: 'product:category',
    label: '类目',
  })
