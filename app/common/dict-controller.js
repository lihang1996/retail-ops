/**
 * @module common/dict-controller
 * @description 字典表控制器工厂：为简单字典表生成标准 CRUD 控制器。
 *
 * 核心职责：
 * 1. 统一错误处理（通过 wrap 函数）
 * 2. 标准化接口响应格式
 * 3. 减少重复的控制器代码
 *
 * 使用场景：
 * - 品牌控制器（BrandController）
 * - 类目控制器（CategoryController）
 * - 店铺控制器（StoreController）
 *
 * 与 dict-service 配合使用，形成完整的字典表 CRUD 方案。
 */
const { handleServiceError } = require('./controller-error')

/**
 * 包装服务方法，统一捕获和处理错误
 * @param {Function} serviceFn - 服务层方法
 * @returns {Function} 包装后的异步函数
 *
 * 错误处理流程：
 * 1. 捕获 service 层抛出的所有异常
 * 2. 委托给 handleServiceError 统一处理
 * 3. 返回标准化的错误响应
 */
function wrap(serviceFn) {
  return async function wrapped(ctx) {
    try {
      return await serviceFn.call(this, ctx)
    } catch (error) {
      // 统一错误处理：业务异常、数据库错误、系统错误
      handleServiceError(ctx, this, error)
    }
  }
}

/**
 * 创建字典表控制器类
 * @param {Object} app - Koa 应用实例
 * @param {string} serviceName - 服务名称（如 'brand', 'category'）
 * @returns {Class} 生成的字典控制器类
 *
 * 生成的控制器包含标准 CRUD 接口：
 * - list: GET /api/proj/{serviceName}/list
 * - get: GET /api/proj/{serviceName}
 * - create: POST /api/proj/{serviceName}
 * - update: PUT /api/proj/{serviceName}
 *
 * @example
 * // 创建品牌控制器
 * const BrandController = createDictController(app, 'brand')
 *
 * // 相当于手写：
 * class BrandController extends BaseController {
 *   list = wrap(async function(ctx) {
 *     const result = await app.service.brand.list(ctx, ctx.request.query)
 *     this.success(ctx, result.list, { total: result.total })
 *   })
 *   // ... 其他方法
 * }
 */
function createDictController(app, serviceName) {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class DictController extends BaseController {
    /**
     * 列表查询接口
     * GET /api/proj/{serviceName}/list
     * @param {Object} ctx.request.query - 查询参数
     * @returns {Object} { success, data: list, meta: { total } }
     */
    list = wrap(async function list(ctx) {
      const result = await app.service[serviceName].list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 详情查询接口
     * GET /api/proj/{serviceName}
     * @param {Object} ctx.request.query - 查询参数（包含 ID）
     * @returns {Object} { success, data: record }
     */
    get = wrap(async function get(ctx) {
      const data = await app.service[serviceName].get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    /**
     * 创建接口
     * POST /api/proj/{serviceName}
     * @param {Object} ctx.request.body - 创建参数
     * @returns {Object} { success, data: { id } }
     */
    create = wrap(async function create(ctx) {
      const data = await app.service[serviceName].create(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 更新接口
     * PUT /api/proj/{serviceName}
     * @param {Object} ctx.request.body - 更新参数（包含 ID）
     * @returns {Object} { success, data: { id } }
     */
    update = wrap(async function update(ctx) {
      const data = await app.service[serviceName].update(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    // 注意：字典表一般不提供删除接口，使用 status 软删除
  }
}

module.exports = { createDictController, wrap }
