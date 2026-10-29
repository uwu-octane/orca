# Orca in Codex Cloud

Use repository `uwu-octane/orca` and base coding tasks on `orca`. The `main`
branch tracks upstream OpenSEO and does not contain all Orca customizations.

## Environment configuration

Create or edit an environment in **Settings → Codex Cloud → Environments**.
Select the repository, use Node.js 22 LTS (at least 22.12), and run this install
script from the repository root:

```bash
bash scripts/codex-cloud-setup.sh
```

The script installs the pnpm version pinned in `package.json`, installs locked
dependencies, migrates a local SQLite/D1 database and builds report widgets.
It creates ignored `.env.local` and `.dev.vars` files for `local_noauth` with a
random development encryption secret. It refuses to replace existing unmanaged
configuration. Rerunning preserves development data and the encryption secret.

Allow the Package managers network preset. Add `api.github.com` and
`raw.githubusercontent.com` for repository operations and source access. Start
with no external API credentials, production database URLs or deployment SSH
keys. Normal code changes, unit tests and builds do not need those credentials.

Use the following as the environment's **Start skill**:

```text
Work in uwu-octane/orca, with orca as the base branch. Read AGENTS.md and, for
business changes, docs/PLUGINS.md and docs/maintainers/domain-plugins.md.
After a repository refresh changes dependencies or migrations, run
bash scripts/codex-cloud-setup.sh before starting services.
For tasks that need the app, run pnpm dev --host 127.0.0.1 in a managed terminal.
Check http://127.0.0.1:8989/api/health and the root page for HTTP 200.
Keep local_noauth bound to loopback; do not expose it publicly.
Run the relevant existing tests and pnpm ci:check. Run pnpm build when changes
affect the application build. The maintainer performs visual UI verification.
Create changes on a codex/ branch and target PRs at orca. Do not deploy from
this environment. Merging into orca triggers the existing Oracle GitHub workflow.
```

Verify installation and startup in the cloud setup conversation, then publish
the environment. Saving configuration alone does not publish it. Start a new
task after republishing to use the updated environment.

For the legacy Codex environment screen, use the same command for both **Setup
script** and **Maintenance script**. Configure the task branch as `orca`.

## Validation and data

```bash
pnpm ci:check
pnpm test:ci
pnpm build
```

The sandbox starts with an empty database. Production Google connections,
keyword searches, dimensions, API keys and SAM sessions are not copied. Tests
mock suppliers; testing actual provider calls requires separate development
credentials and network permissions. PostgreSQL-specific work must also use
an isolated PostgreSQL database as described in [LOCAL_POSTGRES.md](../LOCAL_POSTGRES.md).

Repository scripts prepare a checkout; they do not create or publish a Codex
account environment. Complete that step in the settings UI.

Reference: [OpenAI cloud environment documentation](https://learn.chatgpt.com/docs/environments/cloud-environments).
