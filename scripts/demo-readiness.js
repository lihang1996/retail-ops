#!/usr/bin/env node
/**
 * Demo readiness workflow.
 *
 * Default mode runs local, non-mutating checks. Pass --with-server after the
 * app is already running to execute API/browser-adjacent smoke tests that may
 * create demo records.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const args = new Set(process.argv.slice(2))
const withServer = args.has('--with-server')

const requiredScreenshots = [
  'login.png',
  'project-list-admin.png',
  'product-schema.png',
  'stock-inbound.png',
  'fulfillment.png',
  'warehouse-3d.png',
  'dashboard-overview.png',
]

function printSection(title) {
  console.log(`\n== ${title} ==`)
}

function runNpmScript(name) {
  console.log(`\n> npm run ${name}`)
  execFileSync(npmCmd, ['run', name], {
    cwd: root,
    stdio: 'inherit',
  })
}

function checkScreenshots() {
  const dir = path.join(root, 'docs/screenshots')
  const missing = requiredScreenshots.filter((file) => {
    const png = path.join(dir, file)
    const gif = png.replace(/\.png$/i, '.gif')
    return !fs.existsSync(png) && !fs.existsSync(gif)
  })

  if (!missing.length) {
    console.log('[screenshots] required demo assets found')
    return
  }

  console.log('[screenshots] assets still missing, record before publishing README:')
  missing.forEach((file) => console.log(`  - docs/screenshots/${file}`))
}

function main() {
  printSection('Static Checks')
  ;['lint', 'test:unit', 'check:routes', 'check:dist'].forEach(runNpmScript)

  printSection('Demo Assets')
  checkScreenshots()

  if (withServer) {
    printSection('Running App Checks')
    runNpmScript('test:pagination')
    runNpmScript('e2e:golden')
  } else {
    printSection('Running App Checks')
    console.log('Skipped. Start the app, then run: npm run demo:verify')
  }

  console.log('\n[demo-readiness] done')
}

main()
