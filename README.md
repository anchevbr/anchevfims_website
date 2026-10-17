# Anchev Films

Server-rendered Express website and a SQLite-backed content platform. English URLs remain at the root to preserve existing search value. Greek routes use `/el/`. Original project URLs, source JSON and media are preserved during import.

## Public Experience

The cinematic public site includes dedicated Work, Services, Studio, About, Contact, Press, Podcast and News destinations, with English and Greek navigation. Eight service categories have distinct detail pages; the established video-production and live-streaming URLs remain available. Real studio footage and existing production photographs are reused without inventing client work. Fullscreen galleries, work filters, reduced-motion fallbacks and an on-demand keyboard-accessible showreel progressively enhance server-rendered content.

`/news` and `/el/news` are deliberately secondary destinations. No demonstration articles are seeded. Public articles use `/news/<slug>` and `/el/news/<slug>`, independently published per language.

## Publishing News

Open `/admin` > News > New article. Set the headline, stable slug, language, publication date, category, excerpt, featured image and image alt text. Write with the rich-text toolbar, select or upload images, and optionally link a film, projects or services. Save a draft, inspect the authenticated preview, then publish or schedule with a publishing account. Editors can prepare drafts but cannot publish. Revision restoration is draft-only; unpublish cancels a schedule, and archive removes an article from the public site without discarding history.

Publication times use `NEWS_TIMEZONE` (default `Europe/Athens`), not the browser timezone. The server stores UTC instants and rejects ambiguous or nonexistent daylight-saving times. Scheduled content becomes available on the first request at or after its publication instant; no cron process or deployment is needed. See [PLATFORM.md](PLATFORM.md#news-publishing) for the lifecycle, security and rollback constraints.

## Development

Use Node 24 LTS, npm, FFmpeg and FFprobe. Install dependencies with `npm ci`.

- `npm run preview`: isolated local content copy with a test-only owner account. Never use this account or script in production.
- `npm run dev`: normal local server using your environment and persistent data.
- `npm test`: unit and integration tests with temporary databases.
- `npm run test:browser`: isolated desktop Chromium, mobile Chromium and mobile WebKit workflows with targeted axe checks; install engines with `npx playwright install chromium webkit` first.
- `npm run lint`: lint the server, platform, changed public controllers, admin and test modules.
- `npm run check:seo`: HTTP SEO checks against `CHECK_URL` (default `http://localhost:3011`).

Development serves the editable public modules directly. Production compiles minified CSS/JavaScript once at startup with the runtime esbuild dependency, serving content-hashed immutable URLs; no separate build artifact or build command is required. Use `BUNDLE_PUBLIC_ASSETS=1 npm run preview` to exercise that delivery path locally. Bundling failures prevent readiness. Licensed fonts are served from installed Fontsource packages without Google Fonts requests. Security-sensitive processing and persistence are server-only.

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

Production enquiries include optional type, dates, location and budget. Studio enquiries add crew size and technical requirements. Details are validated and retained with the message in the existing inbox. A per-submission reference prevents retry duplicates; native form submission also returns a receipt without JavaScript. No booking availability or email delivery is implied.

## Release Status

This feature branch is not deployed. See [PLATFORM.md](PLATFORM.md) for the audit, architecture decisions, CMS workflow, guarded preparation/activation procedure, evidence and remaining release blockers. Deployment preparation and activation require separate explicit approvals. Local backup and rollback tests do not replace a remote staging rehearsal. Production infrastructure changes require separate authorization.