#!/bin/bash
set -euo pipefail
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ (sha256:[a-f0-9]{64})\ ([a-f0-9]{40})$ ]]; then
  exec sudo -n /usr/local/sbin/orca-deploy "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
fi
printf 'Only immutable Orca deployments are allowed.\n' >&2
exit 1
