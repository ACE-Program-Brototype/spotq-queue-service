# --------------------------
# Build Stage
# --------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable
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

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

COPY prisma ./prisma

EXPOSE 3000

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]