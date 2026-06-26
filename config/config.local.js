module.exports = {
  name: 'retail-ops-local',
  port: 8090,
  db: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'retail_ops',
    },
  },
  redis: null, // 本地可不启 Redis，自动降级
}
