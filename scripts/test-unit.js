#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = process.cwd()
const testDir = path.join(ROOT, 'tests/unit')
const files = fs.readdirSync(testDir).filter((name) => name.endsWith('.test.js')).sort()

if (!files.length) {
  console.error('[test:unit] no test files found')
  process.exit(1)
}

let failed = 0
files.forEach((file) => {
  const abs = path.join(testDir, file)
  const result = spawnSync(process.execPath, [abs], { stdio: 'inherit' })
  if (result.status !== 0) failed += 1
})

if (failed) {
  console.error(`[test:unit] ${failed} file(s) failed`)
  process.exit(1)
}

console.log(`[test:unit] ${files.length} file(s) passed`)
