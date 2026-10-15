import express from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { asyncRoute, createUser, hashPassword, publicUser, requirePermission, userSchema } from './auth.js';
import { assetUrl, externalUrl, text, slug, can, safeUrl, sanitizeNewsContent } from './security.js';
import { homepageFields } from '../public/scripts/modules/localization.js';
import { sitePageTemplates } from './public-pages.js';
import { newsCategories, newsTimeZone, publicationInstant } from './news.js';
import { servicePages } from '../public/scripts/modules/service-pages.js';

const shortText = z.string().trim().max(250);
export const seoSchema = z.object({
  title: z.string().trim().max(70).default(''), description: z.string().trim().max(180).default(''),
  image: assetUrl.default(''), noindex: z.boolean().default(false)
}).default({ title: '', description: '', image: '', noindex: false });
const translationSchema = z.object({
  name: shortText.default(''), note: text.default(''), brief: text.default(''), approach: text.default(''),
  production: text.default(''), category: shortText.default(''), services: z.array(shortText).max(30).default([]),
  deliverables: z.array(shortText).max(30).default([]), seo: seoSchema, ready: z.boolean().default(false)
}).refine((value) => !value.ready || Boolean(value.name && (value.brief || value.note)), 'A published translation requires a title and a description.');
export const projectSchema = z.object({
  id: slug, name: shortText.min(1), client: shortText.default(''), category: shortText.default(''), year: z.string().max(4).default(''),
  status: z.enum(['draft', 'published', 'archived']).default('draft'), featured: z.boolean().default(false),
  version: z.number().int().positive().optional(), publishedAt: z.string().max(40).nullable().optional(),
  link: externalUrl.default(''), thumbnail: assetUrl.default(''), video: assetUrl.default(''), preview: assetUrl.default(''),
  behindFrame: assetUrl.default(''), behindVideo: assetUrl.default(''), pressLink: externalUrl.default(''), pressTitle: shortText.default(''),
  location: shortText.default(''), duration: shortText.default(''), director: shortText.default(''), producer: shortText.default(''), dop: shortText.default(''),
  note: text.default(''), brief: text.default(''), approach: text.default(''), production: text.default(''),
  frames: z.array(assetUrl).max(100).default([]), services: z.array(shortText).max(30).default([]), deliverables: z.array(shortText).max(30).default([]),
  tags: z.array(shortText).max(30).default([]),
  credits: z.array(z.object({ role: shortText, name: shortText })).max(100).default([]),
  seo: seoSchema, translations: z.object({ el: translationSchema.optional() }).default({})
});
const pageSchema = z.object({
  id: slug, locale: z.enum(['en', 'el']), version: z.number().int().positive().optional(),
  heading: shortText.min(1), intro: text.default(''), body: text.default(''),
  blocks: z.array(z.object({ type: z.enum(['text', 'image', 'video', 'link', 'fact']), title: shortText.default(''), text: text.default(''), url: assetUrl.default(''), alt: shortText.default('') })).max(50).default([]),
  seo: seoSchema, kind: z.enum(['page', 'news']).default('page'),
  publicationDate: z.union([z.literal(''), z.iso.datetime({ offset: true })]).default(''),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('draft'),
  category: z.enum(['company', 'collaborations', 'productions', 'behind-the-scenes', 'studio', 'press']).default('company'),
  author: shortText.default('Anchev Films'), thumbnail: assetUrl.default(''), imageAlt: shortText.default(''),
  richContent: z.string().max(120000).transform(sanitizeNewsContent).default(''),
  video: assetUrl.default(''), relatedProjects: z.array(slug).max(20).default([]), relatedServices: z.array(slug).max(12).default([])
}).refine((page) => page.kind === 'news' ? /^news-[a-z0-9][a-z0-9-]*$/.test(page.id) : !page.id.startsWith('news-'), 'News identifiers must start with news- followed by a slug; that prefix is reserved for news.');
const homepageCopySchema = z.object(Object.fromEntries(homepageFields.map((field) => [field.key, z.string().trim().max(field.area ? 2000 : 250).optional()])));
export const settingsSchema = z.object({
  videoSource: assetUrl, mobileVideoSource: assetUrl, showreelSource: assetUrl,
  contact: z.object({ email: z.email().max(254), phone: z.string().max(60), location: shortText }),
  social: z.array(z.object({ label: shortText.min(1), href: externalUrl })).max(20),
  seo: seoSchema.optional(),
  homepage: z.object({ en: homepageCopySchema.optional(), el: homepageCopySchema.optional() }).optional()
});
const articleSchema = z.object({ id: slug, title: shortText.min(1), publisher: shortText, publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), url: externalUrl.refine(Boolean), summary: text, language: z.enum(['en', 'el']) });

