FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

# 安装 fontconfig 以支持字体渲染，以及 curl 用于健康检查
RUN apk add --no-cache fontconfig curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY assets ./assets

EXPOSE 9050

CMD ["node", "dist/main"]
