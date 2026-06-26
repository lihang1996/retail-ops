/**
 * @module service/brand
 * @description 品牌字典服务：租户内品牌 CRUD，名称租户内唯一。
 *
 * 通过 createDictService 工厂函数生成，提供标准 CRUD 方法：
 * - list(ctx, query) - 列表查询（支持状态和名称筛选）
 * - get(ctx, query) - 详情查询（校验租户归属）
 * - create(ctx, body) - 创建品牌（名称唯一性校验）
 * - update(ctx, body) - 更新品牌（名称或状态）
 *
 * 业务规则：
 * - 表：brands
 * - 主键：brand_id
 * - 名称字段：brand_name（租户内唯一）
 * - 审计前缀：product:brand
 *
 * 写入时记录 product:brand 审计日志。
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
