#!/bin/bash
set -euo pipefail
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^(stage|deploy)\ (sha256:[a-f0-9]{64})\ ([a-f0-9]{40})$ ]]; then
  exec sudo -n /usr/local/sbin/orca-deploy "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" "${BASH_REMATCH[1]}"
fi
printf 'Only immutable Orca deployments are allowed.\n' >&2
exit 1
