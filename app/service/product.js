/**
 * @module service/product
 * @description 商品与 SKU 管理：商品 CRUD、SKU 维护、上架审批流。
 * 状态流转：draft → pending_review → on_sale ↔ off_sale；已上架商品不可直接编辑 SKU。
 * 关键规则：上架须类目/主图/有效 SKU/售价；on_sale 需先通过 approval 审批。
 */
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
const { paginateQuery, hasFilterValue } = require('../common/pagination')
const { applyFilters } = require('../common/apply-filters')

const PRODUCT_LIST_FILTERS = [
  { key: 'status', column: 'p.status' },
  { key: 'product_name', column: 'p.product_name', op: 'like', transform: (value) => value.trim() },
  { key: 'category_id', column: 'p.category_id' },
  { key: 'category_name', column: 'c.category_name', op: 'like', transform: (value) => value.trim() },
  { key: 'brand_id', column: 'p.brand_id' },
  { key: 'brand_name', column: 'b.brand_name', op: 'like', transform: (value) => value.trim() },
]

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

    /** 列出商品及类目/品牌，附带 SKU 数量（SQL 分页，仅 enrich 当前页） */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = this._productQuery(db, tenantId).select(
        'p.*',
        'c.category_name',
        'b.brand_name'
      )
      qb = applyFilters(qb, query, PRODUCT_LIST_FILTERS)
      if (hasFilterValue(query.keyword)) {
        const keyword = query.keyword.trim()
        qb = qb.andWhere(function matchKeyword() {
          this.where('p.product_name', 'like', `%${keyword}%`)
            .orWhere('c.category_name', 'like', `%${keyword}%`)
            .orWhere('b.brand_name', 'like', `%${keyword}%`)
        })
      }
      if (hasFilterValue(query.stock_risk)) {
        const stockAgg = db('product_skus as sku')
          .leftJoin('stocks as s', function joinStock() {
            this.on('s.sku_id', 'sku.sku_id').andOn('s.tenant_id', 'sku.tenant_id')
          })
          .where('sku.tenant_id', tenantId)
          .whereNull('sku.deleted_at')
          .groupBy('sku.product_id')
          .select(
            'sku.product_id',
            db.raw('COALESCE(SUM(s.available_qty), 0) as stock_total'),
            db.raw('SUM(CASE WHEN s.available_qty IS NOT NULL AND s.available_qty > 0 AND s.available_qty <= COALESCE(s.warning_qty, 0) THEN 1 ELSE 0 END) as risk_sku_count')
          )
          .as('sa')
        qb = qb.leftJoin(stockAgg, 'sa.product_id', 'p.product_id')
        const risk = query.stock_risk
        if (risk === 'none') qb = qb.andWhere('sa.stock_total', '<=', 0)
        if (risk === 'has_risk') qb = qb.andWhere('sa.stock_total', '>', 0).andWhere('sa.risk_sku_count', '>', 0)
        if (risk === 'normal') qb = qb.andWhere('sa.stock_total', '>', 0).andWhere('sa.risk_sku_count', '<=', 0)
      }

      if (hasFilterValue(query.approval_status)) {
        if (query.approval_status === 'pending') {
          qb = qb.andWhere(function matchPendingApproval() {
            this.where('p.status', 'pending_review').orWhereExists(function existsPending() {
              this.select(db.raw('1'))
                .from('approvals as appr')
                .whereRaw('appr.ref_id = p.product_id')
                .andWhere({
                  'appr.tenant_id': tenantId,
                  'appr.ref_type': 'product_on_sale',
                  'appr.status': 'pending',
                })
            })
          })
        } else if (query.approval_status === 'none') {
          qb = qb.andWhere('p.status', '!=', 'pending_review')
            .whereNotExists(function notPending() {
              this.select(db.raw('1'))
                .from('approvals as appr')
                .whereRaw('appr.ref_id = p.product_id')
                .andWhere({
                  'appr.tenant_id': tenantId,
                  'appr.ref_type': 'product_on_sale',
                  'appr.status': 'pending',
                })
            })
        }
      }

      const result = await paginateQuery(qb.orderBy('p.created_at', 'desc'), query, { countColumn: 'p.product_id' })
      const productIds = result.list.map((item) => item.product_id)

      const skuCounts = productIds.length
        ? await db('product_skus')
          .where({ tenant_id: tenantId })
          .whereIn('product_id', productIds)
          .whereNull('deleted_at')
          .groupBy('product_id')
          .select('product_id')
          .count('* as sku_count')
        : []

      const countMap = {}
      skuCounts.forEach((row) => {
        countMap[row.product_id] = Number(row.sku_count)
      })

      const stockMap = {}
      if (productIds.length) {
        const stockRows = await db('product_skus as sku')
          .leftJoin('stocks as s', function joinStock() {
            this.on('s.sku_id', 'sku.sku_id').andOn('s.tenant_id', 'sku.tenant_id')
          })
          .where('sku.tenant_id', tenantId)
          .whereIn('sku.product_id', productIds)
          .whereNull('sku.deleted_at')
          .groupBy('sku.product_id')
          .select('sku.product_id')
          .sum('s.available_qty as stock_total')
          .select(db.raw('SUM(CASE WHEN s.available_qty IS NOT NULL AND s.available_qty > 0 AND s.available_qty <= COALESCE(s.warning_qty, 0) THEN 1 ELSE 0 END) as risk_sku_count'))

        stockRows.forEach((row) => {
          stockMap[row.product_id] = {
            stock_total: parseInt(row.stock_total, 10) || 0,
            risk_sku_count: parseInt(row.risk_sku_count, 10) || 0,
          }
        })
      }

      const approvalMap = new Map()
      if (productIds.length) {
        const approvals = await db('approvals')
          .where({ tenant_id: tenantId, ref_type: 'product_on_sale', status: 'pending' })
          .whereIn('ref_id', productIds)
        approvals.forEach((row) => approvalMap.set(row.ref_id, row))
      }

      const list = result.list.map((item) => {
        const stock = stockMap[item.product_id] || { stock_total: 0, risk_sku_count: 0 }
        const hasApproval = approvalMap.has(item.product_id)
        let stockRisk = 'none'
        if (stock.stock_total > 0) stockRisk = stock.risk_sku_count > 0 ? 'has_risk' : 'normal'
        return {
          ...item,
          sku_count: countMap[item.product_id] || 0,
          stock_total: stock.stock_total,
          stock_risk: stockRisk,
          approval_status: hasApproval ? 'pending' : (item.status === 'pending_review' ? 'pending' : 'none'),
        }
      })

      return { list, total: result.total }
    }

    /** 获取商品详情及 SKU 列表 */
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

    /** 创建草稿商品，初始 status=draft */
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

    /** 更新商品资料，已上架商品不可编辑 */
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

    /** 软删除草稿商品（status=deleted） */
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

    /** 列出商品下所有 SKU */
    async listSkus(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { product_id: productId, keyword, limit = 200 } = query

      let qb = activeOnly(db('product_skus as sku'), 'sku.deleted_at')
        .leftJoin('products as p', function joinProduct() {
          this.on('p.product_id', 'sku.product_id').andOn('p.tenant_id', 'sku.tenant_id')
        })
        .where('sku.tenant_id', tenantId)
        .select('sku.*', 'p.product_name')

      if (productId) {
        const product = await activeOnly(db('products'))
          .where({ tenant_id: tenantId, product_id: productId })
          .first()
        if (!product) bizError('商品不存在', 40400)
        qb = qb.andWhere('sku.product_id', productId)
      }

      if (hasFilterValue(keyword)) {
        const like = `%${keyword.trim()}%`
        qb = qb.andWhere(function filterKeyword() {
          this.where('sku.sku_code', 'like', like)
            .orWhere('sku.sku_id', 'like', like)
            .orWhere('p.product_name', 'like', like)
        })
      }

      const cap = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500)
      const list = await qb.orderBy('sku.created_at', 'desc').limit(cap)
      return { list, total: list.length }
    }

    /** 为商品新增 SKU，sku_code 租户内唯一 */
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

    /** 更新 SKU 价格/规格/状态 */
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

    /** 软删除 SKU，已上架商品不可删 */
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

    /** 提交上架审核，draft/off_sale → pending_review */
    async submitReview(ctx, body = {}) {
      const { product_id: productId } = body
      if (!productId) bizError('product_id 不能为空')
      return this._transitionStatus(ctx, productId, 'pending_review', {
        allowedFrom: ['draft', 'off_sale'],
        auditCode: 'product:submit_review',
      })
    }

    /** 审批通过后上架，pending_review → on_sale，须已有 approved 审批记录 */
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

    /** 下架商品，on_sale → off_sale */
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
