# monorepo 构建：在 dom/ 父目录执行
#   docker build -f retail-ops/Dockerfile -t retail-ops .
# 或在 retail-ops/ 目录执行
#   docker compose up -d --build

FROM node:18-alpine

RUN apk add --no-cache tini

WORKDIR /app

# 方式 B：monorepo，构建上下文为 dom/
COPY elpis ./elpis
COPY retail-ops ./retail-ops

WORKDIR /app/elpis
RUN npm install --omit=dev

WORKDIR /app/retail-ops
RUN npm install --omit=dev
RUN NODE_ENV=prod node build.js

ENV NODE_ENV=production
ENV PORT=8090

EXPOSE 8090

WORKDIR /app/retail-ops
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node scripts/init-db.js && node serve.js"]
