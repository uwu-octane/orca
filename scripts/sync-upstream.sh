#!/usr/bin/env bash
# Sync upstream every-app/open-seo into this fork.
#
#   main = pristine mirror of upstream/main (never commit here)
#   orca = fork customization + release branch (deploy from here)
#
# Usage: scripts/sync-upstream.sh [--skip-ci]
#
# What it does:
#   1. Fetches upstream and fast-forwards main (mirror)
#   2. Pushes main to origin
#   3. Merges main into orca
#   4. Refreshes pnpm-lock.yaml if the merge touched dependencies
#   5. Runs pnpm ci:check (skip with --skip-ci)
#
# If step 3 conflicts, the script exits mid-merge. Resolve the conflicts,
# commit, then re-run with --skip-ci to finish the lockfile/check steps.

set -euo pipefail

SKIP_CI=0
if [[ "${1:-}" == "--skip-ci" ]]; then
  SKIP_CI=1
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--skip-ci]" >&2
  exit 2
fi

MIRROR=main
CUSTOM=orca
UPSTREAM=upstream

# --- preflight -----------------------------------------------------------
if ! git remote get-url "$UPSTREAM" >/dev/null 2>&1; then
  echo "error: missing remote '$UPSTREAM'. Add it with:" >&2
  echo "  git remote add $UPSTREAM https://github.com/every-app/open-seo.git" >&2
  exit 1
fi

START_BRANCH="$(git branch --show-current)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is dirty. Commit or stash changes first." >&2
  exit 1
fi

# --- 1. fast-forward the mirror ------------------------------------------
git fetch "$UPSTREAM" main

git checkout "$MIRROR"
if ! git merge --ff-only "$UPSTREAM/main"; then
  echo "error: $MIRROR has diverged from $UPSTREAM/main." >&2
  echo "$MIRROR is a pure mirror and disposable — reset it with:" >&2
  echo "  git checkout $MIRROR && git reset --hard $UPSTREAM/main" >&2
  git checkout "$START_BRANCH"
  exit 1
fi
git push origin "$MIRROR"

# --- 2. merge into the customization branch -------------------------------
git checkout "$CUSTOM"
LOCK_BEFORE="$(git rev-parse HEAD:pnpm-lock.yaml 2>/dev/null || true)"
if ! git merge "$MIRROR"; then
  echo
  echo "CONFLICT: merge stopped on $CUSTOM. Resolve conflicts, then:" >&2
  echo "  git add -A && git commit" >&2
  echo "  $0 --skip-ci   # to finish the lockfile and check steps" >&2
  exit 1
fi
LOCK_AFTER="$(git rev-parse HEAD:pnpm-lock.yaml 2>/dev/null || true)"
if [[ "$LOCK_BEFORE" != "$LOCK_AFTER" ]]; then
  echo "lockfile changed by merge — refreshing install..."
  pnpm install
fi

# --- 3. gate checks -------------------------------------------------------
if [[ $SKIP_CI -eq 0 ]]; then
  pnpm ci:check
else
  echo "skipping ci:check (--skip-ci)"
fi

git checkout "$START_BRANCH" 2>/dev/null || true

echo
echo "Done. Review 'git log --oneline main..$CUSTOM', then push and tag:"
echo "  git push origin $CUSTOM"
echo "  git tag v0.1.6-$CUSTOM.N && git push origin --tags"
