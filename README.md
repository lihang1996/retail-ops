# retail-ops

**智能零售运营中台** — 基于 [elpis](https://github.com/lihang1996/elpis) 的零售业务全链路演示项目：商品 Schema CRUD → 入库 → 订单履约 → Three.js 3D 拣货 → 经营看板。

> 在线 Demo：部署后在此填写公网地址（见下方 Docker / VPS 说明）。

> 演示截图/GIF 见 [docs/screenshots/](docs/screenshots/README.md)（首屏推荐 `warehouse-3d.png`）。

## 演示账号

| 账号 | 密码 | 角色 |
|---|---|---|
| admin@retail.demo | demo123 | 管理员（全权限） |
| ops@retail.demo | demo123 | 运营 |
| warehouse@retail.demo | demo123 | 仓库主管 |
| finance@retail.demo | demo123 | 财务 |
| analyst@retail.demo | demo123 | 分析师 |

登录后默认进入 **经营总览看板**（`/view/dashboard/overview`）。

## 核心特性

| 模块 | 能力 |
|---|---|
| M1 身份与权限 | JWT 登录、多租户隔离、RBAC 菜单/操作权限、审计日志写入 |
| M2 商品中心 | 品牌/类目/商品/SKU Schema CRUD、上架审批流 |
| M3 仓储库存 | 仓库/库位、入库、`stockService` 统一写入口、锁定/扣减 |
| M4 订单履约 | Excel 导入、模拟支付、智能分仓、发货单、拣货、出库 |
| M5 3D 仓库 | Three.js 库位风险热力、拣货路径可视化 |
| M6 扩展模块 | 经营总览、上架审批、审计查询 API、客户/财务/营销薄模块 |
| M7 AI 工作台 | 只读关键词查询（库存风险、订单趋势演示） |
| M8 工程化 | Docker Compose、init/seed/reset 脚本、CI 模板、E2E 冒烟脚本 |

## 架构概览

```text
┌─────────────┐     ┌──────────────────────────────────────┐
│  Vue3 前端   │────▶│  Koa (elpis loader)                  │
│  Element+   │     │  middleware: auth / tenant / perm    │
│  Three.js   │     │  controller → service → knex/MySQL   │
└─────────────┘     └──────────────┬───────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │ MySQL 8  │  Redis (可选)   │
                    └─────────────────────────────┘
```

- **elpis**：提供 Koa 启动、Schema CRUD、Dashboard 路由与 webpack 构建。
- **retail-ops**：登录/RBAC/租户、零售业务状态机、库存写入口、3D 场景、看板与 AI 演示。
- **库存红线**：所有库存变更必须经过 `app/service/stock.js`（`stockService`），Controller 不得直写库存表。

详细设计见上级目录 `dom/elpis-retail-ops-architecture.md`。

## 本地开发

**前置**：同级目录需有 `../elpis`（monorepo 布局 `dom/elpis` + `dom/retail-ops`）。

```bash
# 1. 安装 elpis 框架依赖
cd ../elpis && npm install

# 2. 安装业务项目依赖
cd ../retail-ops && npm install

# 3. MySQL：本地 3306 或 docker compose 仅启 mysql（默认映射 3307，见 config.local.js）
npm run migrate && npm run seed

# 4. 构建并启动
npm run build:prod
npm run dev
```

访问：http://localhost:8080/view/login

### 演示数据脚本

```bash
npm run seed:demo    # migrate + 全量 seed（幂等）
npm run reset:demo   # 清理租户业务数据后重跑 seed，保留账号权限
node scripts/e2e-smoke.js   # API 层黄金链路冒烟（需服务已启动）
```

## 黄金链路 E2E 验收（M8-06）

在浏览器中按序操作：

1. 登录 `admin@retail.demo` → 经营总览有 GMV/订单/库存指标
2. 商品管理 → 创建商品与 SKU → 提交上架审批 → 审批通过 → 上架
3. 仓储管理 → 商品入库（如 `SKU-DEMO-001`）
4. 履约中心 → Excel 导入订单 → 模拟支付 → 分仓 → 生成发货单 → 拣货 → 出库
5. 3D 仓库 → 查看库位风险与拣货路径
6. AI 工作台 → 查询「库存不足的 SKU」
7. 审计日志 API `GET /api/proj/audit/list` 可查到登录、入库、出库等关键动作

验收要点：刷新页面不丢登录态；库存数量符合锁定/扣减规则；看板指标随履约变化。

## 构建

```bash
npm run build:local   # NODE_ENV=local
npm run build:prod    # NODE_ENV=prod
npm run start:prod    # NODE_ENV=production（需配置 DB）
```

## Docker 部署

使用 monorepo 构建上下文（`dom/` 下同时有 `elpis/` 与 `retail-ops/`）：

```bash
cp .env.example .env   # 按需修改 JWT_SECRET 等
docker compose up -d --build
```

- 登录页：http://localhost:8080/view/login
- 健康检查：http://localhost:8080/health

容器首次启动自动执行 `migrate` + `seed`（`scripts/init-db.js`）。

### VPS + HTTPS（Caddy）

1. VPS 上 `docker compose up -d --build`
2. 参考 `deploy/Caddyfile.example` 配置 Caddy 反代与自动 HTTPS
3. DNS 解析到 VPS，将公网地址填入本文「在线 Demo」

### 手动构建镜像

```bash
# 在 dom/ 父目录
cp deploy/parent.dockerignore ../.dockerignore   # 可选，加速构建
docker build -f retail-ops/Dockerfile -t retail-ops .
```

## CI

GitHub PAT 若无 `workflow` scope，仓库内 CI 以模板形式提供：

```bash
mkdir -p .github/workflows
cp deploy/ci.yml.example .github/workflows/ci.yml
git add .github/workflows/ci.yml && git commit -m "chore: enable CI"
```

CI 需在 checkout 时同时拉取同级 `elpis`（monorepo）或改为已发布的 npm 包版本。

## 演示素材（M8-05）

截图与 GIF 放在 `docs/screenshots/`，录制清单见 `docs/screenshots/README.md`。

首屏推荐：**3D 仓库拣货路径**（`warehouse-3d.png` 或 `.gif`）。

## 诚实边界

| 项 | 说明 |
|---|---|
| elpis 依赖 | 本地开发使用 `file:../elpis`；生产 Docker 用 monorepo 构建，尚未切到独立 npm 版本 |
| 智能分仓 | 演示级规则，非真实 WMS 算法 |
| AI 工作台 | 关键词匹配 + 只读 SQL 演示，非大模型接入 |
| 财务/营销/客户 | 薄模块（列表 + 汇总 API），无完整业财闭环 |
| 数据范围权限 | 菜单+操作两层 RBAC，未做行级 data_scope |
| Redis | 本地可降级；生产建议启用会话与库存锁缓存 |

## 文档

| 文件 | 说明 |
|---|---|
| `../elpis-retail-ops-prd.md` | 产品需求 |
| `../elpis-retail-ops-architecture.md` | 架构设计 |
| `../elpis-retail-ops-task-breakdown.md` | 任务拆解（M0→M8） |
| `docs/screenshots/README.md` | 演示截图录制清单 |

## License

ISC
