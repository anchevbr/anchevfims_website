import { escapeHtml, safeExternalUrl } from '/scripts/modules/content-markup.js';
import { homepageFields } from '/scripts/modules/localization.js';

const root = document.getElementById('console-root');
const dialog = document.getElementById('console-dialog');
const state = { user: null, csrf: '', view: 'dashboard', projects: [], project: null, page: null, media: [], selected: new Set(), dirty: false, mediaPage: 1, mediaQuery: '', mediaType: '', unused: false, picker: null, autosave: false };
const can = (permission) => ({ owner: ['read', 'write', 'publish', 'media', 'inquiries', 'settings', 'users'], administrator: ['read', 'write', 'publish', 'media', 'inquiries', 'settings'], editor: ['read', 'write', 'media'], viewer: ['read'] }[state.user?.role] || []).includes(permission);
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const button = (label, name, attributes = '', primary = false) => `<button type="button" class="button${primary ? ' button--primary' : ''}" ${attributes}>${icon(name)}${escapeHtml(label)}</button>`;
const iconButton = (label, name, attributes = '') => `<button type="button" class="icon-button" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" ${attributes}>${icon(name)}</button>`;
const badge = (value) => `<span class="badge badge--${escapeHtml(value)}">${escapeHtml(value)}</span>`;
const date = (value) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const size = (value) => value > 1048576 ? `${(value / 1048576).toFixed(1)} MB` : `${Math.round(value / 1024)} KB`;
const lines = (value) => Array.isArray(value) ? value.join('\n') : value || '';
const toLines = (value) => String(value || '').split('\n').map((entry) => entry.trim()).filter(Boolean);

