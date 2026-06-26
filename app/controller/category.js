/**
 * @module controller/category
 * @description 类目控制器：商品类目字典表的 CRUD 接口。
 *
 * 通过 createDictController 工厂函数生成，提供标准 CRUD 接口：
 * - GET /api/proj/category/list - 列表查询
 * - GET /api/proj/category - 详情查询
 * - POST /api/proj/category - 创建类目
 * - PUT /api/proj/category - 更新类目
 *
 * 业务规则：
 * - 类目名称租户内唯一
 * - 支持树形结构（parent_id）
 * - 支持状态筛选（active/disabled）
 * - 支持名称模糊搜索
 *
 * 委托给 service.category（基于 dict-service 生成）
 */
const { createDictController } = require('../common/dict-controller')

module.exports = (app) => createDictController(app, 'category')
