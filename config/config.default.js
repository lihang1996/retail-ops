module.exports = {
  name: 'retail-ops',
  port: 8080,
  logger: {
    dir: 'logs',
    level: 'info',
  },
  db: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'retail_ops',
    },
    pool: { min: 0, max: 10 },
  },
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
  jwt: {
    secret: 'retail-ops-dev-secret-change-in-prod',
    expiresIn: '7d',
  },
}
