#!/bin/bash
set -euo pipefail
cd /opt/orca
# Only images produced by this repository are eligible; never prune data volumes.
current=$(docker inspect orca --format '{{.Image}}')
previous=''
if [[ -s previous-image ]]; then
  previous=$(docker image inspect "$(cat previous-image)" --format '{{.Id}}')
fi
while read -r id; do
  [[ -n "$id" ]] || continue
  full=$(docker image inspect "$id" --format '{{.Id}}')
  if [[ "$full" != "$current" && "$full" != "$previous" ]]; then docker image rm "$id"; fi
done < <(docker image ls --filter label=org.opencontainers.image.source=https://github.com/uwu-octane/orca --format '{{.ID}}' | sort -u)
# Only timestamped backups created by deploy.sh, not databases or migration backups.
find /opt/orca/backups -maxdepth 1 -type d -name 'release-????????T??????Z' -mtime +7 -exec rm -rf -- {} +
journalctl --vacuum-time=3d --vacuum-size=100M >/dev/null
