FROM node:22-bookworm AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches ./patches
COPY vendor/loader ./vendor/loader
RUN pnpm install --frozen-lockfile
COPY . .
ENV AUTH_MODE=cloudflare_access VITE_SHOW_DEVTOOLS=false DATABASE_PROVIDER=postgres
RUN pnpm run build

FROM node:22-bookworm-slim
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CLOUDFLARE_INCLUDE_PROCESS_ENV=true AUTH_MODE=cloudflare_access VITE_SHOW_DEVTOOLS=false DATABASE_PROVIDER=postgres PORT=8989
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* && corepack enable && corepack prepare pnpm@10.30.1 --activate
COPY --from=build /app /app
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD node deploy/oracle/health.mjs
CMD ["sh", "deploy/oracle/start.sh"]
