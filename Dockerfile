FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# --- Install dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# --- Build application ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
RUN ./node_modules/.bin/esbuild prisma/seed.ts \
      --bundle --platform=node --format=cjs \
      --outfile=prisma/seed.js \
      --external:@prisma/client --external:bcryptjs

# --- DB migration runner (has full node_modules) ---
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# --- Production app runner (slim, standalone) ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs --ingroup nodejs nextjs
ENV HOME=/home/nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
