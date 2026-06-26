/**
 * @module controller/warehouse
 * @description 仓库控制器：仓库与库位的 CRUD、3D 布局、风险地图接口。
 *
 * 核心职责：
 * 1. 仓库管理（CRUD）
 * 2. 库位管理（CRUD + 3D 坐标）
 * 3. 3D 可视化数据（布局、风险地图）
 *
 * 关键特性：
 * - 库位包含 3D 坐标（pos_x, pos_y, pos_z）
 * - 库位容量与风险等级（empty/low/normal/full）
 * - 支持库区（zone）和货架（shelf）层级结构
 *
 * 委托给 service.warehouse 处理业务逻辑
 */
const { wrap } = require('../common/dict-controller')

module.exports = (app) => {
  const BaseController = require('@lh199.123/elpis').Controller.Bass(app)

  return class WarehouseController extends BaseController {
    /**
     * 仓库列表查询
     * GET /api/proj/warehouse/list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.status - 状态筛选（active/disabled）
     * @param {string} ctx.request.query.warehouse_name - 名称模糊搜索
     * @returns {Object} { success, data: list, meta: { total } }
     */
    list = wrap(async function list(ctx) {
      const result = await app.service.warehouse.list(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 仓库详情查询
     * GET /api/proj/warehouse
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.warehouse_id - 仓库 ID
     * @returns {Object} { success, data: warehouse }
     */
    get = wrap(async function get(ctx) {
      const data = await app.service.warehouse.get(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    /**
     * 创建仓库
     * POST /api/proj/warehouse
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.warehouse_name - 仓库名称（必填）
     * @param {string} ctx.request.body.warehouse_code - 仓库编码（必填，租户内唯一）
     * @param {string} ctx.request.body.address - 地址
     * @returns {Object} { success, data: { warehouseId } }
     */
    create = wrap(async function create(ctx) {
      const data = await app.service.warehouse.create(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 更新仓库信息
     * PUT /api/proj/warehouse
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.warehouse_id - 仓库 ID（必填）
     * @param {string} ctx.request.body.warehouse_name - 新名称
     * @param {string} ctx.request.body.address - 新地址
     * @param {string} ctx.request.body.status - 新状态（active/disabled）
     * @returns {Object} { success, data: { warehouseId } }
     */
    update = wrap(async function update(ctx) {
      const data = await app.service.warehouse.update(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 库位列表查询
     * GET /api/proj/warehouse/location/list
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.warehouse_id - 仓库筛选
     * @param {string} ctx.request.query.location_code - 库位编码模糊搜索
     * @returns {Object} { success, data: list, meta: { total } }
     *
     * 返回字段包含 3D 坐标：
     * - pos_x, pos_y, pos_z: 3D 坐标
     * - capacity: 容量
     */
    locationList = wrap(async function locationList(ctx) {
      const result = await app.service.warehouse.listLocations(ctx, ctx.request.query)
      this.success(ctx, result.list, { total: result.total })
    })

    /**
     * 库位详情查询（含 SKU 分布、风险等级、近期流水）
     * GET /api/proj/warehouse/location
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.location_id - 库位 ID
     * @returns {Object} { success, data: { location, skus, risk, recentLogs } }
     *
     * 返回详情：
     * - location: 库位基本信息
     * - skus: 库位内的 SKU 分布
     * - risk: { level, totalQty, capacity } 风险等级
     * - recentLogs: 近期 10 条流水记录
     */
    locationGet = wrap(async function locationGet(ctx) {
      const data = await app.service.warehouse.getLocation(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    /**
     * 创建库位（含 3D 坐标）
     * POST /api/proj/warehouse/location
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.warehouse_id - 仓库 ID（必填）
     * @param {string} ctx.request.body.location_code - 库位编码（必填，仓库内唯一）
     * @param {string} ctx.request.body.zone_id - 库区 ID
     * @param {string} ctx.request.body.shelf_id - 货架 ID
     * @param {number} ctx.request.body.capacity - 容量（默认 100）
     * @param {number} ctx.request.body.pos_x - X 坐标（默认 0）
     * @param {number} ctx.request.body.pos_y - Y 坐标（默认 0）
     * @param {number} ctx.request.body.pos_z - Z 坐标（默认 0）
     * @returns {Object} { success, data: { locationId } }
     */
    locationCreate = wrap(async function locationCreate(ctx) {
      const data = await app.service.warehouse.createLocation(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 更新库位信息（容量、坐标、状态）
     * PUT /api/proj/warehouse/location
     * @param {Object} ctx.request.body
     * @param {string} ctx.request.body.location_id - 库位 ID（必填）
     * @param {number} ctx.request.body.capacity - 新容量
     * @param {number} ctx.request.body.pos_x - 新 X 坐标
     * @param {number} ctx.request.body.pos_y - 新 Y 坐标
     * @param {number} ctx.request.body.pos_z - 新 Z 坐标
     * @param {string} ctx.request.body.status - 新状态（active/disabled）
     * @returns {Object} { success, data: { locationId } }
     */
    locationUpdate = wrap(async function locationUpdate(ctx) {
      const data = await app.service.warehouse.updateLocation(ctx, ctx.request.body)
      this.success(ctx, data)
    })

    /**
     * 获取仓库 3D 布局数据（供 Three.js 渲染）
     * GET /api/proj/warehouse/layout
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.warehouse_id - 仓库 ID
     * @returns {Object} { success, data: { warehouse, zones, shelves, locations } }
     *
     * 返回数据结构：
     * - warehouse: 仓库基本信息
     * - zones: 库区列表
     * - shelves: 货架列表（含 zone_id）
     * - locations: 库位列表（含 3D 坐标）
     *
     * 用于 Three.js 场景构建
     */
    layout = wrap(async function layout(ctx) {
      const data = await app.service.warehouse.getLayout(ctx, ctx.request.query)
      this.success(ctx, data)
    })

    /**
     * 获取仓库库位风险地图（供热力图渲染）
     * GET /api/proj/warehouse/risk_map
     * @param {Object} ctx.request.query
     * @param {string} ctx.request.query.warehouse_id - 仓库 ID
     * @returns {Object} { success, data: { warehouseId, riskMap } }
     *
     * riskMap 格式：
     * {
     *   [locationId]: {
     *     level: 'empty' | 'low' | 'normal' | 'full',
     *     qty: 当前库存数量,
     *     capacity: 容量
     *   }
     * }
     *
     * 风险等级判断：
     * - empty: qty === 0
     * - low: 0 < qty/capacity <= 0.15
     * - normal: 0.15 < qty/capacity < 0.9
     * - full: qty/capacity >= 0.9
     *
     * 用于 3D 库位热力图着色
     */
    riskMap = wrap(async function riskMap(ctx) {
      const data = await app.service.warehouse.getRiskMap(ctx, ctx.request.query)
      this.success(ctx, data)
    })
  }
}
