const {
  ensureDb,
  getTenantId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
} = require('../common/org-helper')

function createDictService(app, { table, idField, nameField, auditPrefix, label }) {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class DictService extends BaseService {
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db(table).where({ tenant_id: tenantId })
      if (query.status) qb = qb.andWhere({ status: query.status })
      if (query[nameField]) qb = qb.andWhere(nameField, 'like', `%${query[nameField]}%`)
      const list = await qb.orderBy('created_at', 'desc')
      return { list, total: list.length }
    }

    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const id = query[idField]
      if (!id) bizError(`${idField} 不能为空`)
      return assertRowInTenant(db, table, tenantId, idField, id, label)
    }

    async create(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const name = body[nameField]
      if (!name) bizError('名称不能为空')

      const exists = await db(table).where({ tenant_id: tenantId, [nameField]: name }).first()
      if (exists) bizError('名称已存在', 40900)

      const rowId = idGen.next(idField.replace('_id', ''))
      const row = {
        [idField]: rowId,
        tenant_id: tenantId,
        [nameField]: name,
        status: 'active',
      }
      if (table === 'categories' && body.parent_id !== undefined) {
        row.parent_id = body.parent_id || null
      }
      await db(table).insert(row)

      await audit(app, ctx, {
        actionCode: `${auditPrefix}:create`,
        objectType: table.replace(/s$/, ''),
        objectId: rowId,
        detail: { [nameField]: name },
      })
      return { [idField]: rowId }
    }

    async update(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const id = body[idField]
      if (!id) bizError(`${idField} 不能为空`)

      await assertRowInTenant(db, table, tenantId, idField, id, label)

      const patch = {}
      if (body[nameField]) patch[nameField] = body[nameField]
      if (body.status) patch.status = body.status
      if (table === 'categories' && body.parent_id !== undefined) {
        patch.parent_id = body.parent_id || null
      }

      await db(table).where({ [idField]: id }).update(patch)
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
