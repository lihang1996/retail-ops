# 演示截图与 GIF 录制清单（M8-05）

将素材放在本目录，README 首屏引用 `warehouse-3d.png`（或 `.gif`）。

## 建议文件名

| 文件 | 页面 / 场景 | 账号建议 |
|---|---|---|
| `login.png` | `/view/login` | — |
| `project-list-admin.png` | 项目列表（管理员菜单全量） | admin@retail.demo |
| `project-list-warehouse.png` | 项目列表（仓库角色菜单较少） | warehouse@retail.demo |
| `product-schema.png` | 商品 Schema CRUD | admin |
| `stock-inbound.png` | 仓储 → 商品入库 | warehouse |
| `fulfillment.png` | 履约中心：导入→支付→分仓→发货 | ops |
| `warehouse-3d.png` / `warehouse-3d.gif` | 3D 仓库风险热力 + 拣货路径 | warehouse |
| `dashboard-overview.png` | 经营总览看板 | admin |
| `ai-workbench.png` | AI 工作台查询结果 | analyst |

## 录制要点

- 分辨率：1920×1080 或 1440×900，浏览器缩放 100%。
- GIF：单条链路 15–30 秒，帧率 10–15 fps，宽度 ≤ 1200px 便于 GitHub 渲染。
- 3D 场景：旋转视角展示库位颜色与拣货路径连线，作为 README 首图。
- 敏感信息：演示环境无真实客户数据；客户手机号已脱敏。

## 快速路径（黄金链路）

```text
登录 admin → 经营总览
→ 商品上架审批
→ 入库 SKU-DEMO-001
→ 履约导入订单 → 支付 → 分仓 → 发货 → 拣货 → 出库
→ 3D 仓库查看路径
→ 看板指标变化
```

录制完成后更新根目录 `README.md` 中的图片链接。
