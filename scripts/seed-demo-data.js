#!/usr/bin/env node
/**
 * 一键初始化演示数据：migrate + seed
 */
const { execSync } = require('child_process')
const path = require('path')

const root = path.resolve(__dirname, '..')

function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

run('node scripts/migrate.js')
run('node scripts/seed.js')
console.log('[seed-demo-data] done')
