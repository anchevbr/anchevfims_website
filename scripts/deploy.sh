#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_host="${DEPLOY_HOST:-srv1487445.hstgr.cloud}"
deploy_user="${DEPLOY_USER:-root}"
deploy_path="${DEPLOY_PATH:-/var/www/anchevfilms}"
deploy_port="${DEPLOY_PORT:-22}"
deploy_key="${DEPLOY_SSH_KEY:-$HOME/.ssh/anchevfilms_deploy_auto}"
deploy_project_id="${DEPLOY_PROJECT_ID:-}"
ssh_target="${deploy_user}@${deploy_host}"
ssh_options=(-i "$deploy_key" -p "$deploy_port" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=10)
remote_path="$(printf '%q' "$deploy_path")"

for command in ssh rsync; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command" >&2
    exit 1
  fi
done

if [[ ! -f "$deploy_key" ]]; then
  printf 'Deployment key not found: %s\n' "$deploy_key" >&2
  exit 1
fi

if ! ssh "${ssh_options[@]}" "$ssh_target" 'test -n "$ADMIN_SECRET_HASH"'; then
  cat >&2 <<EOF
Unable to authenticate to $ssh_target or ADMIN_SECRET_HASH is not configured.
Configure an SSH key and ADMIN_SECRET_HASH in the remote deployment environment,
then run this command again.
EOF
  exit 1
fi

printf 'Deploying to %s:%s\n' "$ssh_target" "$deploy_path"
ssh "${ssh_options[@]}" "$ssh_target" "mkdir -p $remote_path"

rsync -az --delete \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'node_modules/' \
  --exclude 'data/' \
  --exclude 'uploads/' \
  --exclude 'public/uploads/' \
  --include 'public/assets/' \
  --include 'public/assets/anchev-films-social.jpg' \
  --exclude 'public/assets/*' \
  --include 'public/media/' \
  --include 'public/media/hero-video-web.mp4' \
  --include 'public/media/experience/' \
  --include 'public/media/experience/studio-web.mp4' \
  --include 'public/media/experience/studio-mobile.mp4' \
  --include 'public/media/experience/studio-poster.jpg' \
  --include 'public/media/experience/studio-timelapse-web.mp4' \
  --include 'public/media/experience/studio-timelapse-mobile.mp4' \
  --include 'public/media/experience/studio-timelapse-poster.jpg' \
  --exclude 'public/media/experience/*' \
  --include 'public/media/studio/***' \
  --include 'public/media/projects/' \
  --include 'public/media/projects/anti-bullying/***' \
  --exclude 'public/media/projects/*' \
  --exclude 'public/media/*' \
  -e "ssh -i $(printf '%q' "$deploy_key") -p $deploy_port -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=10" \
  "$project_root/" \
  "$ssh_target:$deploy_path/"

rsync -az \
  -e "ssh -i $(printf '%q' "$deploy_key") -p $deploy_port -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=10" \
  "$project_root/data/articles.json" \
  "$ssh_target:$deploy_path/.articles-seed.json"

if [[ -n "$deploy_project_id" ]]; then
  node --input-type=module -e '
    import fs from "node:fs";
    const projects = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (!projects.some((project) => project.id === process.argv[2])) {
      throw new Error("Requested project is missing from local data.");
    }
  ' "$project_root/data/projects.json" "$deploy_project_id"
  rsync -az \
    -e "ssh -i $(printf '%q' "$deploy_key") -p $deploy_port -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=10" \
    "$project_root/data/projects.json" \
    "$ssh_target:$deploy_path/.projects-seed.json"
fi

ssh "${ssh_options[@]}" "$ssh_target" "
  set -e
  cd $remote_path
  mkdir -p data
  if [ ! -f data/articles.json ]; then
    mv .articles-seed.json data/articles.json
  else
    rm -f .articles-seed.json
  fi
  if [ -f package-lock.json ]; then
    npm ci --omit=dev
  else
    npm install --omit=dev
  fi
  if pm2 describe anchevfilms >/dev/null 2>&1; then
    pm2 delete anchevfilms
  fi
  pm2 start ecosystem.config.cjs --only anchevfilms --update-env
  pm2 save
"

if [[ -n "$deploy_project_id" ]]; then
  remote_project_id="$(printf '%q' "$deploy_project_id")"
  ssh "${ssh_options[@]}" "$ssh_target" "cd $remote_path && PROJECT_ID=$remote_project_id node --input-type=module" <<'NODE'
import fs from 'node:fs';
const seed = JSON.parse(fs.readFileSync('.projects-seed.json', 'utf8'));
const project = seed.find((entry) => entry.id === process.env.PROJECT_ID);
if (!project) throw new Error('Requested project is missing from the seed.');
const file = 'data/projects.json';
const projects = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
if (!Array.isArray(projects)) throw new Error('Live projects must be an array.');
if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.backup-${Date.now()}`);
const index = projects.findIndex((entry) => entry.id === project.id);
if (index === -1) projects.push(project);
else projects[index] = project;
fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(projects, null, 2)}\n`);
fs.renameSync(`${file}.tmp`, file);
fs.unlinkSync('.projects-seed.json');
console.log(`Published project: ${project.id}`);
NODE
fi

printf 'Deployment complete.\n'