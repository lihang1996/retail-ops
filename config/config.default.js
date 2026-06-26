/**
 * @module config/default
 * @description 应用默认配置：数据库、Redis、JWT、日志等基础设施配置。
 *
 * 核心配置项：
 * 1. 应用基本信息（名称、端口）
 * 2. 数据库连接（MySQL）
 * 3. Redis 连接
 * 4. JWT 认证配置
 * 5. 日志配置
 *
 * 配置优先级：
 * - 环境变量（最高）
 * - config.local.js / config.prod.js（覆盖默认值）
 * - config.default.js（默认值）
 *
 * 使用方式：
 * - 开发环境：复制本文件到 config.local.js 并修改
 * - 生产环境：创建 config.prod.js 并配置生产环境参数
 */
module.exports = {
  /** 应用名称 */
  name: 'retail-ops',

  /** 应用端口（默认 8090，避免与其他服务冲突） */
  port: 8090,

  /**
   * 日志配置
   * - dir: 日志目录
   * - level: 日志级别（debug/info/warn/error）
   */
  logger: {
    dir: 'logs',
    level: 'info',
  },

  /**
   * 数据库配置（MySQL）
   * 使用 Knex.js 连接池
   */
  db: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',               // 生产环境请修改
      database: 'retail_ops',
    },
    pool: { min: 0, max: 10 },    // 连接池配置
  },

  /**
   * Redis 配置
   * 用于 Session、缓存等
   */
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },

  /**
   * JWT 配置
   * - secret: 签名密钥（生产环境必须修改）
   * - expiresIn: 令牌有效期
   */
  jwt: {
    secret: 'retail-ops-dev-secret-change-in-prod',  // ⚠️ 生产环境必须修改
    expiresIn: '7d',                                 // 7天有效期
  },
}
