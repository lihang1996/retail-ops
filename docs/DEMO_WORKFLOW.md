# Demo 工作流

> 范围：本工作流只覆盖本地展示与验收，不覆盖 AI 业务助手正式建设，也不覆盖部署上线。

## 目标

把当前项目按一条稳定的展示链路维护：

```text
基础检查
→ 演示数据准备
→ 本地启动
→ API 验收
→ 浏览器黄金链路
→ 截图/GIF 素材
→ 演示前复查
```

## 1. 基础检查

每次集中修改后先跑：

```bash
npm run demo:preflight
```

它会执行：

- `npm run lint`
- `npm run test:unit`
- `npm run check:routes`
- `npm run check:dist`
- 检查 `docs/screenshots/` 是否已有核心展示素材

这一步不会要求服务启动，也不会改业务数据。

## 2. 演示数据准备

首次准备本地库：

```bash
npm run seed:demo
```

需要把演示数据恢复到干净状态时：

```bash
npm run reset:demo
```

注意：`reset:demo` 会清理演示租户的业务数据后重新 seed，适合录制或演示前使用。

## 3. 本地启动

```bash
npm run build:prod
npm run dev
```

访问：

```text
http://localhost:8090/view/login
```

如果只改后端逻辑，通常重新启动 `npm run dev` 即可；如果改了前端页面或样式，先重新构建。

## 4. API 验收

服务启动后，在另一个终端执行：

```bash
npm run demo:verify
```

它会先跑基础检查，再跑：

- `npm run test:pagination`
- `npm run e2e:golden`

`e2e:golden` 会创建临时商品、SKU、订单和发货单，用来验证商品、审批、入库、履约、3D 拣货路径、看板、审计日志等主链路。

## 5. 浏览器黄金链路

建议用 `admin@retail.demo / demo123` 完整走一遍：

```text
登录
→ 经营总览确认指标有数据
→ 商品中心创建商品和 SKU
→ 提交并通过上架审批
→ 仓储入库
→ 履约中心导入订单
→ 支付
→ 分仓
→ 生成发货单
→ 开始拣货
→ 确认拣货
→ 出库发货
→ 3D 仓库查看库位风险和拣货路径
→ 审计日志确认关键动作可追溯
```

本轮暂不把 AI 助手纳入验收主链路，后续 AI 正式建设完成后再单独扩展。

## 6. 截图/GIF 素材

按 [screenshots/README.md](./screenshots/README.md) 录制素材。最低建议先补齐：

- `login.png`
- `dashboard-overview.png`
- `product-schema.png`
- `stock-inbound.png`
- `fulfillment.png`
- `warehouse-3d.png` 或 `warehouse-3d.gif`

录制后再更新根目录 `README.md` 的展示图引用。

## 7. 演示前复查

演示前按这个顺序快速确认：

1. `npm run demo:preflight` 全绿。
2. `npm run reset:demo` 恢复稳定数据。
3. `npm run build:prod` 成功。
4. `npm run dev` 启动后 `/health` 正常。
5. `npm run demo:verify` 全绿。
6. 浏览器手工走完黄金链路。

如果只是在本机给人看，第 5 步通过后通常就足够稳了。
