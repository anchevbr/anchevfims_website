# Search Visibility Follow-Up

## Cinematic Redesign Candidate

The dedicated `feat/cinematic-news-redesign` branch builds on the unmerged platform candidate, not the production release described below. It is intended as a dependent PR against `feat/platform-hardening` (PR #1). No production deployment, main merge, live content replacement or infrastructure change is authorized by this work.

The new public hierarchy has bilingual `/work`, `/services`, `/about`, `/contact`, `/press`, `/podcast` and secondary `/news` indexes, plus existing Studio, project and podcast episode URLs. Eight main service categories have distinct substantive English/Greek pages: commercial production, branded content, corporate video, film/documentary production, events/live production, production services in Greece, post-production and photography. Existing `/services/video-production-athens` and `/services/live-streaming-athens` destinations remain valid, not redirected into an unrelated page. Published Contact/About CMS aliases now redirect to their dedicated canonical destinations; homepage section anchors still work.

News uses `/news/<slug>` and `/el/news/<slug>`. Only due published snapshots are readable or listed; drafts, schedules, previews, archived and noindex stories are excluded as appropriate. Article metadata includes published/modified dates, canonical/social values, BlogPosting and breadcrumbs. Published language counterparts receive reciprocal alternates. There is no fabricated seed content or empty category-archive expansion. `/pages/news-*` aliases redirect only for due public documents and are absent from the sitemap. Existing external press coverage stays separate from original News.

`CHECK_URL=http://localhost:3016 npm run check:seo` passes 40 canonical URLs in the isolated bundled preview, with distinct titles, one H1, descriptions, language pairs, JSON-LD, sitemap membership, unique sitemap URLs, slash redirects/query preservation and genuine noindex 404s. Due articles are automatically included when present; draft/scheduled article isolation and exact publication boundaries are independently covered by server/database/API tests. Public HTML, News API and sitemap are no-store so a schedule does not require an application restart or stale-cache purge.

Standard sequential Lighthouse lab measurements for this candidate: English mobile 95/100/100/100, Greek mobile 93/100/100/100, desktop 100/100/100/100 (performance/accessibility/best practices/SEO). Mobile LCP is 2.9 s in both languages, still above 2.5 s; desktop LCP is 0.6 s. These results do not certify production Core Web Vitals, rankings, rich-result eligibility or indexing. Full implementation/test evidence and remaining staging/editorial/legal gates are in [PLATFORM.md](PLATFORM.md).

## Implemented

- Four server-rendered service pages under `/services/`: video production in Athens, corporate video production, production services in Greece, and event filming/live streaming.
- Substantive Greek equivalents under `/el/services/` and a Greek studio page at `/el/studio`.
- Unique titles, descriptions and H1s, self-canonicals, language metadata, reciprocal English/Greek hreflang, structured data and sitemap entries.
- Crawlable homepage, service, studio and case-study links. Production examples use existing work only; no corporate or live-event client results are invented.
- Permanent trailing-slash redirects with query strings preserved. Private `/studio/` and `/api/` robots exclusions remain intact.
- Verified main-film VideoObject upload date, duration, thumbnail and embed URL. Click-to-load playback remains unchanged for privacy. Schema does not guarantee video indexing.
- Studio copy distinguishes the site's Anchev Studio name from the Hologram Studio Maps listing without asserting venue ownership.
- RSS-backed podcast episode pages at `/podcast/:id` include feed descriptions, publication dates, native audio players, individual metadata and sitemap entries. Homepage episode titles link to them.
- The last successful podcast feed is saved privately in `data/podcast-cache.json`. Cached content is served immediately while the feed refreshes in the background, keeping public pages available through RSS outages.
- The anti-bullying case study includes the verified Greek film title as readable text and a schema alternate name.
- Server dependencies are locked to patched compatible releases. `npm audit --omit=dev` reported zero known vulnerabilities after the update.

## Release

Published to `https://anchevfilms.com` on 10 October 2026. The live sitemap initially contained 13 public URLs, all passing the HTTP SEO acceptance checks. Live projects, clients, settings and uploads were preserved; a backup of the previous code and data was created before deployment.

Desktop and mobile layouts were checked down to 320px for the Greek service and podcast content. Podcast pages remained available in an unavailable-feed test; cached HTML returned in 36 ms locally. This is a local response-time check, not a field Core Web Vitals measurement.

## Local Verification

Start `PORT=3011 npm run dev`, then run `npm run check:seo`.
Use `CHECK_URL=http://localhost:3000 node scripts/check-seo.mjs` for another preview port.
The check reads the live sitemap and verifies initial HTML, metadata, language pairs, JSON-LD, redirects and missing-page status.

## Admin And Deployment Configuration

The platform feature branch replaces shared-secret authentication with named users, session cookies, backend permissions, CSRF and optional MFA. Configure private `SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, HTTPS `SITE_URL` and persistent storage; use `npm run admin:create` for the first owner. Local environment files are ignored by Git and loaded explicitly by the documented Node commands. Release preparation and activation are separately approval-gated; see [PLATFORM.md](PLATFORM.md). This branch has not been deployed, and the earlier live release notes below do not certify it.

The oversized original `public/media/experience/anchev_studio_v1.mp4` is excluded from Git. The optimized studio videos remain included.

## Account And Editorial Tasks

1. After deployment, confirm `https://anchevfilms.com/sitemap.xml` in Search Console. Inspect every sitemap URL for indexed state, Google-selected canonical, last crawl and fetch status. A live test passing does not prove inclusion.
2. Export 28-day and 90-day Performance data by query, page and country. Separate branded from non-branded searches and record clicks, impressions, CTR and average position. Do not treat the audit's public-search results as Google ranks.
3. Review the new English and Greek copy before publication, especially live-production scope and venue arrangements. Confirm availability and technical requirements per enquiry.
4. Supply approved projects with brief, production role, location, deliverables and cleared media. Do not turn client names into case studies without that evidence.
5. Enrich the RSS-backed podcast pages with approved chapters or edited transcripts when available. Add original production/press stories with information beyond existing case studies. Link to publications; do not copy their articles.
6. Request editorially appropriate links from TO VIMA and existing partner credits. Confirm the venue name and business-profile relationship with the responsible operator before editing Maps profiles.
7. Inspect rendered film playback and Search Console's Video Indexing report; run Google's Rich Results Test on the deployed project page. The privacy-preserving player loads after a click, so video-result eligibility remains unverified. Add schema for other videos only with verified publication dates and media URLs.
8. Obtain desktop/mobile PageSpeed or Lighthouse measurements and field Core Web Vitals before performance tuning. Use a location-capable SERP provider for regional rankings.

## Partner Link Request

Use this for existing editorial or partner relationships; review the wording before sending:

> Hello, thank you for covering or crediting our production. Could you link the existing Anchev Films mention to the matching production page, https://anchevfilms.com/work/anti-bullying, so readers can find the film, production details and credits? For a general company credit, our website is https://anchevfilms.com/. Please use whichever destination best fits your page.

These changes prepare pages for discovery, not guaranteed rankings. Authenticated Google checks and external outreach remain separate steps.