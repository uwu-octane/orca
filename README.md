# OpenSEO (orca fork)

> Fork of [every-app/open-seo](https://github.com/every-app/open-seo): open source alternative to Semrush and Ahrefs.

This fork customizes the UI and feature logic while tracking upstream. The branch model and sync workflow are documented below under [Fork maintenance](#fork-maintenance); the change log lives in [FORK.md](./FORK.md).

---

## What is OpenSEO?

OpenSEO is an SEO tool for _the people_. If tools like Semrush or Ahrefs are too expensive or bloated, OpenSEO is a pay-as-you-go alternative that you actually control.

> All-in-one SEO tool for you and your AI agent.

Connect with any agent like Claude Code, OpenClaw or Hermes. We have pre-built skills, but you can build your own to tailor OpenSEO to your needs.

<img width="1385" height="794" alt="Image" src="https://github.com/user-attachments/assets/fd208249-44ea-4849-bb4b-5fc896aeab73" />

## Main SEO Workflows

- Keyword research
- Rank tracking
- Competitor Insights
- Backlinks
- Site Audits
- AI Visibility

## OpenSEO MCP & Agent Skills

OpenSEO exposes an MCP server so AI agents like Claude Code, OpenClaw, and Hermes can use your SEO data directly. Agent Skills are reusable workflows that guide your agent through SEO tasks using the MCP.

- [Set up OpenSEO MCP](https://openseo.so/docs/mcp)
- [Set up OpenSEO Agent Skills](https://openseo.so/docs/skills/setup)

## Hosted Version (upstream)

Upstream runs a hosted service at [openseo.so](https://openseo.so) (subscription $10/month). This fork is not affiliated with that service — deploy your own instance instead.

## Self-Hosting

OpenSEO supports two self-hosting paths:

- **Simple: Docker (Best for testing it out)** - For personal use on your own machine. See [`docs/SELF_HOSTING_DOCKER.md`](./docs/SELF_HOSTING_DOCKER.md).
- **Recommended: Cloudflare** - For internet-facing self-hosting across multiple devices or with your team (works on the free plan). See [`docs/SELF_HOSTING_CLOUDFLARE.md`](./docs/SELF_HOSTING_CLOUDFLARE.md).

Either way, you need a DataForSEO API key to get SEO data. See [`docs/DATAFORSEO_API_KEY.md`](./docs/DATAFORSEO_API_KEY.md).

## Costs

OpenSEO needs a [DataForSEO](https://dataforseo.com/?aff=255379) API key so that you can get SEO data. You pay them directly when self hosting.

See [openseo.so/pricing](https://openseo.so/pricing)

## Local Development

See [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md).

## Contributing

Creating clear issues is the best way to contribute.

Read more here: [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md)

We have this skill: `/simple-issue-description` which helps.

```sh
npx skills add every-app/open-seo --skill simple-issue-description
```

## Community (upstream)

Join Discord to chat: [Discord](https://discord.gg/c9uGs3cFXr)

Follow along for updates:

- Follow on X: https://x.com/bensenescu
- Sign up for the mailing list on our website: [openseo.so](https://openseo.so)

---

## Fork maintenance

### Branch model

| Branch | Role | Rules |
| ------ | ---- | ----- |
| `main` | Pristine mirror of `upstream/main` | Fast-forward only. **Never commit here.** Disposable — if it ever diverges, reset it with `git reset --hard upstream/main`. |
| `orca` | Fork customizations + releases | All fork changes land here. Deploy and tag releases from this branch. |

Remotes: `origin` → `uwu-octane/orca`, `upstream` → `every-app/open-seo`.

### Syncing upstream (weekly)

```sh
scripts/sync-upstream.sh
```

The script fast-forwards `main`, pushes it, merges `main` into `orca`, refreshes the lockfile if needed, and runs `pnpm ci:check`. On merge conflicts it stops mid-merge with instructions; resolve, commit, then re-run with `--skip-ci`.

Manual equivalent:

```sh
git checkout main
git pull upstream main --ff-only && git push origin main
git checkout orca
git merge main          # resolve conflicts here
```

### Merge policy

- **Default: merge all of `main` into `orca`.** Selectivity lives in when you cut a release, not in which commits you merge.
- Cherry-pick (`git cherry-pick -x <sha>`) only for occasional single fixes from upstream.
- To deliberately keep the fork's version of a file through a merge: `git checkout --ours <file>` after the merge, and log it in `FORK.md`.
- Fork delta at any time: `git log --oneline main..orca`.

### Keeping conflicts small

Upstream moves fast (~3 commits/day). Merge weekly so each merge is small, and keep customizations additive:

- **UI**: prefer daisyUI themes and `@theme` tokens over editing shared components.
- **Logic**: prefer new files, new routes, and env-flag switches over rewriting upstream code.
- When editing a shared upstream file is unavoidable, keep the edit small and mark it with a `// FORK:` comment.
- **Never hand-resolve generated files** — regenerate instead:
  - `src/routeTree.gen.ts` → run `vite dev` (auto-regenerates)
  - `worker-configuration.d.ts` → `pnpm cf-typegen`
  - `pnpm-lock.yaml` → `git checkout --theirs pnpm-lock.yaml && pnpm install`
  - Drizzle migrations → never edit upstream migration files; add new migration files for fork schema changes (`drizzle/` and `drizzle-pg/`, keeping both dialects in sync)
- After every merge: `pnpm ci:check && pnpm test`.
- If the merge added files under `drizzle/`, apply them to local D1: `pnpm db:migrate:local`.

### Releases

- Tag releases on `orca` with an upstream-version suffix: `v0.1.6-orca.1`.
- Never run upstream's `release:publish` script — it publishes to upstream's channels.
- CI/deploy workflows must trigger from `orca`, with this repo's own Cloudflare credentials.

### Never

- Never rebase or force-push `orca` (fork sync tooling and PR flows depend on its history).
- Never commit to `main`.
- Never edit upstream drizzle migrations or marketplace manifests in place without logging it in `FORK.md`.

## License

MIT. Copyright (c) 2026 Ben Senescu (upstream); fork changes under the same license.
