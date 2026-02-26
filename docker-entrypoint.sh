#!/bin/sh
set -e

echo "==> Pushing database schema..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1

echo "==> Seeding database..."
node prisma/seed.js 2>&1 || echo "==> Seed skipped (may already be applied)"

echo "==> Starting server..."
exec "$@"
