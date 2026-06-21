# retail-ops

智能零售运营中台 — 基于 elpis 的零售业务项目。

## 本地开发

```bash
# 1. 先安装 elpis 框架依赖
cd ../elpis && npm install

# 2. 再安装业务项目依赖
cd ../retail-ops && npm install

# 3. 数据库初始化
npm run migrate && npm run seed

# 4. 构建并启动
npm run build:prod
npm run dev
```

访问：http://localhost:8080/view/login

演示账号：

| 账号 | 密码 | 角色 |
|---|---|---|
| admin@retail.demo | demo123 | 管理员 |
| ops@retail.demo | demo123 | 运营 |
| warehouse@retail.demo | demo123 | 仓库 |

## 黄金链路 E2E 验收

1. 登录 `admin@retail.demo` → 经营总览有指标
2. 商品管理 → 提交上架审批 → 审批通过 → 商品在售
3. 仓储管理 → 商品入库（SKU-DEMO-001）
4. 履约中心 → Excel 导入订单 → 模拟支付 → 分仓 → 生成发货单 → 拣货 → 出库
5. 3D 仓库 → 查看库位风险与拣货路径
6. AI 工作台 → 查询「库存不足的 SKU」

```bash
node scripts/seed-demo-data.js    # 初始化 migrate + seed
node scripts/reset-demo-data.js   # 重置演示业务数据
```

## 构建

```bash
npm run build:local   # 本地构建（NODE_ENV=local）
npm run build:prod    # 生产构建（NODE_ENV=prod）
npm run start:prod    # 生产运行（NODE_ENV=production，需配置 DB）
```

## Docker 部署（M1-14）

使用 monorepo 构建上下文（`dom/` 目录下同时有 `elpis/` 与 `retail-ops/`）：

```bash
# 可选：加速构建，将 dockerignore 模板复制到父目录
cp deploy/parent.dockerignore ../.dockerignore

# 在 retail-ops 目录
cp .env.example .env   # 按需修改 JWT_SECRET 等
docker compose up -d --build
```

启动后访问：

- 登录页：http://localhost:8080/view/login
- 健康检查：http://localhost:8080/health

容器首次启动会自动执行 `migrate` + `seed`（见 `scripts/init-db.js`）。

### VPS + HTTPS（Caddy）

1. 在 VPS 上 `docker compose up -d --build` 跑通应用（端口 8080）
2. 安装 Caddy，参考 `deploy/Caddyfile.example` 配置反代与自动 HTTPS
3. 将域名 DNS 解析到 VPS

### 手动构建镜像

```bash
# 在 dom/ 父目录
docker build -f retail-ops/Dockerfile -t retail-ops .
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_USER=retail -e DB_PASSWORD=retail123 -e DB_NAME=retail_ops \
  -e JWT_SECRET=your-secret \
  retail-ops
```

## 依赖说明

- **本地开发**：`"@lh199.123/elpis": "file:../elpis"`
- **Docker / CI**：使用 monorepo 构建上下文（见 `Dockerfile`），或改为已发布的 npm 版本

## 文档

设计文档位于上级目录 `dom/`：

- `elpis-retail-ops-prd.md`
- `elpis-retail-ops-architecture.md`
- `elpis-retail-ops-task-breakdown.md`
