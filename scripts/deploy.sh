#!/usr/bin/env bash
set -euo pipefail

if [[ "${DEPLOY_ENV:-}" != "staging" && "${DEPLOY_ENV:-}" != "production" ]]; then
  printf 'Set DEPLOY_ENV=staging or production. This command prepares a release only.\n' >&2
  exit 1
fi
if [[ "${DEPLOY_APPROVED:-}" != "prepare-${DEPLOY_ENV}" ]]; then
  printf 'Explicit DEPLOY_APPROVED=prepare-%s is required.\n' "$DEPLOY_ENV" >&2
  exit 1
fi
: "${DEPLOY_HOST:?Set the approved SSH hostname}"
: "${DEPLOY_USER:?Set the deployment user}"
: "${DEPLOY_PATH:?Set the absolute versioned release root, not the legacy website directory}"
: "${DEPLOY_SSH_KEY:?Set the private SSH key path}"
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9.-]+$ && "$DEPLOY_USER" =~ ^[a-zA-Z0-9_-]+$ && "$DEPLOY_PATH" =~ ^/[a-zA-Z0-9/_-]+$ && "${DEPLOY_PORT:-22}" =~ ^[0-9]+$ ]] || { printf 'Invalid deployment parameters.\n' >&2; exit 1; }
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
[[ -z "$(git status --porcelain)" ]] || { printf 'Commit the reviewed release first.\n' >&2; exit 1; }
[[ -f "$DEPLOY_SSH_KEY" ]] || { printf 'Deployment key not found.\n' >&2; exit 1; }
release="$(git rev-parse --short=12 HEAD)"
temporary="$(mktemp -d)"
trap 'rm -rf -- "$temporary"' EXIT
git archive HEAD | tar -x -C "$temporary"
target="${DEPLOY_USER}@${DEPLOY_HOST}"
options=(-i "$DEPLOY_SSH_KEY" -p "${DEPLOY_PORT:-22}" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=10)
ssh "${options[@]}" "$target" "test -d '$DEPLOY_PATH/shared/data' && test -d '$DEPLOY_PATH/shared/uploads' && test -f '$DEPLOY_PATH/shared/.env' && mkdir '$DEPLOY_PATH/releases/$release'"
rsync -az -e "ssh -i $(printf '%q' "$DEPLOY_SSH_KEY") -p ${DEPLOY_PORT:-22} -o IdentitiesOnly=yes -o BatchMode=yes" "$temporary/" "$target:$DEPLOY_PATH/releases/$release/"
ssh "${options[@]}" "$target" "cd '$DEPLOY_PATH/releases/$release' && npm ci --omit=dev && ln -s '$DEPLOY_PATH/shared/.env' .env"
printf 'Prepared release %s. Nothing activated, migrated, restarted or deleted on the server.\n' "$release"
printf 'Use the reviewed scripts/release.mjs activation command on the server after staging approval.\n'