/**
 * @module serve
 * @description 应用启动入口：加载配置并启动 Koa 服务器。
 *
 * 核心职责：
 * 1. 从配置文件加载端口号（支持环境变量覆盖）
 * 2. 启动 elpis 框架服务器
 * 3. 配置应用名称和首页路由
 *
 * 端口优先级：
 * - 环境变量 PORT（最高优先级）
 * - 环境配置文件（config.local.js / config.prod.js）
 * - 默认配置文件（config.default.js）
 * - 框架默认值（8090）
 *
 * 使用方式：
 * - 开发环境：NODE_ENV=local node serve.js
 * - 生产环境：NODE_ENV=production node serve.js
 */

/**
 * 启动前从业务 config 注入 PORT
 * elpis 默认 8080，本项目默认 8090（避免与本机其他服务冲突）
 * @returns {string} 端口号
 */
function loadAppPort() {
  // 环境变量优先级最高
  if (process.env.PORT) return process.env.PORT

  // 加载默认配置
  const base = require('./config/config.default')
  let envConfig = {}

  // 根据 NODE_ENV 加载对应环境配置
  const env = process.env.NODE_ENV
  if (env === 'local') {
    envConfig = require('./config/config.local')
  } else if (env === 'production' || env === 'prod') {
    try {
      envConfig = require('./config/config.prod')
    } catch {
      /* 生产配置不存在时忽略，使用默认配置 */
    }
  }

  // 环境配置 > 默认配置 > 框架默认值
  return String(envConfig.port ?? base.port ?? 8090)
}

// 注入端口到环境变量
process.env.PORT = loadAppPort()

function assertProductionSecrets() {
  const env = process.env.NODE_ENV
  if (env !== 'production' && env !== 'prod') return
  const base = require('./config/config.default')
  let envConfig = {}
  try {
    envConfig = require('./config/config.prod')
  } catch {
    /* ignore */
  }
  const secret = process.env.JWT_SECRET || envConfig.jwt?.secret || base.jwt?.secret
  const unsafeSecrets = new Set([
    base.jwt?.secret,
    'retail-ops-change-in-prod',
    'retail-ops-dev-secret-change-in-prod',
  ])
  if (!secret || unsafeSecrets.has(secret)) {
    console.error('[retail-ops] 生产环境必须配置独立的 JWT_SECRET')
    process.exit(1)
  }
}

assertProductionSecrets()

// 启动 elpis 框架服务器
const { serverStart } = require('@lh199.123/elpis')

serverStart({
  name: 'Retail Ops',        // 应用名称
  homePage: '/view/login',   // 首页路由（默认跳转）
})
