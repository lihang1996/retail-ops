/**
 * @module service/store
 * @description 店铺管理服务：租户内线上/线下店铺 CRUD。
 * 关键规则：店铺名称租户内唯一；删除为软禁用（status=disabled）。
 */
const {
  ensureDb,
  getTenantId,
  getOperatorId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
} = require('../common/org-helper')
const { paginateQuery } = require('../common/pagination')
const { applyFilters } = require('../common/apply-filters')

const STORE_LIST_FILTERS = [
  { key: 'status', column: 'status' },
  { key: 'store_name', column: 'store_name', op: 'like', transform: (value) => value.trim() },
  { key: 'store_type', column: 'store_type' },
]

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class StoreService extends BaseService {
    /** 列出当前租户店铺，支持状态与名称筛选 */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('stores').where({ tenant_id: tenantId })
      qb = applyFilters(qb, query, STORE_LIST_FILTERS)
      return paginateQuery(qb.orderBy('created_at', 'desc'), query, { countColumn: 'store_id' })
    }

    /** 获取单个店铺，校验 tenant_id 归属 */
    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { store_id: storeId } = query
      if (!storeId) bizError('store_id 不能为空')
      return assertRowInTenant(db, 'stores', tenantId, 'store_id', storeId, '店铺')
    }

    /** 创建店铺，名称租户内不可重复 */
    async create(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { store_name: storeName, store_type: storeType = 'online' } = body
      if (!storeName) bizError('店铺名称不能为空')

      const exists = await db('stores').where({ tenant_id: tenantId, store_name: storeName }).first()
      if (exists) bizError('店铺名称已存在', 40900)

      const storeId = idGen.next('store')
      await db('stores').insert({
        store_id: storeId,
        tenant_id: tenantId,
        store_name: storeName,
        store_type: storeType,
        status: 'active',
        created_by: operatorId,
        updated_by: operatorId,
      })

      await audit(app, ctx, {
        actionCode: 'store:create',
        objectType: 'store',
        objectId: storeId,
        detail: { storeName, storeType },
      })

      return { storeId }
    }

    /** 更新店铺名称、类型或状态 */
    async update(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { store_id: storeId, store_name: storeName, store_type: storeType, status } = body
      if (!storeId) bizError('store_id 不能为空')

      await assertRowInTenant(db, 'stores', tenantId, 'store_id', storeId, '店铺')

      const patch = { updated_by: operatorId }
      if (storeName) patch.store_name = storeName
      if (storeType) patch.store_type = storeType
      if (status) patch.status = status

      await db('stores').where({ store_id: storeId }).update(patch)
      await audit(app, ctx, {
        actionCode: 'store:update',
        objectType: 'store',
        objectId: storeId,
        detail: patch,
      })
      return { storeId }
    }

    /** 禁用店铺 */
    async disable(ctx, body = {}) {
      return this.update(ctx, { ...body, status: 'disabled' })
    }

    /** 删除店铺（等同禁用） */
    async delete(ctx, body = {}) {
      return this.disable(ctx, body)
    }
  }
}
