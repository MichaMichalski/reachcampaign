FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# --- Install all dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# --- Build application ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXTAUTH_SECRET="build-time-placeholder"
RUN pnpm prisma generate
RUN pnpm run build

# --- Production dependencies only ---
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --prod --frozen-lockfile

# --- Production runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs --ingroup nodejs nextjs
ENV HOME=/home/nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Production deps (properly resolved by pnpm — includes prisma + all transitive deps)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma schema for db push at startup
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.prisma ./prisma/schema.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD node_modules/.bin/prisma generate && node_modules/.bin/prisma db push --skip-generate --accept-data-loss && node server.js