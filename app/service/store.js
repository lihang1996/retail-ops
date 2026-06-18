const {
  ensureDb,
  getTenantId,
  getOperatorId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
} = require('../common/org-helper')

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class StoreService extends BaseService {
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('stores').where({ tenant_id: tenantId })
      if (query.status) qb = qb.andWhere({ status: query.status })
      if (query.store_name) qb = qb.andWhere('store_name', 'like', `%${query.store_name}%`)
      const list = await qb.orderBy('created_at', 'desc')
      return { list, total: list.length }
    }

    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { store_id: storeId } = query
      if (!storeId) bizError('store_id 不能为空')
      return assertRowInTenant(db, 'stores', tenantId, 'store_id', storeId, '店铺')
    }

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

    async disable(ctx, body = {}) {
      return this.update(ctx, { ...body, status: 'disabled' })
    }

    async delete(ctx, body = {}) {
      return this.disable(ctx, body)
    }
  }
}
