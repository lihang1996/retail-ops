module.exports = {
  name: 'retail-ops-prod',
  port: parseInt(process.env.PORT || '8080', 10),
  db: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'retail',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'retail_ops',
    },
    pool: { min: 0, max: 10 },
  },
  redis: process.env.REDIS_HOST
    ? {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      }
    : null,
  jwt: {
    secret: process.env.JWT_SECRET || 'retail-ops-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
}
