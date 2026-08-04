# --------------------------
# Build Stage
# --------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm config set registry https://registry.npmmirror.com
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm exec prisma generate
RUN pnpm build
RUN pnpm prune --prod


# --------------------------
# Production Stage
# --------------------------
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache bash curl && \
    curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash && \
    apk add infisical

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json ./
COPY .infisical.jso[n] ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3000

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]