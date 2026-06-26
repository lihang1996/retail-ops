const crypto = require('crypto')

function randomSuffix(bytes = 2) {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase()
}

function generateOrderNo() {
  const d = new Date()
  const pad = (n, len = 2) => String(n).padStart(len, '0')
  return `ORD${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${randomSuffix(2)}`
}

function generateShipmentNo() {
  return `SHP${Date.now()}${randomSuffix(2)}`
}

module.exports = {
  generateOrderNo,
  generateShipmentNo,
}
