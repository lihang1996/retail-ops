/**
 * @module service/category
 * @description 商品类目字典服务：租户内类目 CRUD，支持 parent_id 树形结构。
 *
 * 通过 createDictService 工厂函数生成，提供标准 CRUD 方法：
 * - list(ctx, query) - 列表查询（支持状态和名称筛选）
 * - get(ctx, query) - 详情查询（校验租户归属）
 * - create(ctx, body) - 创建类目（名称唯一性校验，支持 parent_id）
 * - update(ctx, body) - 更新类目（名称、状态或 parent_id）
 *
 * 业务规则：
 * - 表：categories
 * - 主键：category_id
 * - 名称字段：category_name（租户内唯一）
 * - 审计前缀：product:category
 * - 树形结构：parent_id 字段支持上下级关系
 *
 * 基于 dict-service 工厂生成，写入时记录 product:category 审计日志。
 */
const { createDictService } = require('../common/dict-service')

module.exports = (app) =>
  createDictService(app, {
    table: 'categories',
    idField: 'category_id',
    nameField: 'category_name',
    auditPrefix: 'product:category',
    label: '类目',
    treeParentField: 'parent_id',
  })
