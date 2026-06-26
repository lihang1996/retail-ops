# retail-ops 文档索引

> **智能零售运营中台** — 基于 [elpis](https://github.com/lihang1996/elpis) 的零售业务全链路演示项目。  
> 本文档目录汇总各模块说明、工程实践与演示素材，便于新人上手与在线 Demo 维护。

---

## 快速导航

| 文档 | 说明 |
|------|------|
| [项目注释工作完成总结.md](./项目注释工作完成总结.md) | 全项目模块总览、业务流程、设计亮点 |
| [DEMO_WORKFLOW.md](./DEMO_WORKFLOW.md) | 本地展示准备、验收、截图素材工作流 |
| [screenshots/README.md](./screenshots/README.md) | 演示截图 / GIF 录制清单 |
| [INVENTORY_CONCURRENCY.md](./INVENTORY_CONCURRENCY.md) | 库存与履约并发设计 |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | 前端设计令牌与组件规范 |
| [QUICK_IMPLEMENTATION_GUIDE.md](./QUICK_IMPLEMENTATION_GUIDE.md) | 页面 UI 优化实施指南 |

---

## 模块文档（M1 → M8）

| 模块 | 文档 | 核心能力 |
|------|------|----------|
| M1 身份与权限 | [M1-身份与权限-注释总结.md](./M1-身份与权限-注释总结.md) | JWT、RBAC、多租户、审计 |
| M2 商品中心 | [M2-商品中心-注释总结.md](./M2-商品中心-注释总结.md) | Schema CRUD、SKU、上架审批 |
| M3 仓储库存 | [M3-仓储库存-注释总结.md](./M3-仓储库存-注释总结.md) | 入库/锁定/出库、库存红线 |
| M4 订单履约 | [M4-订单履约-注释总结.md](./M4-订单履约-注释总结.md) | 导入、支付、分仓、发货单 |
| M5 3D 仓库 | [M5-3D仓库可视化-项目介绍.md](./M5-3D仓库可视化-项目介绍.md) | Three.js 库位热力、拣货路径 |
| M6 扩展模块 | [M6-扩展模块-项目介绍.md](./M6-扩展模块-项目介绍.md) | 审批、审计、客户/财务/营销（薄） |
| M7 AI 业务助手 | [M7-AI业务助手-项目介绍.md](./M7-AI业务助手-项目介绍.md) | Playbook 分步指引 + 只读问数 |
| M8 工程化 | [M8-工程化-项目介绍.md](./M8-工程化-项目介绍.md) | Docker、CI、脚本、测试 |

---

## 产品定位（2026-06 更新）

本项目是 **在线 Demo + 业务流程教学** 导向：

1. **主航道（未来）**：AI **业务助手** — 帮助不熟悉系统的新同事，用自然语言获取分步操作指引与页面跳转。
2. **支撑 Demo**：商品 → 入库 → 订单履约 → 3D 拣货 → 经营看板，形成可演示的黄金链路。
3. **薄模块**：财务 / 营销 / 客户为只读汇总视图，不承担完整业财闭环。

> 上级目录 PRD / 架构文档若未与仓库一并提交，以本目录模块文档为准。

---

## 演示账号与角色能力

| 账号 | 密码 | 角色 | 典型能力 |
|------|------|------|----------|
| admin@retail.demo | demo123 | 管理员 | 全权限（含 AI、审批、完整手机号） |
| ops@retail.demo | demo123 | 运营 | 商品、履约、审批 submit/view/approve、客户/财务/营销只读 |
| warehouse@retail.demo | demo123 | 仓库 | 入库、分仓、拣货/出库；无 order:pay / order:import / AI |
| analyst@retail.demo | demo123 | 分析师 | AI 业务助手 + 只读商品/库存/订单 |
| finance@retail.demo | demo123 | 财务 | 经营总览、运营中心、财务/客户只读；无 marketing、audit、AI |

登录后默认进入 **经营总览**（`/view/dashboard/overview`）。

---

## 黄金链路（浏览器验收）

```text
登录 admin
→ 经营总览（指标 + AI 引导横幅）
→ 商品创建 / 上架审批
→ 入库 SKU
→ 履约：导入 → 支付（UI 按钮「支付」）→ 分仓 → 发货单 → 拣货 → 出库
→ 3D 仓库查看路径
→ AI 业务助手：「订单从导入到发货怎么走？」
→ 审计日志追溯关键动作
```

API 冒烟：`npm run e2e:smoke`（需服务已启动）。

---

## 代码地图（按层）

```text
retail-ops/
├── app/
│   ├── controller/       # HTTP 入口
│   ├── service/          # 业务逻辑（库存写入口在 stock.js）
│   ├── middleware/       # auth / tenant / permission
│   ├── common/           # helper、权限映射、路径构建
│   ├── knowledge/        # AI playbook 知识库（M7）
│   ├── pages/dashboard/  # Vue3 看板页面
│   └── router/           # API 路由
├── model/retail/         # 菜单与 Schema 配置
├── database/             # migrations + seeds
├── docs/                 # 本文档目录
├── scripts/              # migrate、seed、smoke、check
└── serve.js              # 启动入口
```

---

## 维护说明

- 新增 API 时同步更新 `app/router/`、`app/router-schema/`、`app/common/permission-map.js`，并跑 `npm run check:routes`。
- 新增 AI 业务流程时，在 `app/knowledge/playbooks/` 增加 playbook 并在 `app/knowledge/index.js` 注册。
- 演示截图按 [screenshots/README.md](./screenshots/README.md) 命名，更新根目录 README 引用。
