#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Only run in an isolated development checkout, never the production container.
node --input-type=module <<'NODE'
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  throw new Error('Use Node.js 22.12 or newer; Node.js 22 LTS matches CI.');
}
const marker = '# Orca isolated Codex Cloud development';
const files = ['.env.local', '.dev.vars'];
for (const file of files) {
  if (existsSync(file) && !readFileSync(file, 'utf8').startsWith(marker + '\n')) {
    throw new Error(`Refusing to replace existing ${file}. Use a fresh checkout.`);
  }
}
const existing = files.find((file) => existsSync(file));
const config = existing ? readFileSync(existing, 'utf8') : `${marker}
AUTH_MODE=local_noauth
DATABASE_PROVIDER=d1
VITE_SHOW_DEVTOOLS=false
PORT=8989
BETTER_AUTH_URL=http://localhost:8989
BETTER_AUTH_SECRET=${randomBytes(32).toString('hex')}
`;
for (const file of files) {
  if (!existsSync(file)) writeFileSync(file, config, { mode: 0o600, flag: 'wx' });
}
NODE

package_manager=$(node -p 'require("./package.json").packageManager')
if ! command -v pnpm >/dev/null 2>&1 || [[ "$(pnpm --version)" != "${package_manager#pnpm@}" ]]; then
  npm install --global "$package_manager"
fi

export AUTH_MODE=local_noauth
export DATABASE_PROVIDER=d1
export VITE_SHOW_DEVTOOLS=false
export WRANGLER_SEND_METRICS=false
export CI=true

pnpm install --frozen-lockfile
pnpm db:migrate:local
pnpm build:report-widgets

printf 'Orca development environment ready. Start with: pnpm dev --host 127.0.0.1\n'
