# M7: AI 业务助手 - 项目介绍

> 更新时间：2026-06-26  
> 模块状态：✅ MVP 已实现（Playbook + 只读问数，非 LLM）

## 产品定位

**AI 业务助手** 是本 Demo 的 **主航道功能**：面向不熟悉系统的新业务同事，用自然语言提问，返回 **分步操作说明 + 可跳转链接**；辅以少量 **只读问数**（库存风险、订单趋势）。

当前实现为 **关键词匹配 + 结构化 playbook**，未接入大模型；后续可在此基础上叠加 RAG / LLM。

---

## 回答优先级

```text
用户提问
  │
  ├─ 1. 匹配 playbook（权限过滤 + 关键词打分）
  │      → type: playbook，返回 steps[] + links[]
  │
  ├─ 2. 只读问数（库存风险 / 近 7 天订单）
  │      → type: data，执行只读 SQL
  │
  └─ 3. Fallback
         → type: fallback，推荐示例问题 + 可访问 playbook 列表
```

---

## 知识库（Playbook）

目录：`app/knowledge/playbooks/`

| ID | 标题 | permissionsAny（任一即可） |
|----|------|---------------------------|
| `demo-golden-path` | 演示黄金链路 | （空 = 全员） |
| `order-fulfillment` | 订单履约全流程 | `order:view` |
| `product-onboarding` | 商品上架流程 | `product:view` |
| `approval-flow` | 上架审批流程 | `approval:view` / `approve` / `submit` |
| `stock-inbound` | 商品入库流程 | `stock:inbound` 或 `stock:view` |
| `warehouse-picking` | 仓库拣货与 3D | `shipment:pick` / `shipment:view` / `warehouse:view` |

路径由 `app/common/dashboard-paths.js` 的 `resolvePlaybookPath()` 解析为可导航 URL。

---

## 后端 API

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/proj/ai/query` | `ai:query` | 提问 |
| GET | `/api/proj/ai/history` | `ai:query` | 历史（含 report_json 中的 steps） |
| GET | `/api/proj/ai/suggestions` | `ai:query` | 推荐问题与可访问 playbook 列表 |

### POST `/api/proj/ai/query` 响应

```javascript
{
  conversationId, queryId,
  type: 'playbook' | 'data' | 'fallback',
  playbookId,        // playbook 时
  playbookTitle,
  answer,
  steps: [],         // playbook 时有分步
  links: [],
  dataSource,        // 如 playbook:order-fulfillment / stocks+...
  queryCondition,    // 问数时有 SQL 条件描述
  rows: [],          // 问数时有数据行
  suggestions: []    // 仅 type=fallback 时返回推荐问题
}
```

持久化：`ai_queries` + `ai_reports.report_json`（含 type、steps、links）。

### GET `/api/proj/ai/suggestions` 响应

```javascript
{
  questions: ['订单从导入到发货怎么走？', ...],
  playbooks: [{ id, title, summary }, ...]
}
```

---

## 只读问数（演示）

| 意图 | 触发词示例 | 数据源 |
|------|------------|--------|
| 库存风险 | 库存不足、缺货、风险 SKU | `stocks` + `product_skus` |
| 订单趋势 | 最近 7 天、订单趋势 | `orders` 按日聚合 |

不执行写操作，不调用外部 LLM。

---

## 前端

| 文件 | 说明 |
|------|------|
| `app/pages/dashboard/ai-workbench/ai-workbench.vue` | 对话 UI、步骤列表、推荐 chips |
| `app/pages/dashboard/overview/overview.vue` | 有 `menu:ai` 时展示引导横幅 |

### URL 预填问题

```
/view/dashboard/ai-workbench?proj_key=retail&q=订单从导入到发货怎么走？
```

### 与履约 UI 术语

Playbook 中「模拟支付」指 Demo 环境的 **`POST /api/proj/order/pay`**；履约中心按钮文案为 **「支付」**（见 `fulfillment-row-actions.js`）。

---

## 权限与角色（seed）

| 权限码 | 说明 |
|--------|------|
| `menu:ai` | 菜单可见 |
| `ai:query` | 可提问 |

| 角色 | AI 菜单 |
|------|---------|
| admin | ✅（全权限） |
| analyst | ✅ |
| ops / warehouse / finance | ❌ |

---

## 扩展指南

1. 新建 `app/knowledge/playbooks/{name}.js`
2. 注册到 `app/knowledge/index.js` 的 `PLAYBOOKS`
3. 必要时扩展 `resolvePlaybookPath` 的 `pathKey`
4. 补充 `tests/unit/ai-playbook-matcher.test.js`

---

## 测试

```bash
npm run test:unit   # 含 ai-playbook-matcher.test.js
```

---

## 相关文档

- [M4-订单履约-注释总结.md](./M4-订单履约-注释总结.md)
- [screenshots/README.md](./screenshots/README.md)

---

*项目：retail-ops (智能零售运营中台)*
