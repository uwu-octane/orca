#!/bin/sh
set -eu
[ "${AUTH_MODE:-}" = cloudflare_access ]
[ "${DATABASE_PROVIDER:-}" = postgres ]
[ -n "${CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:-}" ]
pnpm exec tsx scripts/selfhost-preflight.ts
pnpm build:report-widgets
exec node scripts/selfhost-scheduler.mjs dev
