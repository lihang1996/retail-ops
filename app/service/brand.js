/**
 * @module service/brand
 * @description 品牌字典服务：租户内品牌 CRUD，名称租户内唯一。
 * 基于 dict-service 工厂生成，写入时记录 product:brand 审计日志。
 */
const { createDictService } = require('../common/dict-service')

module.exports = (app) =>
  createDictService(app, {
    table: 'brands',
    idField: 'brand_id',
    nameField: 'brand_name',
    auditPrefix: 'product:brand',
    label: '品牌',
  })
