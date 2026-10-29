#!/bin/sh
set -eu
[ "${AUTH_MODE:-}" = cloudflare_access ]
[ "${DATABASE_PROVIDER:-}" = postgres ]
[ -n "${CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:-}" ]
[ -f dist/server/wrangler.json ] || [ -f dist/open_seo/wrangler.json ]
pnpm exec tsx scripts/selfhost-preflight.ts
exec node scripts/selfhost-scheduler.mjs
