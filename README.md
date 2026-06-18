# retail-ops

智能零售运营中台 — 基于 elpis 的零售业务项目。

## 本地开发

```bash
# 1. 先安装 elpis 框架依赖
cd ../elpis && npm install

# 2. 再安装业务项目依赖
cd ../retail-ops && npm install

# 3. 启动开发服务
npm run dev
```

访问：http://localhost:8080/view/login

## 构建

```bash
npm run build:local   # 本地构建（NODE_ENV=local）
npm run build:prod    # 生产构建（NODE_ENV=prod）
npm run start:prod    # 生产运行（NODE_ENV=production）
```

## 依赖说明

- 开发期使用 `"@lh199.123/elpis": "file:../elpis"` 本地引用
- CI/Docker 上线前需改为已发布的 npm 版本，或使用 monorepo 构建上下文

## 文档

设计文档位于上级目录 `dom/`：

- `elpis-retail-ops-prd.md`
- `elpis-retail-ops-architecture.md`
- `elpis-retail-ops-task-breakdown.md`