const notify = (message, error = false) => {
  const element = document.getElementById('notification');
  element.textContent = message;
  element.className = `notification${error ? ' notification--error' : ''}`;
  element.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { element.hidden = true; }, error ? 12000 : 5000);
};
const api = async (route, method = 'GET', body) => {
  const response = await fetch(`/api/admin${route}`, { method, credentials: 'same-origin', headers: { 'x-csrf-token': state.csrf, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (data.csrf) state.csrf = data.csrf;
  if (!response.ok) {
    if (response.status === 401 && state.user) { state.user = null; loginScreen(); }
    throw new Error(data.error || 'The request failed. Try again.');
  }
  return data;
};
const refreshIcons = () => window.lucide?.createIcons();
const showDialog = (title, content) => {
  dialog.innerHTML = `<header class="dialog-heading"><h2 id="dialog-title">${escapeHtml(title)}</h2>${iconButton('Close', 'x', 'data-close-dialog')}</header>${content}`;
  if (!dialog.open) dialog.showModal();
  refreshIcons();
};
const field = (label, name, value = '', { area = false, wide = false, type = 'text', required = false, asset = false } = {}) => {
  const id = `field-${name.replaceAll('.', '-')}`;
  const input = area ? `<textarea id="${id}" name="${name}" rows="4">${escapeHtml(value)}</textarea>` : `<input id="${id}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? 'required' : ''} />`;
  return `<div class="field${wide ? ' field--wide' : ''}"><label for="${id}">${escapeHtml(label)}</label>${asset ? `<div class="asset-input">${input}${iconButton('Choose media', 'images', `data-pick-media="${id}"`)}</div>` : input}</div>`;
};
const checkbox = (label, name, checked = false) => `<label class="check-field"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''} />${escapeHtml(label)}</label>`;
const heading = (title, actions = '', eyebrow = 'Anchev Films') => `<header class="page-heading"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 tabindex="-1">${escapeHtml(title)}</h1></div><div class="actions">${actions}</div></header>`;
const empty = (message) => `<p class="empty">${escapeHtml(message)}</p>`;

const navigation = [
  ['dashboard', 'Dashboard', 'layout-dashboard', 'read'], ['projects', 'Projects', 'clapperboard', 'read'],
  ['media', 'Media library', 'images', 'read'], ['pages', 'Pages', 'panels-top-left', 'read'],
  ['news', 'News', 'newspaper', 'read'], ['seo', 'SEO manager', 'search-check', 'read'], ['articles', 'Articles / press', 'book-open', 'read'],
  ['clients', 'Clients', 'building-2', 'read'], ['inquiries', 'Inquiries', 'inbox', 'inquiries'],
  ['users', 'Users', 'users', 'users'], ['settings', 'Settings', 'settings-2', 'read'], ['activity', 'Activity', 'history', 'read']
];
const shell = () => {
  const title = navigation.find(([key]) => key === state.view)?.[1] || 'Projects';
  root.innerHTML = `<div class="console">
    <aside class="sidebar" id="console-sidebar"><a class="console-brand" href="#dashboard" data-view="dashboard">ANCHEV FILMS<span>Production office</span></a>
      <nav class="console-nav" aria-label="Administration">${navigation.filter((entry) => can(entry[3])).map(([key, label, image]) => `<a href="#${key}" data-view="${key}" ${state.view === key ? 'aria-current="page"' : ''}>${icon(image)}${label}</a>`).join('')}</nav>
      <div class="sidebar-footer"><a href="/" target="_blank" rel="noreferrer">View website</a><div><div class="account-name">${escapeHtml(state.user.name)}</div><div class="account-role">${escapeHtml(state.user.role)}</div></div>${button('Sign out', 'log-out', 'data-logout')}</div>
    </aside>
    <div class="workspace"><header class="console-topbar"><div class="actions"><button type="button" class="mobile-menu" aria-label="Open navigation" aria-controls="console-sidebar" aria-expanded="false" data-mobile-menu>${icon('menu')}</button><p>Anchev Films / <strong>${escapeHtml(title)}</strong></p></div><span class="console-status">Content workspace</span></header><main id="console-main" aria-busy="true"></main></div>
  </div>`;
  root.setAttribute('aria-busy', 'false');
  refreshIcons();
};
const loginScreen = () => {
  root.setAttribute('aria-busy', 'false');
  root.innerHTML = `<main class="login-screen" id="console-main"><form class="login-form" id="login-form"><img class="login-brand" src="/assets/anchevlogo.png" alt="Anchev Films" width="72" height="72" /><p class="eyebrow">Anchev Films / Production office</p><h1>Sign in</h1>
    ${field('Email', 'email', '', { type: 'email', required: true })}${field('Password', 'password', '', { type: 'password', required: true })}${field('Verification or recovery code', 'token')}
    <p class="login-error" id="login-error" role="alert" hidden></p><button class="button button--primary" type="submit">${icon('log-in')}Sign in</button></form></main>`;
  root.querySelector('[name="email"]').autocomplete = 'username';
  root.querySelector('[name="password"]').autocomplete = 'current-password';
  root.querySelector('[name="token"]').autocomplete = 'one-time-code';
  refreshIcons();
};
const activityTable = (activity) => activity.length ? `<div class="table-wrap"><table><thead><tr><th>Action</th><th>Entry</th><th>By</th><th>Date</th></tr></thead><tbody>${activity.map((entry) => `<tr><td>${escapeHtml(entry.action.replaceAll('.', ' / '))}</td><td>${escapeHtml(entry.entity_id || entry.entity_type)}</td><td>${escapeHtml(entry.actor || 'System')}</td><td>${date(entry.created_at)}</td></tr>`).join('')}</tbody></table></div>` : empty('No activity yet.');

const dashboard = async () => {
  const data = await api('/dashboard');
  return `${heading('Overview', can('write') ? button('New project', 'plus', 'data-new-project', true) : '')}<div class="metric-strip">${[['Published projects', data.published], ['Draft projects', data.drafts], ['Media assets', data.media], [data.inquiries === null ? 'Total projects' : 'New inquiries', data.inquiries === null ? data.projects : data.inquiries]].map(([label, value]) => `<div class="metric"><p>${label}</p><strong>${value}</strong></div>`).join('')}</div>
  <div class="dashboard-grid"><section><h2>Recent activity</h2>${activityTable(data.activity)}</section><section><h2>System</h2><ul class="system-list"><li>Database<span>${data.system.database ? 'Healthy' : 'Needs attention'}</span></li><li>Media storage<span>${size(data.mediaBytes)}</span></li><li>Failed processing jobs<span>${data.failedJobs}</span></li><li>Release<span>${escapeHtml(data.system.release)}</span></li><li>Schema<span>${data.system.schema}</span></li></ul></section></div>`;
};
const projects = async () => {
  state.projects = (await api('/projects')).projects;
  return `${heading('Projects', can('write') ? button('New project', 'plus', 'data-new-project', true) : '')}<div class="toolbar"><input type="search" id="project-search" aria-label="Search projects" placeholder="Search projects" /><select id="project-status" aria-label="Publication status"><option value="">All statuses</option><option>published</option><option>draft</option><option>archived</option></select><span class="subtle">${state.projects.length} projects</span></div>${state.projects.length ? `<div class="table-wrap"><table><thead><tr><th>Production</th><th>Status</th><th>Category</th><th>Languages</th><th>Updated</th><th>Actions</th></tr></thead><tbody>${state.projects.map((project) => `<tr data-project-row data-search="${escapeHtml(`${project.name} ${project.client} ${project.category}`.toLowerCase())}" data-status="${project.status}"><td><div class="table-title">${project.thumbnail ? `<img src="${escapeHtml(project.thumbnail)}" alt="" loading="lazy" />` : ''}<div><button class="row-title" type="button" data-edit-project="${escapeHtml(project.id)}">${escapeHtml(project.name)}</button><div class="subtle">${escapeHtml(project.client || project.id)}</div></div></div></td><td>${badge(project.status)}${project.hasUnpublishedChanges && project.status === 'published' ? '<div class="subtle">Unpublished changes</div>' : ''}</td><td>${escapeHtml(project.category)}</td><td>EN${project.hasGreek ? ' / EL' : ''}</td><td>${date(project.updatedAt)}</td><td><div class="actions">${iconButton('Edit project', 'pencil', `data-edit-project="${escapeHtml(project.id)}"`)}${can('write') ? iconButton('Duplicate project', 'copy', `data-duplicate-project="${escapeHtml(project.id)}"`) : ''}</div></td></tr>`).join('')}</tbody></table></div>` : empty('No projects yet.')}`;
};
const orderedRow = (kind, value = kind === 'gallery' ? '' : {}) => {
  const id = `ordered-${crypto.randomUUID()}`;
  const content = kind === 'gallery'
    ? `<img src="${escapeHtml(value)}" alt="" width="80" height="52" ${value ? '' : 'hidden'} /><div class="asset-input"><input id="${id}-url" name="gallery-url" aria-label="Image URL" value="${escapeHtml(value)}" />${can('write') ? iconButton('Choose media', 'images', `data-pick-media="${id}-url"`) : ''}</div>`
    : `<input name="credit-role" aria-label="Credit role" value="${escapeHtml(value.role)}" placeholder="Role" /><input name="credit-name" aria-label="Credit name" value="${escapeHtml(value.name)}" placeholder="Name" />`;
  return `<div class="ordered-row ordered-row--${kind}" id="${id}" data-ordered-row>${can('write') ? iconButton('Drag to reorder', 'grip-vertical', 'draggable="true" data-drag-row') : ''}${content}${can('write') ? `<div class="actions">${iconButton('Move up', 'arrow-up', 'data-row-up')}${iconButton('Move down', 'arrow-down', 'data-row-down')}${iconButton('Remove', 'trash-2', 'data-row-remove')}</div>` : ''}</div>`;
};
const orderedEditor = (kind, entries = []) => `<section class="form-section"><div class="ordered-heading"><h2>${kind === 'gallery' ? 'Gallery' : 'Additional credits'}</h2>${can('write') ? button(kind === 'gallery' ? 'Add image' : 'Add credit', 'plus', `data-add-row="${kind}"`) : ''}</div><div id="project-${kind}" class="ordered-list">${entries.map((entry) => orderedRow(kind, entry)).join('')}</div><p class="subtle" id="${kind}-order-status" role="status" aria-live="polite"></p></section>`;
const projectEditor = (project = {}) => {
  state.project = project;
  const greek = project.translations?.el || {};
  return `${heading(project.name || 'New project', `${button('Back', 'arrow-left', 'data-view="projects"')}${project.id ? button('Preview', 'eye', 'data-preview-project') : ''}`, `Projects / ${project.status || 'draft'}`)}
  <form id="project-form"><div class="editor-tabs" role="tablist" aria-label="Project content">${[['en', 'English'], ['el', 'Greek'], ['production', 'Production'], ['seo', 'SEO'], ['revisions', 'Revisions']].map(([key, label], index) => `<button class="editor-tab" type="button" role="tab" id="tab-${key}" aria-controls="panel-${key}" aria-selected="${index === 0}" data-editor-tab="${key}">${label}</button>`).join('')}</div>
  <section id="panel-en" role="tabpanel" aria-labelledby="tab-en"><div class="form-grid">${field('Project title', 'name', project.name, { required: true })}${field('URL identifier', 'id', project.id, { required: true })}${field('Client', 'client', project.client)}${field('Category', 'category', project.category)}${field('Year', 'year', project.year)}${field('Tags', 'tags', (project.tags || []).join(', '))}${field('Short description', 'note', project.note, { area: true, wide: true })}${field('The brief', 'brief', project.brief, { area: true, wide: true })}${field('Our approach', 'approach', project.approach, { area: true, wide: true })}${field('The production', 'production', project.production, { area: true, wide: true })}</div></section>
  <section id="panel-el" role="tabpanel" aria-labelledby="tab-el" hidden><div class="form-grid">${field('Greek title', 'el.name', greek.name)}${field('Greek category', 'el.category', greek.category)}${field('Greek short description', 'el.note', greek.note, { area: true, wide: true })}${field('Greek brief', 'el.brief', greek.brief, { area: true, wide: true })}${field('Greek approach', 'el.approach', greek.approach, { area: true, wide: true })}${field('Greek production', 'el.production', greek.production, { area: true, wide: true })}${field('Greek services', 'el.services', lines(greek.services), { area: true })}${field('Greek deliverables', 'el.deliverables', lines(greek.deliverables), { area: true })}${field('Greek SEO title', 'el.seo.title', greek.seo?.title)}${field('Greek SEO description', 'el.seo.description', greek.seo?.description, { area: true })}${field('Greek social image', 'el.seo.image', greek.seo?.image, { asset: true })}${checkbox('Exclude Greek project from search indexing', 'el.seo.noindex', greek.seo?.noindex)}${checkbox('Translation reviewed and ready to publish', 'el.ready', greek.ready)}</div></section>
  <section id="panel-production" role="tabpanel" aria-labelledby="tab-production" hidden><div class="form-grid">${['thumbnail', 'video', 'preview', 'behindFrame', 'behindVideo'].map((name) => field({ thumbnail: 'Cover image', video: 'Film', preview: 'Preview loop', behindFrame: 'Behind-the-scenes cover', behindVideo: 'Behind-the-scenes film' }[name], name, project[name], { asset: true })).join('')}${field('Project website', 'link', project.link)}${field('Press URL', 'pressLink', project.pressLink)}${field('Press title', 'pressTitle', project.pressTitle)}${field('Location', 'location', project.location)}${field('Runtime', 'duration', project.duration)}${field('Director', 'director', project.director)}${field('Producer', 'producer', project.producer)}${field('Director of photography', 'dop', project.dop)}${field('Services', 'services', lines(project.services), { area: true })}${field('Deliverables', 'deliverables', lines(project.deliverables), { area: true })}${field('Publication date', 'publishedAt', project.publishedAt?.slice(0, 10), { type: 'date' })}${checkbox('Featured project', 'featured', project.featured)}</div>${orderedEditor('gallery', project.frames)}${orderedEditor('credits', project.credits)}</section>
  <section id="panel-seo" role="tabpanel" aria-labelledby="tab-seo" hidden><div class="form-grid">${field('SEO title', 'seo.title', project.seo?.title)}${field('SEO description', 'seo.description', project.seo?.description, { area: true })}${field('Social image', 'seo.image', project.seo?.image, { asset: true })}${checkbox('Exclude from search indexing', 'seo.noindex', project.seo?.noindex)}</div></section>
  <section id="panel-revisions" role="tabpanel" aria-labelledby="tab-revisions" hidden><div id="revision-list">${empty('Save the project to start its revision history.')}</div></section>
  <footer class="form-footer"><span class="save-state" id="save-state">${project.version ? `Version ${project.version}` : 'Not saved'}</span>${can('write') ? `${checkbox('Autosave draft', 'autosave', state.autosave)}<button class="button" type="submit">${icon('save')}Save draft</button>` : ''}${can('publish') ? button('Publish', 'send', 'data-publish-project', true) : ''}${can('publish') && project.status === 'published' ? button('Unpublish', 'archive', 'data-unpublish-project') : ''}</footer></form>
  ${can('publish') && project.id ? `<section class="form-section"><div class="actions">${button('Archive', 'archive', 'data-archive-project')}${button('Delete project', 'trash-2', 'data-delete-project')}</div></section>` : ''}`;
};
const readProject = () => {
  const form = document.getElementById('project-form');
  const values = Object.fromEntries(new FormData(form));
  const id = values.id || values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const result = { ...state.project, id, version: state.project.version, status: state.project.status || 'draft', featured: form.elements.featured.checked, seo: { title: values['seo.title'], description: values['seo.description'], image: values['seo.image'], noindex: form.elements['seo.noindex'].checked } };
  for (const key of ['name', 'client', 'category', 'year', 'note', 'brief', 'approach', 'production', 'thumbnail', 'video', 'preview', 'behindFrame', 'behindVideo', 'link', 'pressLink', 'pressTitle', 'location', 'duration', 'director', 'producer', 'dop']) result[key] = values[key] || '';
  for (const key of ['services', 'deliverables']) result[key] = toLines(values[key]);
  result.frames = [...form.querySelectorAll('#project-gallery [name="gallery-url"]')].map((input) => input.value.trim()).filter(Boolean);
  result.tags = (values.tags || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  result.credits = [...form.querySelectorAll('#project-credits [data-ordered-row]')].map((row) => ({ role: row.querySelector('[name="credit-role"]').value.trim(), name: row.querySelector('[name="credit-name"]').value.trim() })).filter((entry) => entry.role && entry.name);
  result.publishedAt = values.publishedAt || null;
  result.translations = {};
  if (values['el.name'] || values['el.note'] || values['el.brief']) {
    const greek = { ready: form.elements['el.ready'].checked, seo: { title: values['el.seo.title'], description: values['el.seo.description'], image: values['el.seo.image'], noindex: form.elements['el.seo.noindex'].checked } };
    for (const key of ['name', 'category', 'note', 'brief', 'approach', 'production']) greek[key] = values[`el.${key}`] || '';
    greek.services = toLines(values['el.services']); greek.deliverables = toLines(values['el.deliverables']);
    result.translations.el = greek;
  }
  return result;
};
const saveProject = async (publish = false, silent = false, status) => {
  if (saveProject.busy) return;
  saveProject.busy = true;
  let saved = false;
  try {
    const project = readProject();
    const editSequence = state.editSequence;
    if (status) project.status = status;
    const data = await api('/projects', 'POST', { ...project, publish });
    state.project = data.saved;
    state.projects = data.projects;
    state.dirty = state.editSequence !== editSequence;
    saved = true;
    document.getElementById('field-id').value = data.saved.id;
    document.getElementById('field-id').readOnly = true;
    document.getElementById('save-state').textContent = state.dirty ? 'Newer changes not saved' : `${publish ? 'Published' : 'Draft saved'} / ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    if (!silent) notify(publish ? 'Project published.' : 'Draft saved.');
    if ((publish || status) && !state.dirty) await navigate('projects', true);
  } finally {
    saveProject.busy = false;
    if (saved && state.dirty && state.autosave && document.getElementById('project-form')) {
      clearTimeout(state.saveTimer);
      state.saveTimer = setTimeout(() => saveProject(false, true).catch((error) => notify(error.message, true)), 1800);
    }
  }
};

const mediaCard = (asset, picker = false) => {
  const poster = asset.derivatives.find((entry) => entry.kind === 'poster')?.url;
  const image = asset.derivatives.find((entry) => entry.kind === 'image-480-webp')?.url || (asset.mime.startsWith('image/') ? asset.url : poster);
  return `<article class="media-card">${!picker ? `<label class="media-select"><input type="checkbox" aria-label="Select ${escapeHtml(asset.filename)}" data-select-media="${asset.id}" ${state.selected.has(asset.id) ? 'checked' : ''} /></label>` : ''}${image ? `<img class="media-card__preview" src="${escapeHtml(image)}" alt="${escapeHtml(asset.metadata.alt?.en || '')}" loading="lazy" />` : `<span class="media-card__preview media-card__placeholder">${asset.mime.startsWith('video/') ? icon('film') : icon('file-image')}</span>`}<div class="media-card__body"><p class="media-card__name" title="${escapeHtml(asset.filename)}">${escapeHtml(asset.metadata.title || asset.filename)}</p><div class="media-card__meta"><span>${size(asset.bytes)}</span><span>${asset.width ? `${asset.width} x ${asset.height}` : ''}</span></div><div class="media-card__meta">${badge(asset.status)}<span>${asset.usage.length} uses</span></div>${button(picker ? 'Choose' : 'Details', picker ? 'check' : 'pencil', `${picker ? 'data-choose-media' : 'data-media-details'}="${asset.id}"`)}</div></article>`;
};
const mediaView = async () => {
  const query = new URLSearchParams({ q: state.mediaQuery, page: state.mediaPage, type: state.mediaType, ...(state.unused ? { unused: '1' } : {}) });
  const data = await api(`/media?${query}`);
  state.media = data.media;
  return `${heading('Media library', can('media') ? `<label class="button button--primary" for="media-upload">${icon('upload')}Upload media</label><input id="media-upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime" multiple hidden />` : '')}
  ${can('media') ? '<div class="dropzone" id="media-dropzone"><p>Drop images or films</p><span class="subtle" id="upload-label">200 MB per file</span><progress class="progress" id="upload-progress" max="100" value="0" hidden></progress></div>' : ''}
  <div class="toolbar"><input type="search" id="media-search" aria-label="Search media" placeholder="Search media" value="${escapeHtml(state.mediaQuery)}" /><select id="media-type" aria-label="Media type"><option value="">All media</option><option value="image/" ${state.mediaType === 'image/' ? 'selected' : ''}>Images</option><option value="video/" ${state.mediaType === 'video/' ? 'selected' : ''}>Videos</option></select>${checkbox('Unused only', 'unused', state.unused)}<span class="subtle">${data.total} assets</span></div>
  ${can('media') ? `<div class="actions" style="margin-bottom:18px">${button('Add selection to collection', 'folder-plus', 'data-bulk-collection')}${can('publish') ? button('Delete selection', 'trash-2', 'data-bulk-delete') : ''}</div>` : ''}
  ${data.media.length ? `<div class="media-grid">${data.media.map((asset) => mediaCard(asset)).join('')}</div>` : empty('No media matches this view.')}<div class="pagination"><span class="subtle">Page ${data.page} of ${Math.max(1, Math.ceil(data.total / data.pageSize))}</span><div class="actions">${iconButton('Previous page', 'chevron-left', `data-media-page="${data.page - 1}" ${data.page === 1 ? 'disabled' : ''}`)}${iconButton('Next page', 'chevron-right', `data-media-page="${data.page + 1}" ${data.page * data.pageSize >= data.total ? 'disabled' : ''}`)}</div></div>`;
};
const uploadFile = (file, replacementId) => new Promise((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.open('POST', replacementId ? `/api/admin/media/${replacementId}/replace` : '/api/admin/upload');
  request.setRequestHeader('x-csrf-token', state.csrf);
  request.upload.addEventListener('progress', (event) => {
    const progress = document.getElementById('upload-progress');
    if (progress) { progress.hidden = false; progress.value = event.lengthComputable ? event.loaded / event.total * 100 : 0; }
    const label = document.getElementById('upload-label');
    if (label) label.textContent = `Uploading ${file.name}`;
  });
  request.addEventListener('load', () => {
    let data;
    try { data = JSON.parse(request.responseText); } catch { reject(new Error('Upload response was not valid.')); return; }
    if (request.status < 200 || request.status >= 300) reject(new Error(data.error || 'Upload failed.'));
    else resolve(data);
  });
  request.addEventListener('error', () => reject(new Error('Upload interrupted. Try again.')));
  const body = new FormData(); body.append('file', file); request.send(body);
});
const uploadFiles = async (files, replacementId) => {
  let count = 0;
  for (const file of files) {
    if (file.size > 200 * 1024 * 1024) { notify(`${file.name} exceeds 200 MB.`, true); continue; }
    await uploadFile(file, replacementId); count++;
  }
  if (count) notify(`${count} file${count === 1 ? '' : 's'} uploaded.`);
  if (dialog.open) dialog.close();
  await navigate('media', true);
};
const mediaDetails = async (id) => {
  const asset = state.media.find((entry) => entry.id === id);
  if (!asset) return;
  state.asset = asset;
  const poster = asset.derivatives.find((entry) => entry.kind === 'poster')?.url;
  const image = asset.mime.startsWith('image/') ? asset.url : poster;
  const metadata = asset.metadata;
  const versions = asset.url.startsWith('/uploads/') ? (await api(`/media/${encodeURIComponent(asset.id)}/history`)).versions : [];
  showDialog(asset.filename, `${asset.mime.startsWith('video/') && asset.url.startsWith('/') ? `<video class="media-detail-preview" src="${escapeHtml(asset.url)}" controls playsinline preload="none" ${poster ? `poster="${escapeHtml(poster)}"` : ''}></video>` : image ? `<img class="media-detail-preview" src="${escapeHtml(image)}" alt="${escapeHtml(metadata.alt?.en || '')}" />` : ''}<p class="subtle">${escapeHtml(asset.mime)} / ${size(asset.bytes)} / ${asset.usage.length} references</p>${asset.error ? `<p class="login-error">${escapeHtml(asset.error)}</p>` : ''}<form id="media-metadata-form"><div class="form-grid">${field('Title', 'title', metadata.title)}${field('Collection', 'collection', metadata.collection)}${field('English alt text', 'alt.en', metadata.alt?.en)}${field('Greek alt text', 'alt.el', metadata.alt?.el)}${field('Tags', 'tags', (metadata.tags || []).join(', '))}${field('Rights / licence', 'rights', metadata.rights)}${field('Attribution', 'attribution', metadata.attribution, { wide: true })}</div><h3>Original</h3><input aria-label="Original URL" value="${escapeHtml(asset.url)}" readonly /><h3>Derivatives</h3>${asset.derivatives.length ? asset.derivatives.map((entry) => `<p class="subtle"><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.kind)}</a> / ${size(entry.bytes)}</p>`).join('') : '<p class="subtle">No derivatives yet.</p>'}<div class="form-footer">${asset.status === 'failed' && can('media') ? button('Retry processing', 'rotate-cw', `data-retry-media="${asset.id}"`) : ''}${can('media') ? '<button type="submit" class="button button--primary">Save metadata</button>' : ''}</div></form>${can('media') && asset.url.startsWith('/uploads/') ? `<div class="form-section"><label class="button" for="media-replace">${icon('replace')}Replace original</label><input id="media-replace" type="file" accept="${escapeHtml(asset.mime)}" hidden /></div>` : ''}`);
  if (versions.length) dialog.querySelector('#media-metadata-form').insertAdjacentHTML('afterend', `<section class="form-section"><h3>Original versions</h3><div class="table-wrap"><table><thead><tr><th>Saved</th><th>Checksum</th><th></th></tr></thead><tbody>${versions.map((version) => `<tr><td>${date(version.createdAt)}</td><td>${escapeHtml(version.checksum.slice(0, 12))}</td><td>${can('media') ? button('Restore original', 'rotate-ccw', `data-restore-original="${escapeHtml(version.id)}"`) : ''}</td></tr>`).join('')}</tbody></table></div></section>`);
};
const mediaPicker = async (target) => {
  state.picker = target;
  state.pickerAssets = (await api('/media')).media;
  showDialog('Choose media', `<input type="search" id="picker-search" aria-label="Search library" placeholder="Search library" /><div class="media-grid" id="picker-grid" style="margin-top:20px">${state.pickerAssets.map((asset) => mediaCard(asset, true)).join('')}</div>`);
};

const pagesView = async () => {
  state.pages = (await api('/pages')).pages.filter((page) => page.kind !== 'news');
  return `${heading('Pages', can('write') ? `${button('Site content', 'panels-top-left', 'data-site-content')}${button('New page', 'plus', 'data-new-page', true)}` : '')}${state.pages.length ? `<div class="table-wrap"><table><thead><tr><th>Page</th><th>Language</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${state.pages.map((page) => `<tr><td>${escapeHtml(page.heading)}</td><td>${page.locale.toUpperCase()}</td><td>${badge(page.isPublished ? 'published' : 'draft')}</td><td>${date(page.updatedAt)}</td><td>${iconButton('Edit page', 'pencil', `data-edit-page="${page.locale}:${page.id}"`)}</td></tr>`).join('')}</tbody></table></div>` : empty('No custom pages yet.')}`;
};
const pageEditor = (page = {}) => {
  state.page = page;
  const actions = `${button('Back', 'arrow-left', 'data-view="pages"')}${page.version ? button('Preview', 'eye', 'data-preview-page') + button('Revisions', 'history', 'data-page-revisions') : ''}`;
  return `${heading(page.heading || 'New page', actions, `Pages / ${page.isPublished ? 'published' : 'draft'}`)}
  <form id="page-form"><div class="form-grid">
    ${field('Page title', 'heading', page.heading, { required: true })}${field('URL identifier', 'id', page.id, { required: true })}
    <div class="field"><label for="page-locale">Language</label><select name="locale" id="page-locale"><option value="en">English</option><option value="el" ${page.locale === 'el' ? 'selected' : ''}>Greek</option></select></div>
    ${field('Introduction', 'intro', page.intro, { area: true, wide: true })}${field('Body', 'body', page.body, { area: true, wide: true })}
    ${field('SEO title', 'seo.title', page.seo?.title)}${field('SEO description', 'seo.description', page.seo?.description, { area: true })}
    ${field('Social image', 'seo.image', page.seo?.image, { asset: true })}${checkbox('Exclude from search indexing', 'seo.noindex', page.seo?.noindex)}
  </div><section class="form-section"><h2>Content blocks</h2><div id="page-blocks">${(page.blocks || []).map(blockRow).join('')}</div>${can('write') ? button('Add block', 'plus', 'data-add-block') : ''}</section>
  <footer class="form-footer"><span id="page-save-state" class="save-state">${page.version ? `Version ${page.version}` : 'Not saved'}</span>${can('write') ? `<button class="button" type="submit">${icon('save')}Save draft</button>` : ''}${can('publish') ? button('Publish', 'send', 'data-publish-page', true) : ''}${can('publish') && page.isPublished ? button('Unpublish', 'archive', 'data-unpublish-page') : ''}</footer></form>
  ${can('publish') && page.version ? `<section class="form-section">${button('Delete page', 'trash-2', 'data-delete-page')}</section>` : ''}`;
};
const showPageEditor = (page = {}) => {
  document.getElementById('console-main').innerHTML = pageEditor(page);
  if (page.id) { document.getElementById('field-id').readOnly = true; document.getElementById('page-locale').disabled = true; }
  if (!can('write')) document.querySelectorAll('#page-form input,#page-form textarea,#page-form select').forEach((input) => { input.disabled = true; });
  refreshIcons();
};
const blockRow = (block = {}) => `<div class="block-row" data-block><select aria-label="Block type" name="block-type"><option value="text">Text</option>${['image', 'video', 'link', 'fact'].map((type) => `<option value="${type}" ${block.type === type ? 'selected' : ''}>${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select><div class="block-content"><input name="block-title" aria-label="Block title" value="${escapeHtml(block.title)}" placeholder="Title" /><textarea name="block-text" aria-label="Block text" placeholder="Text">${escapeHtml(block.text)}</textarea><input name="block-url" aria-label="Block URL" value="${escapeHtml(block.url)}" placeholder="Media or link URL" /><input name="block-alt" aria-label="Image alt text" value="${escapeHtml(block.alt)}" placeholder="Alt text" /></div><div class="actions">${iconButton('Move block up', 'arrow-up', 'data-block-up')}${iconButton('Move block down', 'arrow-down', 'data-block-down')}${iconButton('Remove block', 'trash-2', 'data-remove-block')}</div></div>`;
const savePage = async (publish = false) => {
  const form = document.getElementById('page-form');
  const values = Object.fromEntries(new FormData(form));
  const blocks = [...form.querySelectorAll('[data-block]')].map((row) => Object.fromEntries(['type', 'title', 'text', 'url', 'alt'].map((key) => [key, row.querySelector(`[name="block-${key}"]`).value])));
  const editSequence = state.editSequence;
  const data = await api('/pages', 'POST', { ...state.page, ...values, blocks, seo: { title: values['seo.title'], description: values['seo.description'], image: values['seo.image'], noindex: form.elements['seo.noindex'].checked }, publish });
  state.page = data.saved; state.dirty = state.editSequence !== editSequence;
  if (!state.dirty) showPageEditor(data.saved);
  notify(publish ? 'Page published.' : 'Page draft saved.');
  if (publish) await navigate('pages', true);
};

const seoView = async () => {
  const data = await api('/seo');
  return `${heading('SEO manager')}<section><h2>Project metadata</h2><div class="table-wrap"><table><thead><tr><th>Project</th><th>SEO title</th><th>Description</th><th>Languages</th><th></th></tr></thead><tbody>${data.projects.map((project) => `<tr><td>${escapeHtml(project.name)}</td><td>${project.seo.title ? `${project.seo.title.length} characters` : 'Default'}</td><td>${project.seo.description ? `${project.seo.description.length} characters` : 'Default'}</td><td>EN${project.hasGreek ? ' / EL' : ''}</td><td>${iconButton('Edit metadata', 'pencil', `data-edit-project="${project.id}" data-open-seo`)}</td></tr>`).join('')}</tbody></table></div></section><section class="form-section"><h2>Permanent redirects</h2>${data.redirects.length ? `<div class="table-wrap"><table><thead><tr><th>From</th><th>To</th><th></th></tr></thead><tbody>${data.redirects.map((entry) => `<tr><td>${escapeHtml(entry.source)}</td><td>${escapeHtml(entry.target)}</td><td>${can('settings') ? iconButton('Delete redirect', 'trash-2', `data-delete-redirect="${escapeHtml(entry.source)}"`) : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('No custom redirects.')}${can('settings') ? `<form id="redirect-form" class="form-grid" style="margin-top:20px">${field('From path', 'source', '', { required: true })}${field('To path', 'target', '', { required: true })}<div><button type="submit" class="button">Add redirect</button></div></form>` : ''}</section>`;
};
const articlesView = async () => {
  state.articles = (await api('/articles')).articles;
  return `${heading('Articles / press', can('publish') ? button('Add article', 'plus', 'data-new-article', true) : '')}${state.articles.length ? `<div class="table-wrap"><table><thead><tr><th>Title</th><th>Publisher</th><th>Date</th><th>Language</th><th></th></tr></thead><tbody>${state.articles.map((article) => `<tr><td>${escapeHtml(article.title)}</td><td>${escapeHtml(article.publisher)}</td><td>${date(article.publishedAt)}</td><td>${article.language.toUpperCase()}</td><td>${iconButton('Edit article', 'pencil', `data-edit-article="${article.id}"`)}</td></tr>`).join('')}</tbody></table></div>` : empty('No articles yet.')}`;
};
const articleEditor = (article = {}) => {
  state.article = article;
  showDialog(article.title || 'New article', `<form id="article-form"><div class="form-grid">${field('Title', 'title', article.title, { required: true })}${field('Identifier', 'id', article.id, { required: true })}${field('Publisher', 'publisher', article.publisher)}${field('Published date', 'publishedAt', article.publishedAt || new Date().toISOString().slice(0, 10), { type: 'date' })}${field('Article URL', 'url', article.url, { required: true, wide: true })}${field('Summary', 'summary', article.summary, { area: true, wide: true })}<div class="field"><label for="article-language">Language</label><select id="article-language" name="language"><option value="en">English</option><option value="el" ${article.language === 'el' ? 'selected' : ''}>Greek</option></select></div></div><footer class="form-footer">${can('publish') ? `${article.id ? button('Delete', 'trash-2', 'data-delete-article') : ''}<button type="submit" class="button button--primary">Save article</button>` : ''}</footer></form>`);
};
const clientsView = async () => `${heading('Clients')}<form id="clients-form">${field('Client names', 'clients', (await api('/clients')).clients.join('\n'), { area: true })}<footer class="form-footer">${can('settings') ? '<button type="submit" class="button button--primary">Save clients</button>' : ''}</footer></form>`;

const localPublicationTime = (value) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: state.newsTimeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value || Date.now())).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const newsView = async () => {
  const data = await api('/news');
  state.news = data.news; state.newsTimeZone = data.timeZone; state.newsCategories = data.categories; state.newsServices = data.services;
  state.projects = (await api('/projects')).projects;
  return `${heading('News', can('write') ? button('New article', 'plus', 'data-new-news', true) : '')}${data.news.length ? `<div class="table-wrap"><table><thead><tr><th>Article</th><th>Language</th><th>Status</th><th>Publication</th><th></th></tr></thead><tbody>${data.news.map((article) => `<tr data-news-row="${article.locale}:${article.id}"><td><button class="row-title" type="button" data-edit-news="${article.locale}:${article.id}">${escapeHtml(article.heading)}</button></td><td>${article.locale.toUpperCase()}</td><td>${badge(article.status)}</td><td>${date(article.publicationDate)}</td><td>${iconButton('Edit article', 'pencil', `data-edit-news="${article.locale}:${article.id}"`)}</td></tr>`).join('')}</tbody></table></div>` : empty('No company news yet. External press coverage remains in Articles / press.')}`;
};
const showNewsEditor = async (article = {}) => {
  if (!window.Quill) {
    await (showNewsEditor.loading ||= new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = '/vendor/quill.js';
      script.onload = resolve; script.onerror = () => { showNewsEditor.loading = null; reject(new Error('The article editor could not load. Please retry.')); }; document.head.append(script);
    }));
  }
  state.newsArticle = article;
  const language = article.locale || 'en';
  const actions = `${button('Back', 'arrow-left', 'data-view="news"')}${article.version ? button('Preview', 'eye', 'data-preview-news') + button('Revisions', 'history', 'data-news-revisions') + (can('write') ? button(language === 'en' ? 'Greek version' : 'English version', 'languages', 'data-translate-news') : '') : ''}`;
  document.getElementById('console-main').innerHTML = `${heading(article.heading || 'New article', actions, `News / ${article.status || 'draft'}`)}<form id="news-form"><div class="form-grid">
    ${field('Headline', 'heading', article.heading, { required: true, wide: true })}${field('URL slug', 'slug', article.id?.slice(5), { required: true })}
    <div class="field"><label for="news-locale">Language</label><select id="news-locale" name="locale" ${article.version ? 'disabled' : ''}><option value="en">English</option><option value="el" ${language === 'el' ? 'selected' : ''}>Greek</option></select></div>
    ${field(`Publish at (${state.newsTimeZone})`, 'publicationLocal', localPublicationTime(article.publicationDate), { type: 'datetime-local' })}
    <div class="field"><label for="news-category">Category</label><select id="news-category" name="category">${Object.entries(state.newsCategories).map(([key, labels]) => `<option value="${key}" ${article.category === key ? 'selected' : ''}>${escapeHtml(labels[0])}</option>`).join('')}</select></div>
    ${field('Author / organisation', 'author', article.author || 'Anchev Films')}${field('Excerpt', 'intro', article.intro, { area: true, wide: true })}
    ${field('Featured image', 'thumbnail', article.thumbnail, { asset: true })}${field('Featured image alt text', 'imageAlt', article.imageAlt)}
    ${can('media') ? `<div class="field"><label for="news-upload">Upload featured image</label><input id="news-upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><progress class="progress" id="upload-progress" value="0" max="100" hidden></progress></div>` : ''}
  </div><section class="form-section news-editor"><h2 id="news-editor-label">Article content</h2><div id="news-editor"></div></section>
  <section class="form-section"><h2>Media & related content</h2><div class="form-grid">${field('Film URL (optional)', 'video', article.video, { asset: true })}</div><div class="form-grid"><fieldset class="news-related"><legend>Related projects</legend>${state.projects.filter((project) => project.status === 'published').map((project) => checkbox(project.name, 'relatedProjects', article.relatedProjects?.includes(project.id)).replace('name="relatedProjects"', `name="relatedProjects" value="${escapeHtml(project.id)}"`)).join('')}</fieldset><fieldset class="news-related"><legend>Related services</legend>${state.newsServices.map((service) => checkbox(service.title, 'relatedServices', article.relatedServices?.includes(service.slug)).replace('name="relatedServices"', `name="relatedServices" value="${service.slug}"`)).join('')}</fieldset></div></section>
  <section class="form-section"><h2>Search & social</h2><div class="form-grid">${field('SEO title', 'seo.title', article.seo?.title)}${field('SEO description', 'seo.description', article.seo?.description, { area: true })}${field('Social image', 'seo.image', article.seo?.image, { asset: true })}${checkbox('Exclude from search indexing', 'seo.noindex', article.seo?.noindex)}</div></section>
  <footer class="form-footer"><span id="news-save-state" class="save-state">${article.version ? `Version ${article.version} / ${article.status}` : 'Not saved'}</span>${can('write') ? '<button class="button" type="submit">Save draft</button>' : ''}${can('publish') ? button('Publish / schedule', 'send', 'data-publish-news', true) : ''}${can('publish') && article.isPublished ? button('Unpublish', 'archive', 'data-retire-news="unpublish"') : ''}</footer></form>${can('publish') && article.version ? `<section class="form-section"><div class="actions">${button('Archive', 'archive', 'data-retire-news="archive"')}${button('Delete article', 'trash-2', 'data-retire-news="delete"')}</div></section>` : ''}`;
  if (article.version) document.getElementById('field-slug').readOnly = true;
  state.newsEditor = new window.Quill('#news-editor', { theme: 'snow', readOnly: !can('write'), modules: { toolbar: can('write') ? { container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'blockquote'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']], handlers: { image: () => { state.newsSelection = state.newsEditor.getSelection(true)?.index || 0; mediaPicker('news-inline-image').catch((error) => notify(error.message, true)); } } } : false } });
  state.newsEditor.clipboard.dangerouslyPasteHTML(article.richContent || (article.body ? `<p>${escapeHtml(article.body)}</p>` : ''));
  state.newsEditor.root.setAttribute('role', 'textbox'); state.newsEditor.root.setAttribute('aria-multiline', 'true'); state.newsEditor.root.setAttribute('aria-labelledby', 'news-editor-label');
  document.querySelectorAll('.ql-toolbar button').forEach((control) => { const name = `${control.className.replace('ql-', '')}${control.value ? ` ${control.value}` : ''}`; control.setAttribute('aria-label', name); control.title = name; });
  document.querySelectorAll('.ql-toolbar .ql-picker-label').forEach((control) => control.setAttribute('aria-label', 'Paragraph style'));
  state.newsEditor.on('text-change', () => document.getElementById('news-form')?.dispatchEvent(new Event('input', { bubbles: true })));
  if (!can('write')) document.querySelectorAll('#news-form input,#news-form textarea,#news-form select').forEach((control) => { control.disabled = true; });
  refreshIcons();
};
const saveNews = async (publish = false) => {
  if (saveNews.busy) return;
  const form = document.getElementById('news-form');
  if (!form.reportValidity()) return;
  saveNews.busy = true;
  try {
    const data = new FormData(form); const values = Object.fromEntries(data); const sequence = state.editSequence;
    const input = { ...state.newsArticle, ...values, id: state.newsArticle.id || `news-${values.slug}`, locale: state.newsArticle.locale || values.locale, kind: 'news', richContent: state.newsEditor.getSemanticHTML(), body: '', relatedProjects: data.getAll('relatedProjects'), relatedServices: data.getAll('relatedServices'), seo: { title: values['seo.title'], description: values['seo.description'], image: values['seo.image'], noindex: form.elements['seo.noindex'].checked }, publish };
    const { saved } = await api('/news', 'POST', input);
    state.newsArticle = saved; state.dirty = state.editSequence !== sequence;
    if (!state.dirty) await showNewsEditor(saved);
    document.getElementById('field-slug').readOnly = true;
    document.getElementById('news-save-state').textContent = state.dirty ? 'Newer changes not saved' : publish ? `${saved.status === 'scheduled' ? 'Scheduled' : 'Published'} / Version ${saved.version}` : `Draft saved / Version ${saved.version}`;
    notify(publish ? saved.status === 'scheduled' ? 'Article scheduled.' : 'Article published.' : 'Article draft saved.');
  } finally { saveNews.busy = false; }
};
const inquiriesView = async () => {
  const data = await api('/inquiries'); state.inquiries = data.inquiries;
  return `${heading('Inquiries', '', `${data.retentionDays}-day retention`)}${data.inquiries.length ? `<div class="table-wrap"><table><thead><tr><th>From</th><th>Company</th><th>Status</th><th>Received</th><th></th></tr></thead><tbody>${data.inquiries.map((entry) => `<tr><td><button class="row-title" type="button" data-open-inquiry="${entry.id}">${escapeHtml(entry.name)}</button><div class="subtle">${escapeHtml(entry.email)}</div></td><td>${escapeHtml(entry.company)}</td><td>${badge(entry.status)}</td><td>${date(entry.created_at)}</td><td>${iconButton('Open inquiry', 'arrow-up-right', `data-open-inquiry="${entry.id}"`)}</td></tr>`).join('')}</tbody></table></div>` : empty('No inquiries yet.')}`;
};
const usersView = async () => {
  state.users = (await api('/users')).users;
  return `${heading('Users', button('Add user', 'user-plus', 'data-new-user', true))}<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>MFA</th><th>Status</th><th></th></tr></thead><tbody>${state.users.map((user) => `<tr><td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.email)}</td><td>${escapeHtml(user.role)}</td><td>${user.mfaEnabled ? 'Enabled' : 'Not enabled'}</td><td>${badge(user.active ? 'active' : 'inactive')}</td><td>${iconButton('Edit user', 'pencil', `data-edit-user="${user.id}"`)}</td></tr>`).join('')}</tbody></table></div>`;
};
const userEditor = (user = {}) => {
  state.editUser = user;
  showDialog(user.name || 'New user', `<form id="user-form"><div class="form-grid">${field('Name', 'name', user.name, { required: true })}${field('Email', 'email', user.email, { type: 'email', required: true })}${field(user.id ? 'New password' : 'Password', 'password', '', { type: 'password', required: !user.id })}<div class="field"><label for="user-role">Role</label><select id="user-role" name="role">${['viewer', 'editor', 'administrator', 'owner'].map((role) => `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role[0].toUpperCase() + role.slice(1)}</option>`).join('')}</select></div>${checkbox('Active account', 'active', user.active ?? true)}</div><footer class="form-footer"><button type="submit" class="button button--primary">Save user</button></footer></form>`);
};
const settingsActions = () => can('settings') ? `<button type="submit" class="button">${icon('save')}Save draft</button>${button('Preview / EN', 'eye', 'data-preview-settings="en"')}${button('Preview / EL', 'eye', 'data-preview-settings="el"')}${state.settings.hasUnpublishedChanges ? `${button('Publish settings', 'send', 'data-publish-settings', true)}${button('Discard draft', 'undo-2', 'data-discard-settings')}` : ''}` : '';
const settingsView = async () => {
  const settings = await api('/settings'); state.settings = settings;
  return `${heading('Settings', `<span class="save-state" id="settings-version">Version ${settings.version} / ${settings.hasUnpublishedChanges ? 'Draft changes' : 'Published'}</span>${button('Revisions', 'history', 'data-settings-revisions')}`)}<div class="editor-tabs" role="tablist" aria-label="Settings">${[['general', 'Business'], ['home-en', 'Homepage / EN'], ['home-el', 'Homepage / EL'], ['delivery', 'Media'], ['security', 'Security']].map(([key, label], index) => `<button class="editor-tab" type="button" role="tab" aria-selected="${index === 0}" id="tab-${key}" aria-controls="panel-${key}" data-editor-tab="${key}">${label}</button>`).join('')}</div><form id="settings-form">
  <section id="panel-general" role="tabpanel" aria-labelledby="tab-general"><div class="form-grid">${field('Email', 'email', settings.contact?.email, { type: 'email', required: true })}${field('Telephone', 'phone', settings.contact?.phone)}${field('Location', 'location', settings.contact?.location)}${field('Social profiles', 'social', (settings.social || []).map((entry) => `${entry.label} | ${entry.href}`).join('\n'), { area: true })}${field('Homepage SEO title', 'seo.title', settings.seo?.title)}${field('Homepage SEO description', 'seo.description', settings.seo?.description, { area: true })}${field('Homepage social image', 'seo.image', settings.seo?.image, { asset: true })}${checkbox('Exclude homepage from search indexing', 'seo.noindex', settings.seo?.noindex)}</div></section>
  ${['en', 'el'].map((language) => `<section id="panel-home-${language}" role="tabpanel" aria-labelledby="tab-home-${language}" hidden><div class="form-grid">${homepageFields.map((entry) => field(entry.label, `homepage.${language}.${entry.key}`, settings.homepage?.[language]?.[entry.key], { area: entry.area, wide: entry.area })).join('')}</div></section>`).join('')}
  <section id="panel-delivery" role="tabpanel" aria-labelledby="tab-delivery" hidden><div class="form-grid">${field('Desktop background film', 'videoSource', settings.videoSource, { asset: true })}${field('Mobile background film', 'mobileVideoSource', settings.mobileVideoSource, { asset: true })}${field('Showreel', 'showreelSource', settings.showreelSource, { asset: true })}</div></section><section id="panel-security" role="tabpanel" aria-labelledby="tab-security" hidden><h2>Two-factor authentication</h2><p class="subtle">${state.user.mfaEnabled ? 'Enabled' : 'Not enabled'}</p>${button(state.user.mfaEnabled ? 'Disable MFA' : 'Set up MFA', 'shield-check', state.user.mfaEnabled ? 'data-mfa-disable' : 'data-mfa-setup')}</section><footer class="form-footer" id="settings-actions">${settingsActions()}</footer></form>`;
};

const views = { dashboard, projects, media: mediaView, pages: pagesView, news: newsView, seo: seoView, articles: articlesView, clients: clientsView, inquiries: inquiriesView, users: usersView, settings: settingsView, activity: async () => `${heading('Activity log')}${activityTable((await api('/activity')).activity)}<div class="pagination">${button('Load more', 'chevron-down', 'data-more-activity')}</div>` };
const navigate = async (view, force = false) => {
  if (state.dirty && !force && !window.confirm('Discard unsaved changes?')) return;
  clearTimeout(state.saveTimer);
  state.dirty = false; state.view = views[view] ? view : 'dashboard';
  history.replaceState(null, '', `#${state.view}`);
  shell();
  const main = document.getElementById('console-main');
  try { main.innerHTML = await views[state.view](); }
  catch (error) { if (state.user) main.innerHTML = `${heading('Could not load this view')}${empty(error.message)}${button('Retry', 'rotate-cw', `data-view="${state.view}"`)}`; notify(error.message, true); }
  main.setAttribute('aria-busy', 'false'); refreshIcons();
};
const editProject = async (id, seo = false) => {
  if (state.dirty && !window.confirm('Discard unsaved changes?')) return;
  state.projects = (await api('/projects')).projects;
  const project = state.projects.find((entry) => entry.id === id);
  if (!project) throw new Error('Project not found.');
  state.dirty = false; state.view = 'projects'; shell();
  document.getElementById('console-main').innerHTML = projectEditor(project);
  document.getElementById('field-id').readOnly = true;
  refreshIcons();
  if (seo) activateTab('seo');
};
const activateTab = async (name) => {
  document.querySelectorAll('[data-editor-tab]').forEach((tab) => { tab.setAttribute('aria-selected', String(tab.dataset.editorTab === name)); document.getElementById(`panel-${tab.dataset.editorTab}`).hidden = tab.dataset.editorTab !== name; });
  if (name === 'revisions' && state.project?.id) {
    const revisions = (await api(`/projects/${state.project.id}/revisions`)).revisions;
    document.getElementById('revision-list').innerHTML = revisions.length ? `<div class="table-wrap"><table><thead><tr><th>Revision</th><th>Saved</th><th></th></tr></thead><tbody>${revisions.map((entry) => `<tr><td>#${entry.id}</td><td>${date(entry.created_at)}</td><td>${can('write') ? button('Restore draft', 'rotate-ccw', `data-restore-revision="${entry.id}"`) : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('No earlier revisions yet.'); refreshIcons();
  }
};

document.addEventListener('click', async (event) => {
  const target = event.target.closest('button,a,[data-media-details]');
  if (!target) return;
  try {
    if (target.hasAttribute('data-view')) { event.preventDefault(); await navigate(target.dataset.view); }
    if (target.hasAttribute('data-mobile-menu')) { const sidebar = document.getElementById('console-sidebar'); sidebar.classList.toggle('is-open'); target.setAttribute('aria-expanded', String(sidebar.classList.contains('is-open'))); }
    if (target.hasAttribute('data-logout')) { if (state.dirty && !confirm('Discard unsaved changes and sign out?')) return; await api('/logout', 'POST'); state.user = null; state.dirty = false; loginScreen(); await api('/session'); }
    if (target.hasAttribute('data-close-dialog')) { dialog.close(); state.picker = null; }
    if (target.hasAttribute('data-new-project')) { if (state.dirty && !confirm('Discard unsaved changes?')) return; state.view = 'projects'; state.dirty = false; shell(); document.getElementById('console-main').innerHTML = projectEditor(); refreshIcons(); }
    if (target.hasAttribute('data-edit-project')) await editProject(target.dataset.editProject, target.hasAttribute('data-open-seo'));
    if (target.hasAttribute('data-editor-tab')) await activateTab(target.dataset.editorTab);
    if (target.hasAttribute('data-add-row')) {
      const list = document.getElementById(`project-${target.dataset.addRow}`);
      list.insertAdjacentHTML('beforeend', orderedRow(target.dataset.addRow));
      list.dispatchEvent(new Event('input', { bubbles: true })); refreshIcons(); list.lastElementChild.querySelector('input').focus();
    }
    if (target.matches('[data-row-up],[data-row-down],[data-row-remove]')) {
      const row = target.closest('[data-ordered-row]'); const list = row.parentElement;
      if (target.hasAttribute('data-row-remove')) row.remove();
      else {
        if (target.hasAttribute('data-row-up') && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
        if (target.hasAttribute('data-row-down') && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
        row.querySelector(target.hasAttribute('data-row-up') ? '[data-row-up]' : '[data-row-down]').focus();
      }
      list.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById(`${list.id === 'project-gallery' ? 'gallery' : 'credits'}-order-status`).textContent = 'Order updated. Save the draft to keep these changes.';
    }
    if (target.hasAttribute('data-publish-project')) await saveProject(true);
    if (target.hasAttribute('data-archive-project') && confirm('Archive this project? It will leave the public website.')) await saveProject(false, false, 'archived');
    if (target.hasAttribute('data-unpublish-project') && confirm('Remove this project from the public website?')) { await api(`/projects/${state.project.id}/unpublish`, 'POST'); await navigate('projects', true); notify('Project unpublished.'); }
    if (target.hasAttribute('data-delete-project') && confirm('Delete this project? Media and revision history will be retained.')) { await api(`/projects/${state.project.id}`, 'DELETE'); await navigate('projects', true); notify('Project deleted.'); }
    if (target.hasAttribute('data-duplicate-project')) { const data = await api(`/projects/${target.dataset.duplicateProject}/duplicate`, 'POST'); await editProject(data.saved.id); notify('Project duplicated as a draft.'); }
    if (target.hasAttribute('data-restore-revision') && confirm('Restore this revision as a draft?')) { await api(`/projects/${state.project.id}/revisions/${target.dataset.restoreRevision}/restore`, 'POST'); await editProject(state.project.id); notify('Revision restored.'); }
    if (target.hasAttribute('data-preview-project')) showDialog('Draft preview', `<iframe class="preview-frame" title="Project draft preview" src="/api/admin/projects/${encodeURIComponent(state.project.id)}/preview.html"></iframe>`);
    if (target.hasAttribute('data-pick-media')) await mediaPicker(target.dataset.pickMedia);
    if (target.hasAttribute('data-choose-media')) {
      const asset = state.pickerAssets.find((entry) => entry.id === target.dataset.chooseMedia);
      if (state.picker === 'news-inline-image') {
        if (!asset.mime.startsWith('image/')) throw new Error('Choose an image for the article.');
        state.newsImageUrl = asset.url; state.picker = null;
        showDialog('Image details', `<form id="news-image-form">${field('Image alt text', 'alt', asset.metadata.alt?.[state.newsArticle.locale || 'en'], { required: true })}${field('Caption (optional)', 'caption')}<footer class="form-footer"><button type="submit" class="button button--primary">Insert image</button></footer></form>`);
        return;
      }
      const input = document.getElementById(state.picker);
      const preferred = input.name.includes('preview') ? asset.derivatives.find((entry) => entry.kind === 'preview') : input.name.includes('video') || input.name === 'showreelSource' ? asset.derivatives.find((entry) => entry.kind === 'film-1080') || asset.derivatives.find((entry) => entry.kind === 'film-720') : asset.derivatives.filter((entry) => entry.mime === 'image/webp').sort((first, second) => second.width - first.width)[0];
      input.value = preferred?.url || asset.url; input.dispatchEvent(new Event('input', { bubbles: true })); dialog.close(); state.picker = null;
    }
    if (target.hasAttribute('data-media-details')) await mediaDetails(target.dataset.mediaDetails);
    if (target.hasAttribute('data-media-page')) { state.mediaPage = Number(target.dataset.mediaPage); await navigate('media', true); }
    if (target.hasAttribute('data-retry-media')) { await api(`/media/${target.dataset.retryMedia}/retry`, 'POST'); dialog.close(); await navigate('media', true); notify('Processing queued.'); }
    if (target.hasAttribute('data-bulk-delete') && state.selected.size && confirm(`Delete ${state.selected.size} selected assets? Referenced media will be preserved.`)) { for (const id of state.selected) { try { await api(`/media/${id}`, 'DELETE'); } catch (error) { notify(error.message, true); } } state.selected.clear(); await navigate('media', true); }
    if (target.hasAttribute('data-bulk-collection') && state.selected.size) showDialog('Collection', `<form id="collection-form">${field('Collection name', 'collection', '', { required: true })}<footer class="form-footer"><button class="button button--primary" type="submit">Apply to selection</button></footer></form>`);
    if (target.hasAttribute('data-restore-original') && confirm('Restore this retained original? Current files will be retained and derivatives will be regenerated.')) {
      await api(`/media/${encodeURIComponent(state.asset.id)}/restore`, 'POST', { version: target.dataset.restoreOriginal, checksum: state.asset.checksum });
      dialog.close(); await navigate('media', true); notify('Original restored. Processing is queued.');
    }
    if (target.hasAttribute('data-site-content')) {
      const data = await api('/page-templates'); state.siteTemplates = data.pages;
      showDialog('Site content', `<div class="actions">${data.pages.map((page, index) => button(`${page.heading} / ${page.locale.toUpperCase()}`, 'pencil', `data-site-template="${index}"`)).join('')}</div>`);
    }
    if (target.hasAttribute('data-site-template')) {
      const template = state.siteTemplates[Number(target.dataset.siteTemplate)];
      const existing = state.pages.find((page) => page.id === template.id && page.locale === template.locale);
      dialog.close(); state.dirty = false; showPageEditor(existing || template);
    }
    if (target.hasAttribute('data-new-page')) { if (state.dirty && !confirm('Discard unsaved changes?')) return; state.dirty = false; state.view = 'pages'; shell(); showPageEditor(); }
    if (target.hasAttribute('data-edit-page')) { if (state.dirty && !confirm('Discard unsaved changes?')) return; const page = state.pages.find((entry) => `${entry.locale}:${entry.id}` === target.dataset.editPage); state.dirty = false; showPageEditor(page); }
    if (target.hasAttribute('data-add-block')) { document.getElementById('page-blocks').insertAdjacentHTML('beforeend', blockRow()); document.getElementById('page-blocks').dispatchEvent(new Event('input', { bubbles: true })); refreshIcons(); }
    if (target.hasAttribute('data-remove-block')) { target.closest('[data-block]').remove(); document.getElementById('page-blocks').dispatchEvent(new Event('input', { bubbles: true })); }
    if (target.hasAttribute('data-block-up')) { const row = target.closest('[data-block]'); if (row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling); row.dispatchEvent(new Event('input', { bubbles: true })); }
    if (target.hasAttribute('data-block-down')) { const row = target.closest('[data-block]'); if (row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row); row.dispatchEvent(new Event('input', { bubbles: true })); }
    if (target.hasAttribute('data-publish-page')) await savePage(true);
    if (target.hasAttribute('data-preview-page')) {
      if (state.dirty) { notify('Save the draft before previewing your latest changes.', true); return; }
      showDialog('Saved page draft preview', `<iframe class="preview-frame" title="Page draft preview" src="/api/admin/pages/${state.page.locale}/${encodeURIComponent(state.page.id)}/preview.html"></iframe>`);
    }
    if (target.hasAttribute('data-page-revisions')) {
      const data = await api(`/pages/${state.page.locale}/${state.page.id}/revisions`);
      showDialog('Page revisions', data.revisions.length ? `<div class="table-wrap"><table><thead><tr><th>Revision</th><th>Saved</th><th>Action</th></tr></thead><tbody>${data.revisions.map((revision) => `<tr><td>#${revision.id}</td><td>${date(revision.created_at)}</td><td>${can('write') ? button('Restore draft', 'rotate-ccw', `data-restore-page-revision="${revision.id}"`) : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('No earlier revisions yet.'));
    }
    if (target.hasAttribute('data-preview-settings')) {
      if (state.dirty) { notify('Save the draft before previewing your latest changes.', true); return; }
      const path = target.dataset.previewSettings === 'el' ? '/el/' : '/';
      showDialog('Saved settings preview', `<iframe class="preview-frame" title="Settings preview" src="/api/admin/settings/preview.html?version=${state.settings.version}&path=${encodeURIComponent(path)}"></iframe>`);
    }
    if (target.hasAttribute('data-settings-revisions')) {
      const data = await api('/settings/revisions');
      showDialog('Settings revisions', data.revisions.length ? `<div class="table-wrap"><table><thead><tr><th>Revision</th><th>Saved</th><th>Action</th></tr></thead><tbody>${data.revisions.map((revision) => `<tr><td>#${revision.id}</td><td>${date(revision.created_at)}</td><td>${can('settings') ? button('Restore settings', 'rotate-ccw', `data-restore-settings-revision="${revision.id}"`) : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('No earlier revisions yet.'));
    }
    if (target.matches('[data-publish-settings],[data-discard-settings]')) {
      if (state.dirty) throw new Error('Save or undo unsaved edits before publishing or discarding the saved draft.');
      const publish = target.hasAttribute('data-publish-settings');
      if (confirm(publish ? 'Publish the saved settings draft to the public site?' : 'Discard the saved settings draft? It will remain in revision history.')) {
        await api(`/settings/${publish ? 'publish' : 'discard'}`, 'POST', { version: state.settings.version });
        await navigate('settings', true); notify(publish ? 'Settings published.' : 'Settings draft discarded.');
      }
    }
    if (target.hasAttribute('data-restore-settings-revision') && confirm('Restore this revision as a draft? Unsaved edits will be discarded. The public site will not change until publication.')) {
      await api(`/settings/revisions/${target.dataset.restoreSettingsRevision}/restore`, 'POST', { version: state.settings.version });
      dialog.close(); await navigate('settings', true); notify('Settings restored as a draft.');
    }
    if (target.hasAttribute('data-restore-page-revision') && confirm('Restore this revision as a draft? Unsaved changes will be discarded.')) {
      const data = await api(`/pages/${state.page.locale}/${state.page.id}/revisions/${target.dataset.restorePageRevision}/restore`, 'POST', { version: state.page.version });
      state.dirty = false; dialog.close(); showPageEditor(data.saved); notify('Page revision restored as a draft.');
    }
    if (target.hasAttribute('data-unpublish-page') && confirm('Remove this page from the public website?')) {
      const data = await api(`/pages/${state.page.locale}/${state.page.id}/unpublish`, 'POST', { version: state.page.version });
      state.dirty = false; showPageEditor(data.saved); notify('Page unpublished.');
    }
    if (target.hasAttribute('data-delete-page') && confirm('Delete this page? Revision history and media will be retained.')) {
      await api(`/pages/${state.page.locale}/${state.page.id}`, 'DELETE', { version: state.page.version }); state.dirty = false; await navigate('pages', true); notify('Page deleted.');
    }
    if (target.hasAttribute('data-delete-redirect') && confirm('Delete this redirect?')) { await api('/redirects', 'DELETE', { source: target.dataset.deleteRedirect }); await navigate('seo', true); }
    if (target.hasAttribute('data-new-news')) { if (state.dirty && !confirm('Discard unsaved changes?')) return; state.dirty = false; await showNewsEditor(); }
    if (target.hasAttribute('data-edit-news')) { if (state.dirty && !confirm('Discard unsaved changes?')) return; state.dirty = false; await showNewsEditor(state.news.find((article) => `${article.locale}:${article.id}` === target.dataset.editNews)); }
    if (target.hasAttribute('data-publish-news')) await saveNews(true);
    if (target.hasAttribute('data-preview-news')) {
      if (state.dirty) throw new Error('Save the draft before previewing the latest changes.');
      showDialog('Saved article preview', `<iframe class="preview-frame" title="Article draft preview" src="/api/admin/pages/${state.newsArticle.locale}/${state.newsArticle.id}/preview.html"></iframe>`);
    }
    if (target.hasAttribute('data-translate-news')) {
      if (state.dirty && !confirm('Discard unsaved changes?')) return;
      const current = state.newsArticle; const locale = current.locale === 'en' ? 'el' : 'en';
      const other = (await api('/news')).news.find((article) => article.id === current.id && article.locale === locale);
      state.dirty = false; await showNewsEditor(other || { id: current.id, locale, thumbnail: current.thumbnail, imageAlt: '', author: current.author });
    }
    if (target.hasAttribute('data-news-revisions')) {
      const data = await api(`/pages/${state.newsArticle.locale}/${state.newsArticle.id}/revisions`);
      showDialog('Article revisions', data.revisions.length ? data.revisions.map((revision) => `<p>#${revision.id} / ${date(revision.created_at)} ${can('write') ? button('Restore draft', 'rotate-ccw', `data-restore-news-revision="${revision.id}"`) : ''}</p>`).join('') : empty('No earlier revisions yet.'));
    }
    if (target.hasAttribute('data-restore-news-revision') && confirm('Restore this revision as a private draft? Unsaved changes will be discarded.')) {
      const data = await api(`/pages/${state.newsArticle.locale}/${state.newsArticle.id}/revisions/${target.dataset.restoreNewsRevision}/restore`, 'POST', { version: state.newsArticle.version });
      state.dirty = false; dialog.close(); await showNewsEditor(data.saved); notify('Article restored as a draft.');
    }
    if (target.hasAttribute('data-retire-news') && confirm('Remove this article from public access? Saved history and media will be retained. Unsaved changes will be discarded.')) {
      const action = target.dataset.retireNews;
      const route = `/pages/${state.newsArticle.locale}/${state.newsArticle.id}`;
      const data = await api(`${route}${action === 'delete' ? '' : `/${action}`}`, action === 'delete' ? 'DELETE' : 'POST', { version: state.newsArticle.version });
      state.dirty = false;
      if (action === 'delete') await navigate('news', true); else await showNewsEditor(data.saved);
      notify(action === 'delete' ? 'Article deleted.' : action === 'archive' ? 'Article archived.' : 'Article unpublished.');
    }
    if (target.hasAttribute('data-new-article')) articleEditor();
    if (target.hasAttribute('data-edit-article')) articleEditor(state.articles.find((entry) => entry.id === target.dataset.editArticle));
    if (target.hasAttribute('data-delete-article') && confirm('Delete this article?')) { await api(`/articles/${state.article.id}`, 'DELETE'); dialog.close(); await navigate('articles', true); }
    if (target.hasAttribute('data-new-user')) userEditor();
    if (target.hasAttribute('data-edit-user')) userEditor(state.users.find((entry) => entry.id === target.dataset.editUser));
    if (target.hasAttribute('data-open-inquiry')) {
      const inquiry = state.inquiries.find((entry) => entry.id === target.dataset.openInquiry); state.inquiry = inquiry;
      if (inquiry.status === 'new') await api(`/inquiries/${inquiry.id}`, 'PATCH', { status: 'read' });
      showDialog(inquiry.name, `<p>${escapeHtml(inquiry.company)}</p><p class="inquiry-message">${escapeHtml(inquiry.message)}</p><p class="subtle">${escapeHtml(inquiry.email)} / ${date(inquiry.created_at)}</p><div class="actions"><a class="button button--primary" href="mailto:${escapeHtml(inquiry.email)}">${icon('reply')}Reply</a>${button('Mark replied', 'check-check', 'data-inquiry-status="replied"')}${button('Mark spam', 'shield-x', 'data-inquiry-status="spam"')}${button('Delete', 'trash-2', 'data-delete-inquiry')}</div>`);
    }
    if (target.hasAttribute('data-inquiry-status')) { await api(`/inquiries/${state.inquiry.id}`, 'PATCH', { status: target.dataset.inquiryStatus }); dialog.close(); await navigate('inquiries', true); }
    if (target.hasAttribute('data-delete-inquiry') && confirm('Permanently delete this inquiry?')) { await api(`/inquiries/${state.inquiry.id}`, 'DELETE'); dialog.close(); await navigate('inquiries', true); }
    if (target.hasAttribute('data-mfa-setup')) showDialog('Set up two-factor authentication', `<form id="mfa-setup-form">${field('Current password', 'password', '', { type: 'password', required: true })}<footer class="form-footer"><button type="submit" class="button button--primary">Continue</button></footer></form>`);
    if (target.hasAttribute('data-mfa-disable')) showDialog('Disable two-factor authentication', `<form id="mfa-disable-form">${field('Current password', 'password', '', { type: 'password', required: true })}${field('Verification or recovery code', 'token', '', { required: true })}<footer class="form-footer"><button type="submit" class="button button--danger">Disable MFA</button></footer></form>`);
    if (target.hasAttribute('data-more-activity')) { state.activityOffset = (state.activityOffset || 0) + 50; const data = await api(`/activity?offset=${state.activityOffset}`); target.parentElement.insertAdjacentHTML('beforebegin', activityTable(data.activity)); if (data.activity.length < 50) target.disabled = true; }
  } catch (error) { notify(error.message, true); }
});

document.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const formId = form.getAttribute('id');
  const values = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    if (formId === 'login-form') { await api('/session'); const data = await api('/login', 'POST', values); state.user = data.user; await navigate('dashboard', true); }
    if (formId === 'project-form') await saveProject();
    if (formId === 'page-form') await savePage();
    if (formId === 'news-form') await saveNews();
    if (formId === 'news-image-form') {
      const index = state.newsSelection;
      state.newsEditor.insertEmbed(index, 'image', state.newsImageUrl, 'user');
      const image = [...state.newsEditor.root.querySelectorAll('img')].find((element) => element.getAttribute('src') === state.newsImageUrl && !element.alt);
      if (image) state.newsEditor.formatText(index, 1, 'alt', values.alt, 'user');
      if (values.caption) state.newsEditor.insertText(index + 1, `\n${values.caption}\n`, { italic: true }, 'user');
      dialog.close(); state.newsEditor.focus();
    }
    if (formId === 'media-metadata-form') { await api(`/media/${state.asset.id}`, 'PATCH', { title: values.title, collection: values.collection, alt: { en: values['alt.en'], el: values['alt.el'] }, tags: values.tags.split(',').map((entry) => entry.trim()).filter(Boolean), rights: values.rights, attribution: values.attribution }); dialog.close(); await navigate('media', true); notify('Media metadata saved.'); }
    if (formId === 'collection-form') { for (const id of state.selected) { const asset = state.media.find((entry) => entry.id === id); if (asset) await api(`/media/${id}`, 'PATCH', { ...asset.metadata, collection: values.collection }); } dialog.close(); state.selected.clear(); await navigate('media', true); notify('Collection updated.'); }
    if (formId === 'article-form') { await api('/articles', 'POST', values); dialog.close(); await navigate('articles', true); notify('Article saved.'); }
    if (formId === 'clients-form') { await api('/clients', 'POST', { clients: toLines(values.clients) }); state.dirty = false; notify('Clients saved.'); }
    if (formId === 'redirect-form') { await api('/redirects', 'POST', values); state.dirty = false; await navigate('seo', true); notify('Redirect added.'); }
    if (formId === 'user-form') { const input = { ...values, active: form.elements.active.checked }; if (!input.password) delete input.password; await api(state.editUser.id ? `/users/${state.editUser.id}` : '/users', state.editUser.id ? 'PATCH' : 'POST', input); dialog.close(); await navigate('users', true); notify('User saved.'); }
    if (formId === 'settings-form') {
      const editSequence = state.editSequence;
      const settings = { videoSource: values.videoSource, mobileVideoSource: values.mobileVideoSource, showreelSource: values.showreelSource, contact: { email: values.email, phone: values.phone, location: values.location }, social: toLines(values.social).map((entry) => { const [label, ...url] = entry.split('|'); return { label: label.trim(), href: url.join('|').trim() }; }).filter((entry) => entry.label && safeExternalUrl(entry.href)), seo: { title: values['seo.title'], description: values['seo.description'], image: values['seo.image'], noindex: form.elements['seo.noindex'].checked }, homepage: Object.fromEntries(['en', 'el'].map((language) => [language, Object.fromEntries(homepageFields.map((entry) => [entry.key, values[`homepage.${language}.${entry.key}`] || '']))])) };
      state.settings = await api('/settings', 'POST', { ...settings, version: state.settings.version }); state.dirty = state.editSequence !== editSequence; document.getElementById('settings-version').textContent = `Version ${state.settings.version} / Draft changes`; document.getElementById('settings-actions').innerHTML = settingsActions(); refreshIcons(); notify(state.dirty ? 'Settings draft saved. Newer changes are not saved.' : 'Settings draft saved.');
    }
    if (formId === 'mfa-setup-form') {
      const data = await api('/mfa/setup', 'POST', values);
      showDialog('Authenticator setup', `<p class="subtle">Authenticator secret</p><code class="recovery-codes">${escapeHtml(data.secret)}</code><p><a href="${escapeHtml(data.uri)}">Open authenticator</a></p><form id="mfa-confirm-form">${field('Verification code', 'token', '', { required: true })}<footer class="form-footer"><button type="submit" class="button button--primary">Enable MFA</button></footer></form>`);
    }
    if (formId === 'mfa-confirm-form') { const data = await api('/mfa/confirm', 'POST', values); state.user.mfaEnabled = true; showDialog('Recovery codes', `<code class="recovery-codes">${data.recoveryCodes.map(escapeHtml).join('\n')}</code><p class="subtle">Keep these private. Each code can be used once.</p>`); }
    if (formId === 'mfa-disable-form') { await api('/mfa/disable', 'POST', values); state.user.mfaEnabled = false; dialog.close(); await navigate('settings', true); notify('MFA disabled.'); }
  } catch (error) {
    if (formId === 'login-form') { const message = document.getElementById('login-error'); message.hidden = false; message.textContent = error.message; }
    else notify(error.message, true);
  } finally { if (submit?.isConnected) submit.disabled = false; }
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.closest('#project-form,#page-form,#settings-form,#clients-form,#news-form')) {
    state.editSequence = (state.editSequence || 0) + 1;
    if (target.name !== 'autosave') state.dirty = true;
    if (target.closest('#project-form') && state.autosave && state.dirty) {
      clearTimeout(state.saveTimer);
      state.saveTimer = setTimeout(() => { if (document.getElementById('field-name')?.value.trim()) saveProject(false, true).catch((error) => notify(error.message, true)); }, 1800);
    }
  }
  if (target.id === 'project-search' || target.id === 'project-status') {
    const query = document.getElementById('project-search').value.toLowerCase(); const status = document.getElementById('project-status').value;
    document.querySelectorAll('[data-project-row]').forEach((row) => { row.hidden = !row.dataset.search.includes(query) || Boolean(status && row.dataset.status !== status); });
  }
  if (target.id === 'media-search') {
    state.mediaQuery = target.value; state.mediaPage = 1;
    clearTimeout(state.searchTimer); state.searchTimer = setTimeout(async () => { await navigate('media', true); const input = document.getElementById('media-search'); input?.focus(); input?.setSelectionRange(input.value.length, input.value.length); }, 350);
  }
  if (target.id === 'picker-search') {
    clearTimeout(state.pickerTimer); state.pickerTimer = setTimeout(async () => { try { state.pickerAssets = (await api(`/media?q=${encodeURIComponent(target.value)}`)).media; document.getElementById('picker-grid').innerHTML = state.pickerAssets.map((asset) => mediaCard(asset, true)).join(''); refreshIcons(); } catch (error) { notify(error.message, true); } }, 300);
  }
});
document.addEventListener('change', async (event) => {
  try {
    const target = event.target;
    if (target.name === 'autosave') state.autosave = target.checked;
    if (target.hasAttribute('data-select-media')) { if (target.checked) state.selected.add(target.dataset.selectMedia); else state.selected.delete(target.dataset.selectMedia); }
    if (target.id === 'media-type') { state.mediaType = target.value; state.mediaPage = 1; await navigate('media', true); }
    if (target.name === 'unused') { state.unused = target.checked; state.mediaPage = 1; await navigate('media', true); }
    if (target.id === 'media-upload') await uploadFiles(target.files);
    if (target.id === 'media-replace') await uploadFiles(target.files, state.asset.id);
    if (target.id === 'news-upload' && target.files[0]) {
      const result = await uploadFile(target.files[0]);
      const input = document.getElementById('field-thumbnail'); input.value = result.url; input.dispatchEvent(new Event('input', { bubbles: true })); notify('Featured image uploaded.');
    }
  } catch (error) { notify(error.message, true); }
});
document.addEventListener('dragover', (event) => { const zone = event.target.closest('#media-dropzone'); if (zone) { event.preventDefault(); zone.classList.add('is-dragging'); } });
document.addEventListener('dragstart', (event) => {
  const handle = event.target.closest('[data-drag-row]');
  if (handle) { event.dataTransfer.setData('text/x-anchev-row', handle.closest('[data-ordered-row]').id); event.dataTransfer.effectAllowed = 'move'; }
});
document.addEventListener('dragover', (event) => { if (event.target.closest('[data-ordered-row]')) event.preventDefault(); });
document.addEventListener('drop', (event) => {
  const row = event.target.closest('[data-ordered-row]');
  const moved = document.getElementById(event.dataTransfer.getData('text/x-anchev-row'));
  if (!row || !moved || moved === row || moved.parentElement !== row.parentElement) return;
  event.preventDefault(); row.parentElement.insertBefore(moved, row); moved.dispatchEvent(new Event('input', { bubbles: true }));
});
document.addEventListener('dragleave', (event) => event.target.closest('#media-dropzone')?.classList.remove('is-dragging'));
document.addEventListener('drop', async (event) => { if (!event.target.closest('#media-dropzone')) return; event.preventDefault(); try { await uploadFiles(event.dataTransfer.files); } catch (error) { notify(error.message, true); } });
document.addEventListener('keydown', (event) => {
  const tab = event.target.closest('[role="tab"]');
  if (tab && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')]; const index = tabs.indexOf(tab); const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; next.focus(); next.click();
  }
  if (event.key === 'Escape') { document.getElementById('console-sidebar')?.classList.remove('is-open'); document.querySelector('[data-mobile-menu]')?.setAttribute('aria-expanded', 'false'); }
});
window.addEventListener('beforeunload', (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
const init = async () => {
  try { const data = await api('/session'); state.user = data.user; if (!state.user) loginScreen(); else await navigate(location.hash.slice(1) || 'dashboard', true); }
  catch (error) { root.innerHTML = empty(error.message); notify(error.message, true); }
};
init();