#!/usr/bin/env node
/**
 * 校验 route-manifest 与 permission-map 一致性
 */
const path = require('path')
const fs = require('fs')
const {
  ROUTES,
  routeKey,
  assertPermissionMapCoverage,
} = require(path.join(process.cwd(), 'app/common/route-manifest'))
const permissionMap = require(path.join(process.cwd(), 'app/common/permission-map'))

const ROUTER_WITHOUT_PERMISSION = new Set([
  'GET /health',
  'GET /health/detail',
])

const PERMISSION_WITHOUT_ROUTER = new Set([
  // 框架项目入口接口，不在 app/router 目录声明。
  'GET /api/project/list',
  'GET /api/project',
])

function permissionEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function listJsFiles(dir) {
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(dir, name))
}

function parseRouterRoutes() {
  const routes = []
  const routerDir = path.join(process.cwd(), 'app/router')
  const routePattern = /router\.(get|post|put|delete)\(\s*['"]([^'"]+)['"]/g
  listJsFiles(routerDir).forEach((file) => {
    const text = fs.readFileSync(file, 'utf8')
    let match
    while ((match = routePattern.exec(text))) {
      routes.push(`${match[1].toUpperCase()} ${match[2]}`)
    }
  })
  return routes
}

function parseSchemaRoutes() {
  const routes = []
  const schemaDir = path.join(process.cwd(), 'app/router-schema')
  listJsFiles(schemaDir).forEach((file) => {
    const schema = require(file)
    Object.entries(schema).forEach(([apiPath, methodMap]) => {
      Object.keys(methodMap || {}).forEach((method) => {
        routes.push(`${method.toUpperCase()} ${apiPath}`)
      })
    })
  })
  return routes
}

function diffRoutes(left, right, allow = new Set()) {
  const rightSet = new Set(right)
  return left.filter((item) => !rightSet.has(item) && !allow.has(item))
}

function reportMissing(kind, keys) {
  if (!keys.length) return
  failed = true
  keys.forEach((key) => console.error(`[check:routes] ${kind}: ${key}`))
}

let failed = false

const coverage = assertPermissionMapCoverage(permissionMap, ROUTES)
if (!coverage.ok) {
  failed = true
  coverage.missing.forEach((route) => {
    console.error(`[check:routes] permission-map missing manifest route: ${routeKey(route)}`)
  })
}

ROUTES.forEach((route) => {
  const key = routeKey(route)
  if (!(key in permissionMap)) {
    failed = true
    console.error(`[check:routes] manifest route not in permission-map: ${key}`)
    return
  }
  if (!permissionEqual(permissionMap[key], route.permission)) {
    failed = true
    console.error(
      `[check:routes] permission mismatch for ${key}: manifest=${JSON.stringify(route.permission)} map=${JSON.stringify(permissionMap[key])}`,
    )
  }
})

const manifestKeys = new Set(ROUTES.map(routeKey))
Object.keys(permissionMap).forEach((key) => {
  if (!manifestKeys.has(key)) {
    failed = true
    console.error(`[check:routes] permission-map entry not in manifest: ${key}`)
  }
})

const routerRoutes = parseRouterRoutes()
const schemaRoutes = parseSchemaRoutes()
const manifestRoutes = ROUTES.map(routeKey)
const permissionRoutes = Object.keys(permissionMap)

reportMissing(
  'router route missing permission-map entry',
  diffRoutes(routerRoutes, permissionRoutes, ROUTER_WITHOUT_PERMISSION),
)
reportMissing(
  'permission-map entry missing router route',
  diffRoutes(permissionRoutes, routerRoutes, PERMISSION_WITHOUT_ROUTER),
)
reportMissing(
  'router route missing manifest entry',
  diffRoutes(routerRoutes, manifestRoutes, ROUTER_WITHOUT_PERMISSION),
)
reportMissing(
  'manifest entry missing router route',
  diffRoutes(manifestRoutes, routerRoutes, PERMISSION_WITHOUT_ROUTER),
)
reportMissing(
  'router route missing router-schema entry',
  diffRoutes(routerRoutes, schemaRoutes),
)
reportMissing(
  'router-schema entry missing router route',
  diffRoutes(schemaRoutes, routerRoutes),
)

if (failed) process.exit(1)
console.log(`[check:routes] ${ROUTES.length} routes aligned with permission-map; ${routerRoutes.length} router routes and ${schemaRoutes.length} schemas checked`)
