# Oracle deployment

`orca.x-whale.com` runs on `ubuntu@129.146.162.30`. Production releases come
from the maintained `orca` branch, not upstream `main`.

## Delivery

`.github/workflows/oracle-deploy.yml` checks the code and tests, builds the
ARM64 production image on GitHub, and publishes `ghcr.io/uwu-octane/orca`.
Deployment uses the immutable digest and verifies the image's commit label.
The server does not compile releases. `ORACLE_DEPLOY_ENABLED=true` enables
promotion; leave it false while bootstrapping or migrating the database.

GitHub secrets `ORACLE_DEPLOY_KEY` and `ORACLE_KNOWN_HOSTS` provide a dedicated,
host-key-pinned SSH identity. The server's `orca-deploy` user accepts only
`deploy <sha256 digest> <commit SHA>` through a forced command. It has no shell,
forwarding, Docker group membership, or unrestricted sudo access. The workflow's
short-lived package token is passed on stdin and its temporary Docker login is
removed after use. Application secrets stay on the server.

Install the reviewed `deploy/oracle/deploy-ssh.sh`, `deploy.sh` and
`maintenance.sh` as root-owned executables under `/usr/local/sbin` named
`orca-deploy-ssh`, `orca-deploy` and `orca-maintenance`. Only the middle command is
allowed by `/etc/sudoers.d/orca-deploy`. Changing these host scripts or the
server's Compose file requires administrator access; a push does not overwrite
them. Workflow and deployment permission changes require maintainer review.

## Application and data

- `/opt/orca/compose.yaml`: installed from `deploy/oracle/compose.yaml`.
- `/opt/orca/release.env`: deployed immutable `ORCA_IMAGE`.
- `/opt/orca/.env`: owner-readable secrets, PostgreSQL URL and Access settings.
- `/opt/orca/data/state`: KV, R2, workflows and SAM Durable Object storage.
- `/opt/orca/backups`: deployment database dumps and state snapshots.
- `/opt/orca/postgres-ready`: created only after the migration is verified.

Application tables use PostgreSQL. `POSTGRES_DATABASE_URL` is for migrations;
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` supplies the runtime
Hyperdrive binding in both workers. `DATABASE_PROVIDER=postgres` is required.
SAM's Durable Object storage and KV/R2 remain in the persistent state directory;
do not delete that directory after migrating application tables.

The public OAuth origin is `https://orca.x-whale.com`. Keep `BETTER_AUTH_SECRET`
and the original Access team/audience. Tunnel
`775d8511-e4d9-42ce-bc2b-4ab314bf90db` runs on this server; the old Mac connector
is disabled. Application and tunnel metrics ports bind only to host loopback.

## Shared services

`/opt/shared-data/compose.yaml` is independent of Orca's release lifecycle and
uses `deploy/oracle/shared.compose.yaml`. There is one PostgreSQL instance and
one Redis instance on the external Docker network `shared-data`.

- PostgreSQL: `shared-postgres:5432`; Orca owns database and role `orca`.
- Redis: `shared-redis:6379`; default user disabled; ACL authentication required.
- Administrative passwords: root-readable `/opt/shared-data/secrets/`.
- Host ports `5432` and `6379` bind only to `127.0.0.1`.

Give each future application its own PostgreSQL database/login and Redis ACL
user with a key/channel prefix and minimal commands. Do not share administrator
credentials. Redis logical database numbers are not an authorization boundary.
Orca does not currently use Redis. Redis uses AOF persistence and a 256 MB memory
limit with no eviction; review capacity for each added workload.

## Operations and retention

```sh
ssh -i ~/.ssh/oracle_server ubuntu@129.146.162.30
cd /opt/orca
sudo docker compose --env-file release.env ps
sudo docker logs --tail 100 orca
curl -fsS http://127.0.0.1:8989/api/health
```

Deployments serialize with a host lock. After pulling the image, the deploy
script stops Orca writes, backs up its PostgreSQL database and state, runs
migrations, and starts the new image. A failed migration or health check fails
the job; there is no automatic database rollback. Diagnose before resuming.
Never switch back to the stale SQLite snapshot after new PostgreSQL writes.

Journald retains at most three days and 100 MB of system/container logs. It
rotates files daily. Daily maintenance keeps the current and previous Orca
images and removes deployment backups older than seven days. Cleanup never
prunes volumes or shared database directories. Initial migration snapshots are
kept separately. Routine off-server database backups are not configured.

For initial migration, stop Orca, create a consistent SQLite backup, apply the
PostgreSQL migrations, and run the existing codec-aware migration command:

```sh
pnpm exec tsx scripts/migrate-d1-to-postgres.ts --sqlite-file /source.sqlite
```

The target must be empty. Confirm all table counts match before installing the
PostgreSQL environment and enabling deployment. The original Mac migration
snapshot remains under
`~/Library/Application Support/Orca/backups/oracle-migration-20261029T162112Z`.
