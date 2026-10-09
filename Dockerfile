# --------------------------
# Build Stage
# --------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set fetch-timeout 300000 && \
    pnpm config set fetch-retries 5
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm exec prisma generate
RUN pnpm build
RUN pnpm prune --prod --ignore-scripts


# --------------------------
# Production Stage
# --------------------------
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache bash curl && \
    curl -1sLf 'https://artifacts-cli.infisical.com/setup.apk.sh' | sh && \
    apk update && \
    apk add --no-cache infisical

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json ./
COPY .infisical.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3004

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --spider -q http://localhost:3004/health || exit 1

CMD ["infisical", "run", "--", "node", "dist/server.js"]