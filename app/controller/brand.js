/**
 * @module controller/brand
 * @description 品牌控制器：品牌字典表的 CRUD 接口。
 *
 * 通过 createDictController 工厂函数生成，提供标准 CRUD 接口：
 * - GET /api/proj/brand/list - 列表查询
 * - GET /api/proj/brand - 详情查询
 * - POST /api/proj/brand - 创建品牌
 * - PUT /api/proj/brand - 更新品牌
 *
 * 业务规则：
 * - 品牌名称租户内唯一
 * - 支持状态筛选（active/disabled）
 * - 支持名称模糊搜索
 *
 * 委托给 service.brand（基于 dict-service 生成）
 */
const { createDictController } = require('../common/dict-controller')

module.exports = (app) => createDictController(app, 'brand')
