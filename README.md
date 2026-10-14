# Anchev Films

Server-rendered Express website and a SQLite-backed content platform. English URLs remain at the root to preserve existing search value. Greek routes use `/el/`. Original project URLs, source JSON and media are preserved during import.

## Development

Use Node 24 LTS, npm, FFmpeg and FFprobe. Install dependencies with `npm ci`.

- `npm run preview`: isolated local content copy with a test-only owner account. Never use this account or script in production.
- `npm run dev`: normal local server using your environment and persistent data.
- `npm test`: unit and integration tests with temporary databases.
- `npm run test:browser`: isolated desktop/mobile Playwright and targeted axe checks; install Chromium with `npx playwright install chromium` first.
- `npm run lint`: lint the new platform, admin and test modules.
- `npm run check:seo`: HTTP SEO checks against `CHECK_URL` (default `http://localhost:3011`).

The public app does not require a bundler. Security-sensitive processing and persistence are server-only.

## Private Configuration

Create a private `.env` based on `.env.example`. Generate independent random values for `SESSION_SECRET` and `MFA_ENCRYPTION_KEY` (at least 32 characters). Production refuses to start without a session secret. MFA seeds are encrypted; losing its encryption key requires a controlled account recovery. Do not store actual credentials in the repository.

`DATA_DIR` contains the database, podcast cache, migration reports and private backups. `UPLOADS_DIR` contains original uploads and derivatives, separate from code releases. `HOST=127.0.0.1` is appropriate behind a local reverse proxy. Set `TRUST_PROXY=1` only behind a trusted, single-hop proxy that overwrites forwarding headers. HTTPS is required for production session cookies.

Set `ADMIN_EMAIL`, `ADMIN_NAME` and a unique `ADMIN_PASSWORD` of at least 14 characters in the private environment, then run `npm run admin:create`. Remove `ADMIN_PASSWORD` after setup. Later users are managed through `/admin`; existing shared-password hashes are not imported as named accounts.

## Content Import

Run `npm run migrate` against a staging copy first. The command backs up the legacy JSON, imports it transactionally into SQLite, inventories existing files, records checksums and references, and writes a private report. Re-running does not duplicate content. Missing files are reported, not deleted or silently replaced. Original media binaries never enter the database.

SQLite uses foreign keys, WAL and transactions. Published snapshots are distinct from editable drafts. Concurrent stale saves return HTTP 409 rather than overwriting another editor. Revisions and activity records persist. One application instance owns the processing queue; do not run competing workers or multiple hosts against the same local database.

## Security And Privacy

Admin APIs require named-user sessions, backend permissions and same-origin CSRF tokens. Sessions are HttpOnly, SameSite Strict, HTTPS-only in production, idle-expiring and absolutely limited to eight hours. Optional authenticator-app MFA includes one-time recovery codes. Viewer, editor, administrator and owner permissions are enforced by the backend.

Uploads are byte-validated in private temporary storage, deduplicated by SHA-256, and published under generated names. Images are pixel-limited. HTML and SVG uploads are not accepted. Media referenced by content or revisions cannot be deleted through the library. Project deletion never deletes assets.

Contact messages go to the real admin inbox, not an unconfigured email provider. The default retention is 90 days; no IP address or password is stored with a message. Optional analytics and third-party film embeds retain explicit consent/click behavior. Privacy policy and legal review remain the operator's responsibility.

## Release Status

This feature branch is not deployed. See [PLATFORM.md](PLATFORM.md) for the audit, architecture decisions, CMS workflow, guarded preparation/activation procedure, evidence and remaining release blockers. Deployment preparation and activation require separate explicit approvals. Local backup and rollback tests do not replace a remote staging rehearsal. Production infrastructure changes require separate authorization.