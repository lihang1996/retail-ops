module.exports = (app) => {
  return class HealthController {
    async ping(ctx) {
      ctx.body = { ok: true, name: app.config?.name || 'retail-ops' }
    }

    async detail(ctx) {
      const result = { ok: true, checks: {} }

      if (app.db) {
        try {
          await app.db.raw('select 1')
          result.checks.db = { ok: true }
        } catch (e) {
          result.checks.db = { ok: false, error: e.message }
          result.ok = false
        }
      } else {
        result.checks.db = { ok: false, error: 'not configured' }
      }

      if (app.redis) {
        try {
          await app.redis.set('health:ping', '1')
          const val = await app.redis.get('health:ping')
          result.checks.redis = { ok: val === '1', status: app.redis.status || 'connected' }
        } catch (e) {
          result.checks.redis = { ok: false, error: e.message }
        }
      } else {
        result.checks.redis = { ok: false, error: 'not configured' }
      }

      ctx.body = result
    }
  }
}
