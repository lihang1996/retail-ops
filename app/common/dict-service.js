/**
 * @module common/dict-service
 * @description 字典表服务工厂：为类目、品牌等简单字典表生成标准 CRUD 服务。
 *
 * 核心职责：
 * 1. 减少重复代码，统一字典表操作逻辑
 * 2. 自动处理租户隔离
 * 3. 自动记录审计日志
 * 4. 名称唯一性校验
 *
 * 使用场景：
 * - 品牌管理（brands）
 * - 类目管理（categories）
 * - 店铺管理（stores）
 * - 其他简单字典表
 *
 * 特点：
 * - 租户内名称唯一
 * - 支持状态筛选（active/disabled）
 * - 支持模糊搜索
 * - 类目表支持 parent_id（树形结构）
 */
const {
  ensureDb,
  getTenantId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
} = require('../common/org-helper')
const { paginateQuery, hasFilterValue } = require('./pagination')

/**
 * 创建字典表服务类
 * @param {Object} app - Koa 应用实例
 * @param {Object} config - 配置项
 * @param {string} config.table - 表名（如 'brands', 'categories'）
 * @param {string} config.idField - 主键字段名（如 'brand_id', 'category_id'）
 * @param {string} config.nameField - 名称字段名（如 'brand_name', 'category_name'）
 * @param {string} config.auditPrefix - 审计日志前缀（如 'product:brand'）
 * @param {string} config.label - 中文标签（如 '品牌', '类目'）
 * @returns {Class} 生成的字典服务类
 *
 * @example
 * // 创建品牌服务
 * createDictService(app, {
 *   table: 'brands',
 *   idField: 'brand_id',
 *   nameField: 'brand_name',
 *   auditPrefix: 'product:brand',
 *   label: '品牌',
 * })
 */
function createDictService(app, {
  table,
  idField,
  nameField,
  auditPrefix,
  label,
  treeParentField,
}) {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class DictService extends BaseService {
    /**
     * 列出字典项，支持状态和名称筛选
     * @param {Object} ctx - Koa 上下文
     * @param {Object} query - 查询参数
     * @param {string} query.status - 状态筛选（active/disabled）
     * @param {string} query[nameField] - 名称模糊搜索
     * @returns {Object} { list, total }
     */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      // 构建查询：租户隔离
      let qb = db(table).where({ tenant_id: tenantId })

      // 状态筛选
      if (hasFilterValue(query.status)) qb = qb.andWhere({ status: query.status })

      // 名称模糊搜索
      if (hasFilterValue(query[nameField])) qb = qb.andWhere(nameField, 'like', `%${query[nameField].trim()}%`)

      return paginateQuery(qb.orderBy('created_at', 'desc'), query, { countColumn: idField })
    }

    /**
     * 获取单个字典项详情
     * @param {Object} ctx - Koa 上下文
     * @param {Object} query - 查询参数
     * @param {string} query[idField] - 记录 ID
     * @returns {Object} 字典项记录
     */
    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const id = query[idField]
      if (!id) bizError(`${idField} 不能为空`)

      // 校验记录存在且属于当前租户
      return assertRowInTenant(db, table, tenantId, idField, id, label)
    }

    /**
     * 创建字典项，名称租户内唯一
     * @param {Object} ctx - Koa 上下文
     * @param {Object} body - 请求体
     * @param {string} body[nameField] - 名称（必填）
     * @param {string} body.parent_id - 上级 ID（仅类目表支持）
     * @returns {Object} { [idField]: rowId }
     */
    async create(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const name = body[nameField]
      if (!name) bizError('名称不能为空')

      // 检查名称租户内唯一
      const exists = await db(table).where({ tenant_id: tenantId, [nameField]: name }).first()
      if (exists) bizError('名称已存在', 40900)

      // 生成 ID 和记录
      const rowId = idGen.next(idField.replace('_id', ''))
      const row = {
        [idField]: rowId,
        tenant_id: tenantId,
        [nameField]: name,
        status: 'active',
      }

      // 树形字典支持 parent_id
      if (treeParentField && body[treeParentField] !== undefined) {
        row[treeParentField] = body[treeParentField] || null
      }

      await db(table).insert(row)

      // 记录审计日志
      await audit(app, ctx, {
        actionCode: `${auditPrefix}:create`,
        objectType: table.replace(/s$/, ''), // brands -> brand
        objectId: rowId,
        detail: { [nameField]: name },
      })

      return { [idField]: rowId }
    }

    /**
     * 更新字典项名称或状态
     * @param {Object} ctx - Koa 上下文
     * @param {Object} body - 请求体
     * @param {string} body[idField] - 记录 ID（必填）
     * @param {string} body[nameField] - 新名称
     * @param {string} body.status - 新状态（active/disabled）
     * @param {string} body.parent_id - 新上级 ID（仅类目表支持）
     * @returns {Object} { [idField]: id }
     */
    async update(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const id = body[idField]
      if (!id) bizError(`${idField} 不能为空`)

      // 校验记录存在且属于当前租户
      await assertRowInTenant(db, table, tenantId, idField, id, label)

      // 构建更新补丁
      const patch = {}
      if (body[nameField]) patch[nameField] = body[nameField]
      if (body.status) patch.status = body.status

      if (treeParentField && body[treeParentField] !== undefined) {
        patch[treeParentField] = body[treeParentField] || null
      }

      await db(table).where({ [idField]: id }).update(patch)

      // 记录审计日志
      await audit(app, ctx, {
        actionCode: `${auditPrefix}:update`,
        objectType: table.replace(/s$/, ''),
        objectId: id,
        detail: patch,
      })

      return { [idField]: id }
    }
  }
}

module.exports = { createDictService }
