const assert = require('assert')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.join(__dirname, '../..')
const result = spawnSync(process.execPath, [path.join(root, 'scripts/check-route-manifest.js')], {
  cwd: root,
  encoding: 'utf8',
})

assert.strictEqual(result.status, 0, result.stderr || result.stdout)
assert.match(result.stdout, /router routes and \d+ schemas checked/)

console.log('[unit] route-manifest 1 passed')