export const installAdminApi = (app, store) => {
  const router = express.Router();
  const read = requirePermission('read');
  const write = requirePermission('write');
  const publish = requirePermission('publish');
  router.use(read);
  router.get('/page-templates', (_req, res) => res.json({ pages: sitePageTemplates() }));
  router.get('/verify', (_req, res) => res.json({ ok: true }));
  router.get('/dashboard', (_req, res) => {
    const count = (table, condition = '') => store.db.prepare(`SELECT count(*) AS total FROM ${table} ${condition}`).get().total;
    res.json({
      projects: count('projects'), published: count('projects', "WHERE status='published'"), drafts: count('projects', "WHERE status='draft'"),
      media: count('media'), mediaBytes: store.db.prepare('SELECT coalesce(sum(bytes),0) AS total FROM media').get().total,
      failedJobs: count('jobs', "WHERE status='failed'"), inquiries: can(_req.user.role, 'inquiries') ? count('inquiries', "WHERE status='new'") : null,
      activity: store.db.prepare('SELECT audit.id,audit.action,audit.entity_type,audit.entity_id,audit.created_at,users.name AS actor FROM audit LEFT JOIN users ON users.id=audit.actor_id ORDER BY audit.id DESC LIMIT 12').all(),
      system: { database: store.db.pragma('integrity_check', { simple: true }) === 'ok', schema: store.db.pragma('user_version', { simple: true }), release: process.env.RELEASE_VERSION || 'development' }
    });
  });
  router.get('/projects', (_req, res) => res.json({ projects: store.projects() }));
  router.post('/projects', write, (req, res, next) => {
    try {
      const project = projectSchema.parse(req.body);
      const publishing = req.body.publish === true;
      if ((publishing || project.status === 'archived') && !can(req.user.role, 'publish')) return res.status(403).json({ error: 'Publishing and archiving require an administrator.' });
      const saved = store.saveProject(project, req.user.id, publishing);
      res.json({ saved, projects: store.projects() });
    } catch (error) { next(error); }
  });
  router.post('/projects/:id/unpublish', publish, (req, res) => {
    const current = store.project(req.params.id);
    if (!current) return res.status(404).json({ error: 'Project not found.' });
    store.db.prepare("UPDATE projects SET status='draft',version=version+1,updated_at=? WHERE id=?").run(new Date().toISOString(), req.params.id);
    store.audit(req.user.id, 'project.unpublish', 'project', req.params.id);
    res.json({ saved: store.project(req.params.id) });
  });
  router.post('/projects/:id/duplicate', write, (req, res, next) => {
    try {
      const current = store.project(req.params.id);
      if (!current) return res.status(404).json({ error: 'Project not found.' });
      const input = projectSchema.parse({ ...current, id: `${current.id.slice(0, 75)}-copy-${crypto.randomBytes(3).toString('hex')}`, name: `${current.name} (copy)`, version: undefined, status: 'draft', featured: false, publishedAt: null });
      res.status(201).json({ saved: store.saveProject(input, req.user.id) });
    } catch (error) { next(error); }
  });
  router.delete('/projects/:id', publish, (req, res) => {
    if (!store.deleteProject(req.params.id, req.user.id)) return res.status(404).json({ error: 'Project not found.' });
    res.json({ deleted: req.params.id, projects: store.projects() });
  });
  router.get('/projects/:id/revisions', (req, res) => res.json({ revisions: store.db.prepare("SELECT id,created_at,actor_id FROM revisions WHERE entity_type='project' AND entity_id=? ORDER BY id DESC LIMIT 50").all(req.params.id) }));
  router.post('/projects/:id/revisions/:revision/restore', write, (req, res, next) => {
    try {
      const revision = store.db.prepare("SELECT document FROM revisions WHERE id=? AND entity_type='project' AND entity_id=?").get(req.params.revision, req.params.id);
      if (!revision) return res.status(404).json({ error: 'Revision not found.' });
      const current = store.project(req.params.id);
      const document = projectSchema.parse({ ...JSON.parse(revision.document), version: current?.version, status: current?.status || 'draft' });
      res.json({ saved: store.saveProject(document, req.user.id) });
    } catch (error) { next(error); }
  });
  router.get('/projects/:id/preview', (req, res) => {
    const project = store.project(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json({ project });
  });
  router.get('/clients', (_req, res) => res.json({ clients: store.clients() }));
  router.post('/clients', requirePermission('settings'), (req, res, next) => {
    try {
      const clients = z.array(shortText.min(1)).max(500).parse(req.body.clients);
      store.db.transaction(() => {
        store.db.prepare('DELETE FROM clients').run();
        [...new Set(clients)].forEach((name, index) => store.db.prepare('INSERT INTO clients(name,position) VALUES (?,?)').run(name, index));
        store.audit(req.user.id, 'clients.save', 'clients');
      })();
      res.json({ clients: store.clients() });
    } catch (error) { next(error); }
  });
  router.get('/articles', (_req, res) => res.json({ articles: store.articles() }));
  router.post('/articles', publish, (req, res, next) => {
    try {
      const article = articleSchema.parse(req.body);
      store.db.prepare('INSERT INTO articles(id,document,published_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document,published_at=excluded.published_at').run(article.id, JSON.stringify(article), article.publishedAt);
      store.audit(req.user.id, 'article.save', 'article', article.id);
      res.json({ saved: article, articles: store.articles() });
    } catch (error) { next(error); }
  });
  router.delete('/articles/:id', publish, (req, res) => {
    store.db.prepare('DELETE FROM articles WHERE id=?').run(req.params.id);
    store.audit(req.user.id, 'article.delete', 'article', req.params.id);
    res.json({ articles: store.articles() });
  });
  router.get('/settings', (_req, res) => res.json(store.adminSettings()));
  router.post('/settings', requirePermission('settings'), (req, res, next) => {
    try { const settings = settingsSchema.parse(req.body); const version = z.number().int().nonnegative().parse(req.body.version); res.json(store.saveSettingsDraft(settings, req.user.id, version)); }
    catch (error) { next(error); }
  });
  router.get('/settings/revisions', (_req, res) => res.json({ revisions: store.db.prepare("SELECT id,actor_id,created_at FROM revisions WHERE entity_type='settings' AND entity_id='site' ORDER BY id DESC LIMIT 100").all() }));
  router.post('/settings/publish', requirePermission('settings'), (req, res, next) => {
    try { res.json(store.publishSettings(req.user.id, z.number().int().nonnegative().parse(req.body.version))); }
    catch (error) { next(error); }
  });
  router.post('/settings/discard', requirePermission('settings'), (req, res, next) => {
    try { res.json(store.discardSettingsDraft(req.user.id, z.number().int().nonnegative().parse(req.body.version))); }
    catch (error) { next(error); }
  });
  router.post('/settings/revisions/:revision/restore', requirePermission('settings'), (req, res, next) => {
    try {
      const version = z.number().int().nonnegative().parse(req.body.version);
      const revision = store.db.prepare("SELECT document FROM revisions WHERE id=? AND entity_type='settings' AND entity_id='site'").get(req.params.revision);
      if (!revision) return res.status(404).json({ error: 'Settings revision not found.' });
      res.json(store.saveSettingsDraft(settingsSchema.parse(JSON.parse(revision.document)), req.user.id, version, 'settings.draft.restore'));
    } catch (error) { next(error); }
  });
  router.get('/pages', (_req, res) => res.json({ pages: store.db.prepare('SELECT id,locale,version,updated_at,published IS NOT NULL AS isPublished FROM pages ORDER BY id,locale').all().map((row) => ({ ...store.page(row.id, row.locale), isPublished: Boolean(row.isPublished) })) }));
  router.get('/news', (_req, res) => res.json({ news: ['en', 'el'].flatMap((locale) => store.news({ locale, publicOnly: false })), timeZone: newsTimeZone, categories: newsCategories, services: servicePages.map((service) => ({ slug: service.slug, title: service.en.title })) }));
  router.post(['/pages', '/news'], write, (req, res, next) => {
    try {
      const input = req.body.publicationLocal !== undefined ? { ...req.body, publicationDate: publicationInstant(z.string().max(30).parse(req.body.publicationLocal)) } : req.body;
      const page = pageSchema.parse(input);
      if (req.path === '/news' && page.kind !== 'news') return res.status(400).json({ error: 'Use a news document.' });
      if (req.body.publish && !can(req.user.role, 'publish')) return res.status(403).json({ error: 'Publishing requires an administrator.' });
      if (page.kind === 'news' && req.body.publish && (!page.publicationDate || !page.thumbnail || !page.imageAlt || !(page.richContent || page.body))) return res.status(400).json({ error: 'Publication needs a date with timezone, a featured image with alt text, and article content.' });
      res.json({ saved: store.savePage(page, req.user.id, Boolean(req.body.publish)) });
    } catch (error) { next(error); }
  });
  router.get('/pages/:locale/:id/revisions', (req, res) => {
    res.json({ revisions: store.db.prepare('SELECT id,created_at FROM revisions WHERE entity_type=? AND entity_id=? ORDER BY id DESC LIMIT 100').all('page', `${req.params.locale}:${req.params.id}`) });
  });
  router.post('/pages/:locale/:id/revisions/:revision/restore', write, (req, res, next) => {
    try {
      const current = store.page(req.params.id, req.params.locale);
      const revision = store.db.prepare('SELECT document FROM revisions WHERE id=? AND entity_type=? AND entity_id=?').get(req.params.revision, 'page', `${req.params.locale}:${req.params.id}`);
      if (!current || !revision) return res.status(404).json({ error: 'Page or revision not found.' });
      if (req.body.version !== current.version) return res.status(409).json({ error: 'This page changed. Reload before restoring.' });
      const document = pageSchema.parse({ ...JSON.parse(revision.document), id: current.id, locale: current.locale, version: current.version });
      res.json({ saved: store.savePage(document, req.user.id) });
    } catch (error) { next(error); }
  });
  router.post('/pages/:locale/:id/unpublish', publish, (req, res, next) => {
    try { res.json({ saved: store.retirePage(req.params.id, req.params.locale, req.body.version, req.user.id) }); }
    catch (error) { next(error); }
  });
  router.post('/pages/:locale/:id/archive', publish, (req, res, next) => {
    try { res.json({ saved: store.retirePage(req.params.id, req.params.locale, req.body.version, req.user.id, false, true) }); }
    catch (error) { next(error); }
  });
  router.delete('/pages/:locale/:id', publish, (req, res, next) => {
    try { store.retirePage(req.params.id, req.params.locale, req.body.version, req.user.id, true); res.json({ ok: true }); }
    catch (error) { next(error); }
  });
  router.get('/seo', (_req, res) => res.json({
    projects: store.projects().map((project) => ({ id: project.id, name: project.name, status: project.status, seo: project.seo || {}, hasGreek: project.hasGreek })),
    redirects: store.db.prepare('SELECT * FROM redirects ORDER BY source').all(),
    pages: store.db.prepare('SELECT id,locale,published FROM pages WHERE published IS NOT NULL').all().map((page) => ({ id: page.id, locale: page.locale, seo: JSON.parse(page.published).seo || {} }))
  }));
  router.post('/redirects', requirePermission('settings'), (req, res, next) => {
    try {
      const { source, target } = z.object({ source: z.string().max(250), target: z.string().max(250) }).parse(req.body);
      const reserved = /^\/(?:api|admin|health|uploads|media|assets|scripts|styles|vendor)(?:\/|$)/;
      if (!safeUrl(source) || !safeUrl(target) || !source.startsWith('/') || !target.startsWith('/') || source === target || /[?#]/.test(source + target) || reserved.test(source) || reserved.test(target)) throw Object.assign(new Error('Use distinct local page paths outside system routes.'), { status: 400 });
      if (store.db.prepare('SELECT source FROM redirects WHERE source=? OR target=?').get(target, source)) throw Object.assign(new Error('Redirect chains and loops are not allowed.'), { status: 400 });
      store.db.prepare('INSERT INTO redirects(source,target,created_at) VALUES (?,?,?) ON CONFLICT(source) DO UPDATE SET target=excluded.target').run(source, target, new Date().toISOString());
      store.audit(req.user.id, 'redirect.save', 'redirect', source);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
  router.delete('/redirects', requirePermission('settings'), (req, res) => {
    store.db.prepare('DELETE FROM redirects WHERE source=?').run(String(req.body.source || ''));
    store.audit(req.user.id, 'redirect.delete', 'redirect', String(req.body.source || ''));
    res.json({ ok: true });
  });
  router.get('/inquiries', requirePermission('inquiries'), (req, res) => {
    store.pruneInquiries();
    res.json({ inquiries: store.db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 500').all(), retentionDays: store.inquiryRetentionDays });
  });
  router.patch('/inquiries/:id', requirePermission('inquiries'), (req, res, next) => {
    try {
      const status = z.enum(['new', 'read', 'replied', 'spam']).parse(req.body.status);
      store.db.prepare('UPDATE inquiries SET status=? WHERE id=?').run(status, req.params.id);
      store.audit(req.user.id, 'inquiry.status', 'inquiry', req.params.id, { status });
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
  router.delete('/inquiries/:id', requirePermission('inquiries'), (req, res) => {
    store.db.prepare('DELETE FROM inquiries WHERE id=?').run(req.params.id);
    store.audit(req.user.id, 'inquiry.delete', 'inquiry', req.params.id);
    res.json({ ok: true });
  });
  router.get('/users', requirePermission('users'), (_req, res) => res.json({ users: store.db.prepare('SELECT * FROM users ORDER BY created_at').all().map(publicUser) }));
  router.post('/users', requirePermission('users'), asyncRoute(async (req, res) => res.status(201).json({ user: await createUser(store, req.body, req.user.id) })));
  router.patch('/users/:id', requirePermission('users'), asyncRoute(async (req, res) => {
    const input = userSchema.parse(req.body);
    const current = store.db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'User not found.' });
    if (current.id === req.user.id && (!input.active || input.role !== 'owner')) return res.status(400).json({ error: 'You cannot deactivate or demote your own owner account.' });
    if (current.role === 'owner' && (!input.active || input.role !== 'owner') && store.db.prepare("SELECT count(*) AS total FROM users WHERE role='owner' AND active=1").get().total <= 1) return res.status(400).json({ error: 'At least one active owner is required.' });
    const password = input.password ? await hashPassword(input.password) : current.password_hash;
    store.db.prepare('UPDATE users SET email=?,name=?,role=?,active=?,password_hash=?,updated_at=? WHERE id=?').run(input.email, input.name, input.role, input.active ? 1 : 0, password, new Date().toISOString(), current.id);
    store.db.prepare("DELETE FROM sessions WHERE json_extract(data,'$.userId')=? AND id<>?").run(current.id, req.sessionID);
    store.audit(req.user.id, 'user.update', 'user', current.id);
    res.json({ user: publicUser(store.db.prepare('SELECT * FROM users WHERE id=?').get(current.id)) });
  }));
  router.get('/activity', (req, res) => {
    const offset = Math.max(0, Math.min(1000000, Number(req.query.offset) || 0));
    res.json({ activity: store.db.prepare('SELECT audit.*,users.name AS actor FROM audit LEFT JOIN users ON users.id=audit.actor_id ORDER BY audit.id DESC LIMIT 50 OFFSET ?').all(offset).map((entry) => ({ ...entry, details: JSON.parse(entry.details) })) });
  });
  app.use('/api/admin', router);
};