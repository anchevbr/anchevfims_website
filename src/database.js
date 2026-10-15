import Database from 'better-sqlite3';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { load } from 'cheerio';

const parse = (value, fallback = null) => value ? JSON.parse(value) : fallback;
const now = () => new Date().toISOString();
const conflict = () => Object.assign(new Error('This entry changed since you opened it. Reload before saving.'), { status: 409 });

export const parseInquiryRetentionDays = (value = process.env.INQUIRY_RETENTION_DAYS) => {
  const days = value === undefined || value === '' ? 90 : Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('INQUIRY_RETENTION_DAYS must be an integer between 1 and 3650.');
  return days;
};

export class ContentStore {
  constructor(directory, filename = 'content.sqlite') {
    this.inquiryRetentionDays = parseInquiryRetentionDays();
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.directory = directory;
    this.db = new Database(path.join(directory, filename));
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
    this.migrate();
  }

  migrate() {
    const version = this.db.pragma('user_version', { simple: true });
    if (version > 1) throw new Error('Database schema is newer than this application.');
    if (version === 1) return;
    this.db.transaction(() => {
      this.db.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
          password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','administrator','editor','viewer')),
          active INTEGER NOT NULL DEFAULT 1, mfa_secret TEXT, mfa_recovery TEXT, mfa_last_step INTEGER,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), expires INTEGER NOT NULL);
        CREATE INDEX sessions_expires ON sessions(expires);
        CREATE TABLE projects (
          id TEXT PRIMARY KEY, draft TEXT NOT NULL CHECK(json_valid(draft)), published TEXT CHECK(published IS NULL OR json_valid(published)),
          status TEXT NOT NULL CHECK(status IN ('draft','published','archived')), featured INTEGER NOT NULL DEFAULT 0,
          position INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1,
          published_at TEXT, updated_at TEXT NOT NULL
        );
        CREATE INDEX projects_public ON projects(status, featured DESC, position, published_at DESC);
        CREATE TABLE project_translations (
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          locale TEXT NOT NULL CHECK(locale IN ('en','el')), draft TEXT NOT NULL CHECK(json_valid(draft)),
          published TEXT CHECK(published IS NULL OR json_valid(published)),
          PRIMARY KEY(project_id, locale)
        );
        CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
        CREATE TABLE project_categories (project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, category_id TEXT REFERENCES categories(id), PRIMARY KEY(project_id,category_id));
        CREATE TABLE project_tags (project_id TEXT REFERENCES projects(id) ON DELETE CASCADE, tag_id TEXT REFERENCES tags(id), PRIMARY KEY(project_id,tag_id));
        CREATE TABLE revisions (
          id INTEGER PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
          document TEXT NOT NULL CHECK(json_valid(document)), actor_id TEXT REFERENCES users(id), created_at TEXT NOT NULL
        );
        CREATE INDEX revisions_entity ON revisions(entity_type, entity_id, id DESC);
        CREATE TABLE pages (
          id TEXT NOT NULL, locale TEXT NOT NULL CHECK(locale IN ('en','el')), draft TEXT NOT NULL CHECK(json_valid(draft)),
          published TEXT CHECK(published IS NULL OR json_valid(published)), version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL,
          PRIMARY KEY(id,locale)
        );
        CREATE TABLE articles (id TEXT PRIMARY KEY, document TEXT NOT NULL CHECK(json_valid(document)), published_at TEXT);
        CREATE TABLE clients (name TEXT PRIMARY KEY, position INTEGER NOT NULL);
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL CHECK(json_valid(value)));
        CREATE TABLE redirects (source TEXT PRIMARY KEY, target TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE media (
          id TEXT PRIMARY KEY, url TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, mime TEXT NOT NULL,
          bytes INTEGER NOT NULL, checksum TEXT UNIQUE, width INTEGER, height INTEGER, duration REAL,
          status TEXT NOT NULL CHECK(status IN ('queued','processing','ready','failed','external','missing')),
          metadata TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata)), error TEXT,
          uploaded_by TEXT REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE INDEX media_state ON media(status, created_at DESC);
        CREATE TABLE media_derivatives (
          media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE, kind TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, width INTEGER, height INTEGER, bytes INTEGER NOT NULL,
          PRIMARY KEY(media_id,kind)
        );
        CREATE TABLE media_usage (
          media_id TEXT NOT NULL REFERENCES media(id), entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, field TEXT NOT NULL,
          PRIMARY KEY(media_id,entity_type,entity_id,field)
        );
        CREATE INDEX media_usage_entity ON media_usage(entity_type, entity_id);
        CREATE TABLE jobs (
          id INTEGER PRIMARY KEY, media_id TEXT NOT NULL UNIQUE REFERENCES media(id), status TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0, error TEXT, updated_at TEXT NOT NULL
        );
        CREATE INDEX jobs_pending ON jobs(status, id);
        CREATE TABLE audit (
          id INTEGER PRIMARY KEY, actor_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL,
          entity_id TEXT, details TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details)), created_at TEXT NOT NULL
        );
        CREATE INDEX audit_recent ON audit(id DESC);
        CREATE TABLE inquiries (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '',
          message TEXT NOT NULL, locale TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','replied','spam')),
          created_at TEXT NOT NULL
        );
        CREATE INDEX inquiries_status ON inquiries(status, created_at DESC);
        PRAGMA user_version = 1;
      `);
    })();
  }

  audit(actorId, action, entityType, entityId = '', details = {}) {
    this.db.prepare('INSERT INTO audit(actor_id,action,entity_type,entity_id,details,created_at) VALUES (?,?,?,?,?,?)')
      .run(actorId || null, action, entityType, entityId, JSON.stringify(details), now());
  }

  importJson() {
    if (this.db.prepare("SELECT value FROM settings WHERE key = 'migration.json.v1'").get()) return { skipped: true };
    const read = (name, fallback) => {
      const file = path.join(this.directory, `${name}.json`);
      return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
    };
    const projects = read('projects', []);
    const articles = read('articles', []);
    const clients = read('clients', []);
    const settings = read('settings', {});
    if (![projects, articles, clients].every(Array.isArray) || !settings || Array.isArray(settings)) throw new Error('Invalid legacy content; import aborted.');
    const report = this.db.transaction(() => {
      projects.forEach((project, position) => {
        if (!project.id || !project.name) throw new Error('Legacy project is missing an ID or name.');
        if (this.db.prepare('SELECT id FROM projects WHERE id = ?').get(project.id)) throw new Error('Existing project conflicts with legacy import.');
        const document = { ...project, status: 'published', featured: position === 0, tags: project.tags || [] };
        this.db.prepare('INSERT INTO projects(id,draft,published,status,featured,position,published_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(project.id, JSON.stringify(document), JSON.stringify(document), 'published', position === 0 ? 1 : 0, position, project.publishedAt || now(), now());
        this.syncTaxonomy(document);
      });
      articles.forEach((article) => this.db.prepare('INSERT INTO articles(id,document,published_at) VALUES (?,?,?)').run(article.id, JSON.stringify(article), article.publishedAt || null));
      clients.forEach((name, position) => this.db.prepare('INSERT INTO clients(name,position) VALUES (?,?)').run(String(name), position));
      this.setSettings(settings);
      const result = { projects: projects.length, articles: articles.length, clients: clients.length, importedAt: now() };
      this.db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('migration.json.v1', JSON.stringify(result));
      this.audit(null, 'legacy.import', 'migration', 'json.v1', result);
      return result;
    })();
    return report;
  }

  projectFromRow(row, publicOnly = false, locale = 'en') {
    if (!row) return null;
    const document = parse(publicOnly ? row.published : row.draft, {});
    const translations = this.db.prepare('SELECT locale,draft,published FROM project_translations WHERE project_id = ?').all(row.id);
    const translated = translations.find((entry) => entry.locale === locale);
    return {
      ...document, ...(locale !== 'en' ? parse(publicOnly ? translated?.published : translated?.draft, {}) : {}),
      id: row.id, status: row.status, featured: Boolean(row.featured), version: row.version,
      updatedAt: row.updated_at, publishedAt: row.published_at,
      hasGreek: translations.some((entry) => entry.locale === 'el' && entry.published),
      ...(!publicOnly ? { translations: Object.fromEntries(translations.map((entry) => [entry.locale, parse(entry.draft, {})])), hasUnpublishedChanges: row.draft !== row.published } : {})
    };
  }

  projects({ publicOnly = false, locale = 'en' } = {}) {
    return this.db.prepare(`SELECT * FROM projects ${publicOnly ? "WHERE status = 'published' AND published IS NOT NULL" : ''} ORDER BY featured DESC,position,published_at DESC`)
      .all().map((row) => this.projectFromRow(row, publicOnly, locale));
  }

  project(id, options = {}) {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (options.publicOnly && row?.status !== 'published') return null;
    return this.projectFromRow(row, options.publicOnly, options.locale);
  }

  syncTaxonomy(project) {
    this.db.prepare('DELETE FROM project_categories WHERE project_id = ?').run(project.id);
    this.db.prepare('DELETE FROM project_tags WHERE project_id = ?').run(project.id);
    if (project.category) {
      const id = crypto.createHash('sha256').update(project.category).digest('hex').slice(0, 16);
      this.db.prepare('INSERT OR IGNORE INTO categories(id,name) VALUES (?,?)').run(id, project.category);
      this.db.prepare('INSERT INTO project_categories(project_id,category_id) VALUES (?,?)').run(project.id, id);
    }
    for (const tag of project.tags || []) {
      const id = crypto.createHash('sha256').update(tag).digest('hex').slice(0, 16);
      this.db.prepare('INSERT OR IGNORE INTO tags(id,name) VALUES (?,?)').run(id, tag);
      this.db.prepare('INSERT OR IGNORE INTO project_tags(project_id,tag_id) VALUES (?,?)').run(project.id, id);
    }
  }

  saveProject(input, actor, publish = false) {
    return this.db.transaction(() => {
      const current = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(input.id);
      if (current && input.version !== current.version) throw conflict();
      const { version, translations = {}, hasUnpublishedChanges, hasGreek, updatedAt, ...document } = input;
      const status = publish ? 'published' : input.status === 'archived' ? 'archived' : current?.status || 'draft';
      document.status = status;
      const payload = JSON.stringify(document);
      if (current) this.db.prepare('INSERT INTO revisions(entity_type,entity_id,document,actor_id,created_at) VALUES (?,?,?,?,?)')
        .run('project', input.id, JSON.stringify(this.project(input.id)), actor, now());
      this.db.prepare(`INSERT INTO projects(id,draft,published,status,featured,published_at,updated_at) VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET draft=excluded.draft,published=excluded.published,status=excluded.status,featured=excluded.featured,version=projects.version+1,published_at=excluded.published_at,updated_at=excluded.updated_at`)
        .run(input.id, payload, publish ? payload : current?.published || null, status, document.featured ? 1 : 0, publish ? document.publishedAt || current?.published_at || now() : current?.published_at || null, now());
      for (const [locale, translation] of Object.entries(translations)) {
        const previous = this.db.prepare('SELECT published FROM project_translations WHERE project_id=? AND locale=?').get(input.id, locale);
        const translated = JSON.stringify(translation);
        this.db.prepare('INSERT INTO project_translations(project_id,locale,draft,published) VALUES (?,?,?,?) ON CONFLICT(project_id,locale) DO UPDATE SET draft=excluded.draft,published=excluded.published')
          .run(input.id, locale, translated, publish && translation.ready ? translated : previous?.published || null);
      }
      this.syncTaxonomy(document);
      this.syncUsage('project', input.id, document, current?.published ? parse(current.published) : null);
      this.audit(actor, publish ? 'project.publish' : 'project.save', 'project', input.id);
      return this.project(input.id);
    })();
  }

  syncUsage(entityType, entityId, ...documents) {
    this.db.prepare('DELETE FROM media_usage WHERE entity_type=? AND entity_id=?').run(entityType, entityId);
    const visit = (value, field) => {
      if (typeof value === 'string') {
        if (field === 'richContent') {
          const markup = load(value);
          markup('img[src],a[href]').each((index, element) => visit(markup(element).attr('src') || markup(element).attr('href'), `richContent.${index}`));
        }
        const asset = this.db.prepare('SELECT id FROM media WHERE url=? UNION SELECT media_id AS id FROM media_derivatives WHERE url=?').get(value, value);
        if (asset) this.db.prepare('INSERT OR IGNORE INTO media_usage(media_id,entity_type,entity_id,field) VALUES (?,?,?,?)').run(asset.id, entityType, entityId, field);
      } else if (Array.isArray(value)) value.forEach((entry, index) => visit(entry, `${field}.${index}`));
      else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => visit(entry, field ? `${field}.${key}` : key));
    };
    documents.forEach((document) => visit(document, ''));
  }

  deleteProject(id, actor) {
    return this.db.transaction(() => {
      const project = this.project(id);
      if (!project) return false;
      this.db.prepare('INSERT INTO revisions(entity_type,entity_id,document,actor_id,created_at) VALUES (?,?,?,?,?)').run('project', id, JSON.stringify(project), actor, now());
      this.db.prepare('DELETE FROM projects WHERE id=?').run(id);
      this.db.prepare("DELETE FROM media_usage WHERE entity_type='project' AND entity_id=?").run(id);
      this.audit(actor, 'project.delete', 'project', id);
      return true;
    })();
  }

  settings() {
    const rows = this.db.prepare("SELECT key,value FROM settings WHERE key NOT LIKE 'migration.%' AND key NOT LIKE 'system.settings-%'").all();
    return Object.fromEntries(rows.map((row) => [row.key, parse(row.value)]));
  }

  settingsVersion() {
    return parse(this.db.prepare("SELECT value FROM settings WHERE key='system.settings-version'").get()?.value, 0);
  }

  adminSettings() {
    const draft = parse(this.db.prepare("SELECT value FROM settings WHERE key='system.settings-draft'").get()?.value);
    return { ...(draft || this.settings()), version: this.settingsVersion(), hasUnpublishedChanges: Boolean(draft) };
  }

  saveSettingsDraft(settings, actor, version, action = 'settings.draft.save') {
    return this.db.transaction(() => {
      if (version !== this.settingsVersion()) throw conflict();
      const { version: previousVersion, hasUnpublishedChanges, ...current } = this.adminSettings();
      this.db.prepare('INSERT INTO revisions(entity_type,entity_id,document,actor_id,created_at) VALUES (?,?,?,?,?)').run('settings', 'site', JSON.stringify(current), actor, now());
      const statement = this.db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      statement.run('system.settings-draft', JSON.stringify(settings));
      statement.run('system.settings-version', JSON.stringify(version + 1));
      this.syncUsage('settings', 'site-draft', settings);
      this.audit(actor, action, 'settings', 'site');
      return this.adminSettings();
    })();
  }

  publishSettings(actor, version) {
    return this.db.transaction(() => {
      if (version !== this.settingsVersion()) throw conflict();
      const draft = parse(this.db.prepare("SELECT value FROM settings WHERE key='system.settings-draft'").get()?.value);
      if (!draft) throw Object.assign(new Error('No saved settings draft to publish.'), { status: 409 });
      this.setSettings(draft, actor, version, 'settings.publish', true);
      this.db.prepare("DELETE FROM settings WHERE key='system.settings-draft'").run();
      this.db.prepare("DELETE FROM media_usage WHERE entity_type='settings' AND entity_id='site-draft'").run();
      return this.adminSettings();
    })();
  }

  discardSettingsDraft(actor, version) {
    return this.db.transaction(() => {
      if (version !== this.settingsVersion()) throw conflict();
      const draft = parse(this.db.prepare("SELECT value FROM settings WHERE key='system.settings-draft'").get()?.value);
      if (!draft) throw Object.assign(new Error('No saved settings draft to discard.'), { status: 409 });
      this.db.prepare('INSERT INTO revisions(entity_type,entity_id,document,actor_id,created_at) VALUES (?,?,?,?,?)').run('settings', 'site', JSON.stringify(draft), actor, now());
      this.db.prepare("DELETE FROM settings WHERE key='system.settings-draft'").run();
      this.db.prepare("UPDATE settings SET value=? WHERE key='system.settings-version'").run(JSON.stringify(version + 1));
      this.db.prepare("DELETE FROM media_usage WHERE entity_type='settings' AND entity_id='site-draft'").run();
      this.audit(actor, 'settings.draft.discard', 'settings', 'site');
      return this.adminSettings();
    })();
  }

  setSettings(settings, actor = null, version, action = 'settings.save', replace = false) {
    return this.db.transaction(() => {
      const currentVersion = this.settingsVersion();
      if (actor && version !== currentVersion) throw conflict();
      const current = this.settings();
      const merged = replace ? settings : { ...current, ...settings };
      if (!actor && JSON.stringify(current) === JSON.stringify(merged)) return this.adminSettings();
      if (actor) this.db.prepare('INSERT INTO revisions(entity_type,entity_id,document,actor_id,created_at) VALUES (?,?,?,?,?)').run('settings', 'site', JSON.stringify(current), actor, now());
      if (replace) this.db.prepare("DELETE FROM settings WHERE key NOT LIKE 'migration.%' AND key NOT LIKE 'system.settings-%'").run();
      const statement = this.db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      Object.entries(settings).forEach(([key, value]) => statement.run(key, JSON.stringify(value)));
      statement.run('system.settings-version', JSON.stringify(currentVersion + 1));
      this.syncUsage('settings', 'site', merged);
      if (actor) this.audit(actor, action, 'settings', 'site');
      return this.adminSettings();
    })();
  }

  clients() { return this.db.prepare('SELECT name FROM clients ORDER BY position').all().map((row) => row.name); }
  articles() { return this.db.prepare('SELECT document FROM articles ORDER BY published_at DESC').all().map((row) => parse(row.document)); }
  news({ locale = 'en', publicOnly = true, timestamp = Date.now() } = {}) {
    return this.db.prepare("SELECT id FROM pages WHERE locale=? AND id LIKE 'news-%'").all(locale)
      .map(({ id }) => this.page(id, locale, publicOnly, timestamp)).filter((page) => page?.kind === 'news')
      .sort((first, second) => String(second.publicationDate || '').localeCompare(String(first.publicationDate || '')));
  }
  page(id, locale = 'en', publicOnly = false, timestamp = Date.now()) {
    const row = this.db.prepare('SELECT * FROM pages WHERE id=? AND locale=?').get(id, locale);
    if (!row || (publicOnly && !row.published)) return null;
    const document = parse(publicOnly ? row.published : row.draft, {});
    const snapshot = parse(row.published);
    if (publicOnly && document.kind === 'news' && (!Number.isFinite(Date.parse(document.publicationDate)) || Date.parse(document.publicationDate) > timestamp)) return null;
    const status = row.published ? (snapshot?.kind === 'news' && Date.parse(snapshot.publicationDate) > timestamp ? 'scheduled' : 'published') : document.status === 'archived' ? 'archived' : 'draft';
    return { ...document, id, locale, version: row.version, updatedAt: publicOnly ? document.modifiedAt || row.updated_at : row.updated_at, isPublished: Boolean(row.published), ...(document.kind === 'news' ? { status } : {}) };
  }
  savePage(input, actor, publish = false) {
    return this.db.transaction(() => {
      const current = this.db.prepare('SELECT * FROM pages WHERE id=? AND locale=?').get(input.id, input.locale);
      if (current && current.version !== input.version) throw conflict();
      if (current) this.db.prepare('INSERT INTO revisions(entity_type,entity_id,document,actor_id,created_at) VALUES (?,?,?,?,?)').run('page', `${input.locale}:${input.id}`, current.draft, actor, now());
      const { version, updatedAt, isPublished, ...document } = input;
      if (document.kind === 'news') {
        document.createdAt = parse(current?.draft)?.createdAt || now();
        document.modifiedAt = now();
      }
      const payload = JSON.stringify(document);
      const published = publish ? payload : current?.published || null;
      this.db.prepare('INSERT INTO pages(id,locale,draft,published,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id,locale) DO UPDATE SET draft=excluded.draft,published=excluded.published,version=pages.version+1,updated_at=excluded.updated_at')
        .run(input.id, input.locale, payload, published, now());
      this.syncUsage('page', `${input.locale}:${input.id}`, document, parse(published, null));
      this.audit(actor, publish ? 'page.publish' : 'page.save', 'page', `${input.locale}:${input.id}`);
      return this.page(input.id, input.locale);
    })();
  }
  retirePage(id, locale, version, actor, remove = false, archive = false) {
    return this.db.transaction(() => {
      const current = this.db.prepare('SELECT * FROM pages WHERE id=? AND locale=?').get(id, locale);
      if (!current) throw Object.assign(new Error('Page not found.'), { status: 404 });
      if (current.version !== version) throw conflict();
      for (const document of new Set([current.draft, current.published].filter(Boolean))) {
        this.db.prepare('INSERT INTO revisions(entity_type,entity_id,document,actor_id,created_at) VALUES (?,?,?,?,?)').run('page', `${locale}:${id}`, document, actor, now());
      }
      if (remove) {
        this.db.prepare('DELETE FROM pages WHERE id=? AND locale=?').run(id, locale);
        this.db.prepare('DELETE FROM media_usage WHERE entity_type=? AND entity_id=?').run('page', `${locale}:${id}`);
      } else {
        const draft = parse(current.draft);
        if (draft.kind === 'news') draft.status = archive ? 'archived' : 'draft';
        this.db.prepare('UPDATE pages SET published=NULL,draft=?,version=version+1,updated_at=? WHERE id=? AND locale=?').run(JSON.stringify(draft), now(), id, locale);
        this.syncUsage('page', `${locale}:${id}`, draft);
      }
      this.audit(actor, remove ? 'page.delete' : archive ? 'page.archive' : 'page.unpublish', 'page', `${locale}:${id}`);
      return this.page(id, locale);
    })();
  }
  media(id) {
    const row = this.db.prepare('SELECT * FROM media WHERE id=?').get(id);
    return row ? { ...row, metadata: parse(row.metadata, {}), derivatives: this.db.prepare('SELECT * FROM media_derivatives WHERE media_id=?').all(id), usage: this.db.prepare('SELECT * FROM media_usage WHERE media_id=?').all(id) } : null;
  }
  pruneInquiries(timestamp = Date.now()) {
    return this.db.prepare('DELETE FROM inquiries WHERE created_at<?').run(new Date(timestamp - this.inquiryRetentionDays * 86400000).toISOString()).changes;
  }

  startInquiryRetention() {
    clearInterval(this.retentionTimer);
    this.pruneInquiries();
    this.retentionTimer = setInterval(() => {
      try { this.pruneInquiries(); }
      catch (error) { console.error(JSON.stringify({ event: 'inquiries.retention.failed', code: error.code || error.name })); }
    }, 3600000);
    this.retentionTimer.unref?.();
  }

  close() { clearInterval(this.retentionTimer); this.db.close(); }
}