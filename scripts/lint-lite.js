#!/usr/bin/env node
/**
 * Lightweight static checks without extra npm dependencies.
 *
 * It is intentionally conservative: catch merge markers, trailing whitespace,
 * invalid JSON, and syntax errors in server-side CommonJS files.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = process.cwd()
const TEXT_EXT = new Set(['.js', '.vue', '.json', '.md', '.yml', '.yaml', '.less', '.css'])
const WALK_ROOTS = ['app', 'config', 'database', 'deploy', 'model', 'scripts']
const EXTRA_FILES = ['serve.js', 'package.json']
const IGNORE_PARTS = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}app${path.sep}public${path.sep}dist${path.sep}`,
  `${path.sep}.git${path.sep}`,
]

let failed = false

function report(file, message) {
  failed = true
  console.error(`[lint-lite] ${file}: ${message}`)
}

function shouldIgnore(absPath) {
  return IGNORE_PARTS.some((part) => absPath.includes(part))
}

function walk(absPath, files = []) {
  if (!fs.existsSync(absPath) || shouldIgnore(absPath)) return files
  const stat = fs.statSync(absPath)
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(absPath)) {
      walk(path.join(absPath, name), files)
    }
    return files
  }
  if (TEXT_EXT.has(path.extname(absPath))) files.push(absPath)
  return files
}

function rel(absPath) {
  return path.relative(ROOT, absPath)
}

function checkRouteManifest() {
  try {
    require('child_process').execSync('node scripts/check-route-manifest.js', {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
    })
  } catch (error) {
    const output = (error.stdout || error.stderr || error.message || '').trim()
    report('scripts/check-route-manifest.js', output || 'route manifest check failed')
  }
}

function checkTextFile(absPath) {
  const file = rel(absPath)
  const text = fs.readFileSync(absPath, 'utf8')
  const lines = text.split(/\r?\n/)

  lines.forEach((line, idx) => {
    if (/^(<<<<<<<|=======|>>>>>>>)/.test(line)) {
      report(file, `merge conflict marker at line ${idx + 1}`)
    }
    if (/[ \t]+$/.test(line)) {
      report(file, `trailing whitespace at line ${idx + 1}`)
    }
  })

  if (path.extname(absPath) === '.json') {
    try {
      JSON.parse(text)
    } catch (error) {
      report(file, `invalid JSON: ${error.message}`)
    }
  }
}

function shouldNodeCheck(absPath) {
  const file = rel(absPath)
  if (path.extname(absPath) !== '.js') return false
  if (file.startsWith(`app${path.sep}pages${path.sep}`)) return false
  return true
}

function checkNodeSyntax(absPath) {
  const result = spawnSync(process.execPath, ['--check', absPath], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    report(rel(absPath), (result.stderr || result.stdout || 'syntax check failed').trim())
  }
}

const files = [
  ...WALK_ROOTS.flatMap((dir) => walk(path.join(ROOT, dir))),
  ...EXTRA_FILES.map((file) => path.join(ROOT, file)).filter((file) => fs.existsSync(file)),
]

for (const file of files) {
  checkTextFile(file)
  if (shouldNodeCheck(file)) checkNodeSyntax(file)
}

checkRouteManifest()

if (failed) process.exit(1)
console.log(`[lint-lite] checked ${files.length} files`)
