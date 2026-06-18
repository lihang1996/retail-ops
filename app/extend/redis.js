const Redis = require('ioredis')

module.exports = (app) => {
  const redisConfig = app.config?.redis
  if (!redisConfig) {
    app.logger?.warn('[redis] config.redis 未配置，使用内存降级')
    return createMemoryFallback(app)
  }

  const client = new Redis({
    ...redisConfig,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })

  client.on('error', (err) => {
    app.logger?.warn(`[redis] 连接异常: ${err.message}`)
  })

  client.connect().catch((err) => {
    app.logger?.warn(`[redis] 连接失败，使用内存降级: ${err.message}`)
  })

  return client
}

// 本地无 Redis 时的简易降级，仅用于开发
function createMemoryFallback(app) {
  const store = new Map()
  app.logger?.warn('[redis] 使用内存 Map 降级（非生产可用）')
  return {
    async get(key) { return store.get(key) ?? null },
    async set(key, val, ...args) {
      store.set(key, val)
      return 'OK'
    },
    async del(key) { return store.delete(key) ? 1 : 0 },
    status: 'memory-fallback',
  }
}
