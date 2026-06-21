const {
  ensureDb,
  getTenantId,
  getOperatorId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
  activeOnly,
} = require('../common/org-helper')

const ON_SALE_STATUSES = ['on_sale']

async function writeStatusLog(db, { tenantId, productId, fromStatus, toStatus, operatorId, remark }) {
  await db('product_status_logs').insert({
    log_id: idGen.next('pslog'),
    tenant_id: tenantId,
    product_id: productId,
    from_status: fromStatus,
    to_status: toStatus,
    operator_id: operatorId,
    remark: remark || null,
  })
}

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class ProductService extends BaseService {
    _productQuery(db, tenantId) {
      return activeOnly(db('products as p'))
        .leftJoin('categories as c', 'p.category_id', 'c.category_id')
        .leftJoin('brands as b', 'p.brand_id', 'b.brand_id')
        .where('p.tenant_id', tenantId)
    }

    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = this._productQuery(db, tenantId).select(
        'p.*',
        'c.category_name',
        'b.brand_name'
      )
      if (query.status) qb = qb.andWhere('p.status', query.status)
      if (query.product_name) qb = qb.andWhere('p.product_name', 'like', `%${query.product_name}%`)
      if (query.category_id) qb = qb.andWhere('p.category_id', query.category_id)

      const list = await qb.orderBy('p.created_at', 'desc')
      const skuCounts = await db('product_skus')
        .where({ tenant_id: tenantId })
        .whereNull('deleted_at')
        .groupBy('product_id')
        .select('product_id')
        .count('* as sku_count')

      const countMap = {}
      skuCounts.forEach((row) => {
        countMap[row.product_id] = Number(row.sku_count)
      })

      return {
        list: list.map((item) => ({
          ...item,
          sku_count: countMap[item.product_id] || 0,
        })),
        total: list.length,
      }
    }

    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { product_id: productId } = query
      if (!productId) bizError('product_id 不能为空')

      const product = await this._productQuery(db, tenantId)
        .andWhere('p.product_id', productId)
        .select('p.*', 'c.category_name', 'b.brand_name')
        .first()
      if (!product) bizError('商品不存在', 40400)

      const skus = await activeOnly(db('product_skus'))
        .where({ tenant_id: tenantId, product_id: productId })
        .orderBy('created_at', 'asc')

      return { ...product, skus }
    }

    async create(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const {
        product_name: productName,
        category_id: categoryId,
        brand_id: brandId,
        main_image: mainImage,
        description,
      } = body

      if (!productName) bizError('商品名称不能为空')
      if (categoryId) await assertRowInTenant(db, 'categories', tenantId, 'category_id', categoryId, '类目')
      if (brandId) await assertRowInTenant(db, 'brands', tenantId, 'brand_id', brandId, '品牌')

      const productId = idGen.next('product')
      await db('products').insert({
        product_id: productId,
        tenant_id: tenantId,
        product_name: productName,
        category_id: categoryId || null,
        brand_id: brandId || null,
        main_image: mainImage || null,
        description: description || null,
        status: 'draft',
        review_status: 'none',
        created_by: operatorId,
        updated_by: operatorId,
      })

      await audit(app, ctx, {
        actionCode: 'product:create',
        objectType: 'product',
        objectId: productId,
        detail: { productName },
      })
      return { productId }
    }

    async update(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const {
        product_id: productId,
        product_name: productName,
        category_id: categoryId,
        brand_id: brandId,
        main_image: mainImage,
        description,
      } = body
      if (!productId) bizError('product_id 不能为空')

      const product = await activeOnly(db('products'))
        .where({ tenant_id: tenantId, product_id: productId })
        .first()
      if (!product) bizError('商品不存在', 40400)
      if (ON_SALE_STATUSES.includes(product.status)) {
        bizError('已上架商品不可直接编辑，请先下架', 40900)
      }

      if (categoryId) await assertRowInTenant(db, 'categories', tenantId, 'category_id', categoryId, '类目')
      if (brandId) await assertRowInTenant(db, 'brands', tenantId, 'brand_id', brandId, '品牌')

      const patch = { updated_by: operatorId }
      if (productName) patch.product_name = productName
      if (categoryId !== undefined) patch.category_id = categoryId || null
      if (brandId !== undefined) patch.brand_id = brandId || null
      if (mainImage !== undefined) patch.main_image = mainImage || null
      if (description !== undefined) patch.description = description || null

      await db('products').where({ product_id: productId }).update(patch)
      await audit(app, ctx, {
        actionCode: 'product:update',
        objectType: 'product',
        objectId: productId,
        detail: patch,
      })
      return { productId }
    }

    async delete(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { product_id: productId } = body
      if (!productId) bizError('product_id 不能为空')

      const product = await activeOnly(db('products'))
        .where({ tenant_id: tenantId, product_id: productId })
        .first()
      if (!product) bizError('商品不存在', 40400)
      if (product.status !== 'draft') bizError('仅草稿商品可删除', 40900)

      await db('products').where({ product_id: productId }).update({
        deleted_at: new Date(),
        updated_by: operatorId,
        status: 'deleted',
      })

      await audit(app, ctx, {
        actionCode: 'product:delete',
        objectType: 'product',
        objectId: productId,
        detail: { action: 'soft_delete' },
      })
      return { productId }
    }

    async listSkus(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { product_id: productId } = query
      if (!productId) bizError('product_id 不能为空')
      const product = await activeOnly(db('products'))
        .where({ tenant_id: tenantId, product_id: productId })
        .first()
      if (!product) bizError('商品不存在', 40400)

      const list = await activeOnly(db('product_skus'))
        .where({ tenant_id: tenantId, product_id: productId })
        .orderBy('created_at', 'asc')
      return { list, total: list.length }
    }

    async createSku(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const {
        product_id: productId,
        sku_code: skuCode,
        barcode,
        spec_json: specJson,
        sale_price: salePrice = 0,
        cost_price: costPrice,
      } = body

      if (!productId || !skuCode) bizError('product_id 与 sku_code 不能为空')
      const product = await activeOnly(db('products'))
        .where({ tenant_id: tenantId, product_id: productId })
        .first()
      if (!product) bizError('商品不存在', 40400)
      if (ON_SALE_STATUSES.includes(product.status)) {
        bizError('已上架商品不可新增 SKU', 40900)
      }

      const exists = await activeOnly(db('product_skus'))
        .where({ tenant_id: tenantId, sku_code: skuCode })
        .first()
      if (exists) bizError('SKU 编码已存在', 40900)

      const skuId = idGen.next('sku')
      await db('product_skus').insert({
        sku_id: skuId,
        tenant_id: tenantId,
        product_id: productId,
        sku_code: skuCode,
        barcode: barcode || null,
        spec_json: specJson ? JSON.stringify(specJson) : null,
        sale_price: salePrice,
        cost_price: costPrice ?? null,
        status: 'active',
      })

      await audit(app, ctx, {
        actionCode: 'product:update',
        objectType: 'sku',
        objectId: skuId,
        detail: { productId, skuCode, action: 'create_sku' },
      })
      return { skuId }
    }

    async updateSku(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const {
        sku_id: skuId,
        barcode,
        spec_json: specJson,
        sale_price: salePrice,
        cost_price: costPrice,
        status,
      } = body
      if (!skuId) bizError('sku_id 不能为空')

      const sku = await activeOnly(db('product_skus'))
        .where({ tenant_id: tenantId, sku_id: skuId })
        .first()
      if (!sku) bizError('SKU 不存在', 40400)

      const product = await db('products').where({ product_id: sku.product_id }).first()
      if (product && ON_SALE_STATUSES.includes(product.status) && status === 'disabled') {
        bizError('已上架商品不可删除 SKU', 40900)
      }

      const patch = {}
      if (barcode !== undefined) patch.barcode = barcode || null
      if (specJson !== undefined) patch.spec_json = specJson ? JSON.stringify(specJson) : null
      if (salePrice !== undefined) {
        if (salePrice < 0) bizError('售价不能为负数')
        patch.sale_price = salePrice
      }
      if (costPrice !== undefined) patch.cost_price = costPrice
      if (status) patch.status = status

      await db('product_skus').where({ sku_id: skuId }).update(patch)
      await audit(app, ctx, {
        actionCode: 'product:update',
        objectType: 'sku',
        objectId: skuId,
        detail: patch,
      })
      return { skuId }
    }

    async deleteSku(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { sku_id: skuId } = body
      if (!skuId) bizError('sku_id 不能为空')

      const sku = await activeOnly(db('product_skus'))
        .where({ tenant_id: tenantId, sku_id: skuId })
        .first()
      if (!sku) bizError('SKU 不存在', 40400)

      const product = await db('products').where({ product_id: sku.product_id }).first()
      if (product && ON_SALE_STATUSES.includes(product.status)) {
        bizError('已上架商品不可删除 SKU', 40900)
      }

      await db('product_skus').where({ sku_id: skuId }).update({ deleted_at: new Date(), status: 'disabled' })
      await audit(app, ctx, {
        actionCode: 'product:update',
        objectType: 'sku',
        objectId: skuId,
        detail: { action: 'delete_sku' },
      })
      return { skuId }
    }

    async _transitionStatus(ctx, productId, toStatus, { allowedFrom, auditCode, remark }) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)

      const product = await activeOnly(db('products'))
        .where({ tenant_id: tenantId, product_id: productId })
        .first()
      if (!product) bizError('商品不存在', 40400)
      if (!allowedFrom.includes(product.status)) {
        bizError(`当前状态 ${product.status} 不可执行该操作`, 40900)
      }

      if (toStatus === 'on_sale') {
        await this._validateOnSale(db, tenantId, product)
      }

      const reviewStatus = toStatus === 'pending_review'
        ? 'pending'
        : toStatus === 'on_sale'
          ? 'approved'
          : product.review_status

      await db('products').where({ product_id: productId }).update({
        status: toStatus,
        review_status: reviewStatus,
        updated_by: operatorId,
      })

      await writeStatusLog(db, {
        tenantId,
        productId,
        fromStatus: product.status,
        toStatus,
        operatorId,
        remark,
      })

      await audit(app, ctx, {
        actionCode: auditCode,
        objectType: 'product',
        objectId: productId,
        detail: { from: product.status, to: toStatus },
      })

      return { productId, status: toStatus }
    }

    async _validateOnSale(db, tenantId, product) {
      if (!product.category_id) bizError('上架前需选择类目', 40900)
      if (!product.main_image) bizError('上架前需设置主图', 40900)

      const skus = await activeOnly(db('product_skus'))
        .where({ tenant_id: tenantId, product_id: product.product_id, status: 'active' })
      if (!skus.length) bizError('上架前需至少一个有效 SKU', 40900)

      const hasPrice = skus.some((s) => Number(s.sale_price) > 0)
      if (!hasPrice) bizError('上架前 SKU 需设置售价', 40900)
    }

    async submitReview(ctx, body = {}) {
      const { product_id: productId } = body
      if (!productId) bizError('product_id 不能为空')
      return this._transitionStatus(ctx, productId, 'pending_review', {
        allowedFrom: ['draft', 'off_sale'],
        auditCode: 'product:submit_review',
      })
    }

    async onSale(ctx, body = {}) {
      const { product_id: productId } = body
      if (!productId) bizError('product_id 不能为空')

      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const approved = await db('approvals')
        .where({
          tenant_id: tenantId,
          ref_type: 'product_on_sale',
          ref_id: productId,
          status: 'approved',
        })
        .orderBy('updated_at', 'desc')
        .first()
      if (!approved) bizError('商品需先通过上架审批', 40900)

      return this._transitionStatus(ctx, productId, 'on_sale', {
        allowedFrom: ['pending_review'],
        auditCode: 'product:on_sale',
        remark: '审批通过上架',
      })
    }

    async offSale(ctx, body = {}) {
      const { product_id: productId } = body
      if (!productId) bizError('product_id 不能为空')
      return this._transitionStatus(ctx, productId, 'off_sale', {
        allowedFrom: ['on_sale'],
        auditCode: 'product:off_sale',
      })
    }
  }
}
