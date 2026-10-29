#!/bin/bash
set -euo pipefail
umask 077
[[ ${1:-} =~ ^sha256:[a-f0-9]{64}$ && ${2:-} =~ ^[a-f0-9]{40}$ ]]
cd /opt/orca
exec 9>/run/lock/orca-deploy.lock
flock -n 9
image="ghcr.io/uwu-octane/orca@$1"
revision=$2
mode=${3:-deploy}
[[ "$mode" == stage || "$mode" == deploy ]]
registry_config=$(mktemp -d)
trap 'rm -rf "$registry_config"' EXIT
# The workflow's short-lived token arrives over stdin, never as an argument.
docker --config "$registry_config" login ghcr.io -u uwu-octane --password-stdin >/dev/null
docker --config "$registry_config" pull "$image"
[[ $(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}') == "$revision" ]]
[[ $(docker image inspect "$image" --format '{{.Architecture}}') == arm64 ]]
if [[ "$mode" == stage ]]; then
  printf '%s\n' "$image" > staged-image
  printf '%s\n' "$revision" > staged-revision
  echo "Staged $revision"
  exit 0
fi
[[ -f postgres-ready ]]
previous=$(docker inspect orca --format '{{.Config.Image}}')
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p backups
# Keep application writes stopped until migrations complete. Failures remain
# visible for the operator; no automatic schema/data rollback.
docker stop orca
backup="backups/release-$stamp"
mkdir "$backup"
docker exec shared-postgres pg_dump -U platform_admin -d orca -Fc > "$backup/orca.dump"
tar -czf "$backup/state.tgz" --exclude='state/v3/observability' -C data state
printf '%s\n' "$previous" > "$backup/previous-image"
docker run --rm --network shared-data --env-file .env "$image" pnpm db:migrate:pg
printf 'ORCA_IMAGE=%s\n' "$image" > release.env
# Compose is installed by the administrator, not copied from untrusted SSH input.
docker compose --env-file release.env up -d --no-deps orca
for attempt in $(seq 1 30); do
  if docker exec orca node deploy/oracle/health.mjs; then
    printf '%s\n' "$previous" > previous-image
    printf '%s\n' "$revision" > deployed-revision
    rm -f staged-image staged-revision
    /usr/local/sbin/orca-maintenance
    echo "Deployed $revision"
    exit 0
  fi
  sleep 3
done
echo 'Deployment health check failed; inspect docker logs orca.' >&2
exit 1
