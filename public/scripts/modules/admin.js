import { renderProjectBrowser, renderProjects } from '/scripts/modules/projects.js?v=20261010-project';
import { renderArticles } from '/scripts/modules/articles.js';
import { renderClients } from '/scripts/modules/clients.js?v=20261006-index';
import { escapeHtml } from '/scripts/modules/content-markup.js';
import { renderContact } from '/scripts/modules/contact.js';
import { refreshFilmExperience } from '/scripts/modules/experience.js?v=20261010-studio-page';
import { panelMap, setVideoSource } from '/scripts/modules/ui.js?v=20261010-navigation-motion';
import { siteContent } from '/scripts/content.js';

let adminSecret = null;
let adminOverlay = null;
let adminClientsList = [];
let adminArticlesList = [];
let adminSocialLinks = [];

const ADMIN_HTML = `
<div class="admin-overlay" id="admin-overlay" aria-hidden="true">
  <div class="admin-shell">
    <div class="admin-header">
      <span class="admin-brand">Anchev Admin</span>
      <button class="admin-close-btn" id="admin-close" type="button">Close</button>
    </div>
    <div class="admin-body">
      <div id="admin-locked" class="admin-locked">
        <h2 class="admin-heading">Restricted Access</h2>
        <p class="admin-sub">Enter the admin secret to manage site content.</p>
        <div class="admin-input-row">
          <input class="admin-input" type="password" id="admin-secret-input" placeholder="Secret" autocomplete="new-password" spellcheck="false" />
          <button class="admin-btn admin-btn-primary" id="admin-unlock" type="button">Unlock</button>
        </div>
        <p class="admin-error" id="admin-error" hidden></p>
      </div>
      <div id="admin-panel" hidden>
        <div class="admin-tabs">
          <button class="admin-tab is-active" data-tab="projects" type="button">Projects</button>
          <button class="admin-tab" data-tab="clients" type="button">Clients</button>
          <button class="admin-tab" data-tab="articles" type="button">Articles</button>
          <button class="admin-tab" data-tab="settings" type="button">Site Settings</button>
        </div>
        <div id="admin-tab-projects" class="admin-tab-panel">
        <div class="admin-cols">
          <div class="admin-col-form">
            <h2 class="admin-heading">Add / Edit Project</h2>
            <form id="admin-form" class="admin-form" autocomplete="off">
              <div class="admin-field">
                <label for="afield-id">ID <span class="admin-hint">(auto-generated from name if blank)</span></label>
                <input class="admin-input" type="text" id="afield-id" name="id" placeholder="aether-launch" autocomplete="off" />
              </div>
              <div class="admin-field">
                <label for="afield-name">Name *</label>
                <input class="admin-input" type="text" id="afield-name" name="name" placeholder="Aether Launch" autocomplete="off" required />
              </div>
              <div class="admin-field">
                <label for="afield-client">Client</label>
                <input class="admin-input" type="text" id="afield-client" name="client" placeholder="AETHER" autocomplete="off" />
              </div>
              <div class="admin-field-row">
                <div class="admin-field">
                  <label for="afield-category">Category</label>
                  <input class="admin-input" type="text" id="afield-category" name="category" placeholder="Brand Launch" autocomplete="off" />
                </div>
                <div class="admin-field">
                  <label for="afield-year">Year</label>
                  <input class="admin-input" type="text" id="afield-year" name="year" placeholder="2026" autocomplete="off" />
                </div>
              </div>
              <div class="admin-field">
                <label for="afield-link">Project Link <span class="admin-hint">(optional — external page or URL)</span></label>
                <input class="admin-input" type="text" id="afield-link" name="link" placeholder="https://\u2026" autocomplete="off" />
              </div>
              <div class="admin-field">
                <label>Thumbnail <span class="admin-hint">(image shown on the card)</span></label>
                <div class="admin-upload-row">
                  <label class="admin-btn admin-upload-btn" for="afield-thumb-pick">Browse\u2026</label>
                  <input type="file" id="afield-thumb-pick" accept="image/*" style="display:none" data-target="afield-thumbnail" data-status="afield-thumb-status" />
                  <input class="admin-input admin-upload-url" type="text" id="afield-thumbnail" name="thumbnail" placeholder="https://\u2026 or pick a file" autocomplete="off" />
                </div>
                <p class="admin-hint admin-upload-status" id="afield-thumb-status"></p>
              </div>
              <div class="admin-field">
                <label>Preview Loop <span class="admin-hint">(optional short muted hover video)</span></label>
                <div class="admin-upload-row">
                  <label class="admin-btn admin-upload-btn" for="afield-preview-pick">Browse...</label>
                  <input type="file" id="afield-preview-pick" accept="video/mp4,video/webm,video/quicktime" style="display:none" data-target="afield-preview" data-status="afield-preview-status" />
                  <input class="admin-input admin-upload-url" type="text" id="afield-preview" name="preview" placeholder="https://... or pick a file" autocomplete="off" />
                </div>
                <p class="admin-hint admin-upload-status" id="afield-preview-status"></p>
              </div>
              <div class="admin-field">
                <label>Video <span class="admin-hint">(played in the card — mp4 / webm / mov)</span></label>
                <div class="admin-upload-row">
                  <label class="admin-btn admin-upload-btn" for="afield-video-pick">Browse\u2026</label>
              <div class="admin-field-row">
                <div class="admin-field">
                  <label for="afield-location">Location</label>
                  <input class="admin-input" type="text" id="afield-location" name="location" placeholder="Athens, Greece" autocomplete="off" />
                </div>
                <div class="admin-field">
                  <label for="afield-duration">Runtime</label>
                  <input class="admin-input" type="text" id="afield-duration" name="duration" placeholder="00:47" autocomplete="off" />
                </div>
              </div>
              <div class="admin-case-study-fields">
                <h3 class="admin-subheading">Case Study</h3>
                <div class="admin-field">
                  <label for="afield-brief">The Brief</label>
                  <textarea class="admin-input admin-textarea" id="afield-brief" name="brief" placeholder="What needed to be achieved?" rows="3"></textarea>
                </div>
                <div class="admin-field">
                  <label for="afield-approach">Our Approach</label>
                  <textarea class="admin-input admin-textarea" id="afield-approach" name="approach" placeholder="How did the production answer the brief?" rows="3"></textarea>
                </div>
                <div class="admin-field">
                  <label for="afield-production">The Production</label>
                  <textarea class="admin-input admin-textarea" id="afield-production" name="production" placeholder="Useful production story or context." rows="3"></textarea>
                </div>
                <div class="admin-field-row">
                  <div class="admin-field">
                    <label for="afield-services">Services <span class="admin-hint">(one per line)</span></label>
                    <textarea class="admin-input admin-textarea" id="afield-services" name="services" placeholder="Production&#10;Post Production" rows="3"></textarea>
                  </div>
                  <div class="admin-field">
                    <label for="afield-deliverables">Deliverables <span class="admin-hint">(one per line)</span></label>
                    <textarea class="admin-input admin-textarea" id="afield-deliverables" name="deliverables" placeholder="Film&#10;Social cutdowns" rows="3"></textarea>
                  </div>
                </div>
                <div class="admin-field">
                  <label>Behind-the-Frame Media <span class="admin-hint">(shown while visitors hold the finished frame)</span></label>
                  <div class="admin-upload-row">
                    <label class="admin-btn admin-upload-btn" for="afield-behind-pick">Browse...</label>
                    <input type="file" id="afield-behind-pick" accept="image/*,video/mp4,video/webm,video/quicktime" style="display:none" data-target="afield-behind-frame" data-status="afield-behind-status" />
                    <input class="admin-input admin-upload-url" type="text" id="afield-behind-frame" name="behindFrame" placeholder="https://... or pick a file" autocomplete="off" />
                  </div>
                  <p class="admin-hint admin-upload-status" id="afield-behind-status"></p>
                </div>
                <div class="admin-field">
                  <label for="afield-behind-video">Behind-the-Scenes Film</label>
                  <input class="admin-input" type="text" id="afield-behind-video" name="behindVideo" placeholder="YouTube URL or /uploads/film.mp4" autocomplete="off" />
                </div>
                <div class="admin-field">
                  <label for="afield-press-link">Press Article URL</label>
                  <input class="admin-input" type="url" id="afield-press-link" name="pressLink" autocomplete="off" />
                </div>
                <div class="admin-field">
                  <label for="afield-press-title">Press Article Label</label>
                  <input class="admin-input" type="text" id="afield-press-title" name="pressTitle" autocomplete="off" />
                </div>
                <div class="admin-field">
                  <label for="afield-frames">Selected Frame URLs <span class="admin-hint">(one image URL per line)</span></label>
                  <textarea class="admin-input admin-textarea" id="afield-frames" name="frames" placeholder="/uploads/frame-01.jpg&#10;/uploads/frame-02.jpg" rows="4"></textarea>
                </div>
              </div>
                  <input type="file" id="afield-video-pick" accept="video/mp4,video/webm,video/quicktime" style="display:none" data-target="afield-video" data-status="afield-video-status" />
                  <input class="admin-input admin-upload-url" type="text" id="afield-video" name="video" placeholder="https://\u2026 or pick a file" autocomplete="off" />
                </div>
                <p class="admin-hint admin-upload-status" id="afield-video-status"></p>
              </div>
              <div class="admin-field">
                <label for="afield-note">Description</label>
                  <div class="admin-credits-row">
                    <span class="admin-credits-role-label">Producer</span>
                    <input class="admin-input" type="text" id="afield-credit-producer" placeholder="Name" autocomplete="off" />
                  </div>
                <textarea class="admin-input admin-textarea" id="afield-note" name="note" placeholder="Short description of the project\u2026" rows="3"></textarea>
              </div>
              <div class="admin-field">
                <label>Credits</label>
                <div class="admin-credits-fixed">
                  <div class="admin-credits-row">
                    <span class="admin-credits-role-label">Director</span>
                    <input class="admin-input" type="text" id="afield-credit-director" placeholder="Name" autocomplete="off" />
                  </div>
                  <div class="admin-credits-row">
                    <span class="admin-credits-role-label">DOP</span>
                    <input class="admin-input" type="text" id="afield-credit-dop" placeholder="Name" autocomplete="off" />
                  </div>
                </div>
                <div id="afield-credits-extra" class="admin-credits-extra"></div>
                <button class="admin-btn admin-btn-sm" type="button" id="afield-credit-add" style="margin-top:0.5rem">+ Add role</button>
              </div>
              <div class="admin-form-actions">
                <button class="admin-btn admin-btn-primary" type="submit" id="admin-submit">Save</button>
                <button class="admin-btn" type="button" id="admin-cancel">Clear</button>
              </div>
              <p class="admin-error" id="admin-form-error" hidden></p>
            </form>
          </div>
          <div class="admin-col-list">
            <h2 class="admin-heading">All Projects</h2>
            <div id="admin-list" class="admin-list"></div>
          </div>
        </div>
        </div>
        <div id="admin-tab-clients" class="admin-tab-panel" hidden>
          <div class="admin-clients-wrap">
            <h2 class="admin-heading">Client Strip</h2>
            <p class="admin-hint">One client per line. Shown in the selected-clients field on the homepage.</p>
            <div id="admin-clients-list" class="admin-clients-list"></div>
            <div class="admin-clients-add-row">
              <input class="admin-input" type="text" id="admin-clients-new" placeholder="NEW CLIENT" autocomplete="off" />
              <button class="admin-btn" type="button" id="admin-clients-add">+ Add</button>
            </div>
            <div class="admin-form-actions" style="margin-top:1.25rem">
              <button class="admin-btn admin-btn-primary" type="button" id="admin-clients-save">Save Changes</button>
            </div>
            <p class="admin-error" id="admin-clients-error" hidden></p>
          </div>
        </div>
        <div id="admin-tab-articles" class="admin-tab-panel" hidden>
          <div class="admin-cols">
            <div class="admin-col-form">
              <h2 class="admin-heading">Add / Edit Article</h2>
              <form id="admin-article-form" class="admin-form" autocomplete="off">
                <input type="hidden" id="article-field-id" name="id" />
                <div class="admin-field">
                  <label for="article-field-title">Title *</label>
                  <input class="admin-input" type="text" id="article-field-title" name="title" autocomplete="off" required />
                </div>
                <div class="admin-field-row">
                  <div class="admin-field">
                    <label for="article-field-publisher">Publisher</label>
                    <input class="admin-input" type="text" id="article-field-publisher" name="publisher" placeholder="TO BHMA" autocomplete="off" />
                  </div>
                  <div class="admin-field">
                    <label for="article-field-date">Publication date</label>
                    <input class="admin-input" type="date" id="article-field-date" name="publishedAt" />
                  </div>
                </div>
                <div class="admin-field">
                  <label for="article-field-language">Article language</label>
                  <select class="admin-input" id="article-field-language" name="language">
                    <option value="en">English</option>
                    <option value="el">Greek</option>
                  </select>
                </div>
                <div class="admin-field">
                  <label for="article-field-url">Article URL *</label>
                  <input class="admin-input" type="url" id="article-field-url" name="url" placeholder="https://..." autocomplete="off" required />
                </div>
                <div class="admin-field">
                  <label for="article-field-summary">Summary</label>
                  <textarea class="admin-input admin-textarea" id="article-field-summary" name="summary" rows="4" placeholder="A short original summary for the site."></textarea>
                </div>
                <div class="admin-form-actions">
                  <button class="admin-btn admin-btn-primary" type="submit" id="admin-article-submit">Save</button>
                  <button class="admin-btn" type="button" id="admin-article-cancel">Clear</button>
                </div>
                <p class="admin-error" id="admin-article-error" hidden></p>
              </form>
            </div>
            <div class="admin-col-list">
              <h2 class="admin-heading">Published Articles</h2>
              <div id="admin-articles-list" class="admin-list"></div>
            </div>
          </div>
        </div>
        <div id="admin-tab-settings" class="admin-tab-panel" hidden>
          <div class="admin-clients-wrap" style="max-width:52rem">
            <h2 class="admin-heading" style="margin-bottom:1.5rem">Hero Video</h2>
            <div class="admin-field">
              <label>Video source <span class="admin-hint">(YouTube link or mp4 / webm / mov)</span></label>
              <div class="admin-upload-row">
                <label class="admin-btn admin-upload-btn" for="aset-video-pick">Browse&hellip;</label>
                <input type="file" id="aset-video-pick" accept="video/mp4,video/webm,video/quicktime" style="display:none" data-target="aset-video-url" data-status="aset-video-status" />
                <input class="admin-input admin-upload-url" type="text" id="aset-video-url" placeholder="https://youtu.be/... or /media/showreel.mp4" autocomplete="off" />
              </div>
              <p class="admin-hint admin-upload-status" id="aset-video-status"></p>
            </div>
            <div class="admin-field" style="margin-top:1rem">
              <label>Mobile hero source <span class="admin-hint">(optimized native mp4 / webm / mov)</span></label>
              <div class="admin-upload-row">
                <label class="admin-btn admin-upload-btn" for="aset-mobile-video-pick">Browse...</label>
                <input type="file" id="aset-mobile-video-pick" accept="video/mp4,video/webm,video/quicktime" style="display:none" data-target="aset-mobile-video-url" data-status="aset-mobile-video-status" />
                <input class="admin-input admin-upload-url" type="text" id="aset-mobile-video-url" placeholder="/media/hero-video-mobile.mp4" autocomplete="off" />
              </div>
              <p class="admin-hint admin-upload-status" id="aset-mobile-video-status"></p>
            </div>
            <div class="admin-field" style="margin-top:1rem">
              <label>Showreel source <span class="admin-hint">(native mp4 / webm / mov)</span></label>
              <div class="admin-upload-row">
                <label class="admin-btn admin-upload-btn" for="aset-showreel-pick">Browse...</label>
                <input type="file" id="aset-showreel-pick" accept="video/mp4,video/webm,video/quicktime" style="display:none" data-target="aset-showreel-url" data-status="aset-showreel-status" />
                <input class="admin-input admin-upload-url" type="text" id="aset-showreel-url" placeholder="/media/showreel.mp4" autocomplete="off" />
              </div>
              <p class="admin-hint admin-upload-status" id="aset-showreel-status"></p>
            </div>
            <hr style="border:none;border-top:1px solid var(--line);margin:2rem 0">
            <h2 class="admin-heading" style="margin-bottom:1.5rem">Contact Info</h2>
            <div class="admin-form">
              <div class="admin-field">
                <label for="aset-email">Email</label>
                <input class="admin-input" type="email" id="aset-email" placeholder="hello@anchevfilms.com" autocomplete="off" />
              </div>
              <div class="admin-field">
                <label for="aset-phone">Phone</label>
                <input class="admin-input" type="text" id="aset-phone" placeholder="+359 88 000 0000" autocomplete="off" />
              </div>
              <div class="admin-field">
                <label for="aset-location">Location</label>
                <input class="admin-input" type="text" id="aset-location" placeholder="Sofia, Bulgaria" autocomplete="off" />
              </div>
            </div>
            <hr style="border:none;border-top:1px solid var(--line);margin:2rem 0">
            <h2 class="admin-heading" style="margin-bottom:0.4rem">Social Links</h2>
            <p class="admin-hint" style="margin-bottom:1rem">Shown in the contact panel and project enquiry section.</p>
            <div id="aset-social-list" class="admin-list"></div>
            <div class="admin-clients-add-row" style="margin-top:0.75rem">
              <input class="admin-input" type="text" id="aset-social-label" placeholder="Label (e.g. Instagram)" autocomplete="off" style="max-width:13rem" />
              <input class="admin-input" type="text" id="aset-social-href" placeholder="https://…" autocomplete="off" />
              <button class="admin-btn" type="button" id="aset-social-add">+ Add</button>
            </div>
            <div class="admin-form-actions" style="margin-top:1.5rem">
              <button class="admin-btn admin-btn-primary" type="button" id="aset-save">Save Settings</button>
            </div>
            <p class="admin-error" id="aset-error" hidden></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`;

const showAdminError = (elId, msg) => {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.hidden = false;
};

const clearAdminError = (elId) => {
  const el = document.getElementById(elId);
  el.hidden = true;
  el.textContent = '';
};

const buildExtraCreditRow = (role = '', name = '') => `
  <div class="admin-credits-extra-row">
    <input class="admin-input extra-role" type="text" placeholder="Role" value="${role}" autocomplete="off" />
    <input class="admin-input extra-name" type="text" placeholder="Name" value="${name}" autocomplete="off" />
    <button class="admin-btn admin-btn-sm admin-btn-danger extra-remove" type="button">×</button>
  </div>`;

const splitLines = (value) => String(value || '')
  .split(/[\n,]/)
  .map((entry) => entry.trim())
  .filter(Boolean);

const resetAdminForm = () => {
  document.getElementById('admin-form').reset();
  document.getElementById('admin-submit').textContent = 'Save';
  document.getElementById('afield-credit-director').value = '';
  document.getElementById('afield-credit-producer').value = '';
  document.getElementById('afield-credit-dop').value = '';
  document.getElementById('afield-credits-extra').innerHTML = '';
  clearAdminError('admin-form-error');
};

const resetArticleForm = () => {
  document.getElementById('admin-article-form').reset();
  document.getElementById('article-field-id').value = '';
  document.getElementById('admin-article-submit').textContent = 'Save';
  clearAdminError('admin-article-error');
};

const loadAdminList = async () => {
  const adminListEl = document.getElementById('admin-list');
  adminListEl.innerHTML = '<p class="admin-loading">Loading\u2026</p>';
  try {
    const res = await fetch('/api/projects');
    const { projects } = await res.json();
    adminListEl._projects = projects;
    if (projects.length === 0) {
      adminListEl.innerHTML = '<p class="admin-loading">No projects yet.</p>';
      return;
    }
    adminListEl.innerHTML = projects
      .map(
        (p) => `
        <div class="admin-list-row" data-id="${p.id}">
          <div class="admin-list-info">
            <span class="admin-list-name">${p.name}</span>
            <span class="admin-list-meta">${[p.client, p.year].filter(Boolean).join(' \u00b7 ')}</span>
          </div>
          <div class="admin-list-actions">
            <button class="admin-btn admin-btn-sm" data-edit="${p.id}" type="button">Edit</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" data-delete="${p.id}" type="button">Delete</button>
          </div>
        </div>
      `
      )
      .join('');
  } catch (_err) {
    adminListEl.innerHTML = '<p class="admin-loading">Failed to load.</p>';
  }
};

const setAdminButtonVisible = (visible) => {
  const btn = document.getElementById('footer-admin-btn');
  if (btn) btn.hidden = !visible;
};

const showAdminLocked = () => {
  document.getElementById('admin-locked').hidden = false;
  document.getElementById('admin-panel').hidden = true;
  setAdminButtonVisible(false);
};

const showAdminPanel = () => {
  document.getElementById('admin-locked').hidden = true;
  document.getElementById('admin-panel').hidden = false;
  setAdminButtonVisible(true);
  loadAdminList();
  loadAdminClients();
  loadAdminArticles();
  loadAdminSettings();
};

const renderAdminClientsList = () => {
  const el = document.getElementById('admin-clients-list');
  if (!el) return;
  if (adminClientsList.length === 0) {
    el.innerHTML = '<p class="admin-loading">No clients yet.</p>';
    return;
  }
  el.innerHTML = adminClientsList
    .map(
      (name, i) => `
      <div class="admin-client-row" data-index="${i}">
        <span class="admin-client-name">${name}</span>
        <div class="admin-list-actions">
          <button class="admin-btn admin-btn-sm" data-move-up="${i}" type="button" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="admin-btn admin-btn-sm" data-move-down="${i}" type="button" ${i === adminClientsList.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="admin-btn admin-btn-sm admin-btn-danger" data-remove-client="${i}" type="button">×</button>
        </div>
      </div>`
    )
    .join('');
};

const loadAdminClients = async () => {
  try {
    const res = await fetch('/api/clients');
    const { clients } = await res.json();
    adminClientsList = clients;
    renderAdminClientsList();
  } catch (_err) {
    const el = document.getElementById('admin-clients-list');
    if (el) el.innerHTML = '<p class="admin-loading">Failed to load.</p>';
  }
};

const renderAdminArticlesList = () => {
  const element = document.getElementById('admin-articles-list');
  if (!element) return;
  if (!adminArticlesList.length) {
    element.innerHTML = '<p class="admin-loading">No articles yet.</p>';
    return;
  }

  element.innerHTML = adminArticlesList.map((article) => `
    <div class="admin-list-row" data-id="${escapeHtml(article.id)}">
      <div class="admin-list-info">
        <span class="admin-list-name">${escapeHtml(article.title)}</span>
        <span class="admin-list-meta">${escapeHtml([article.publisher, article.publishedAt].filter(Boolean).join(' · '))}</span>
      </div>
      <div class="admin-list-actions">
        <button class="admin-btn admin-btn-sm" data-edit-article="${escapeHtml(article.id)}" type="button">Edit</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger" data-delete-article="${escapeHtml(article.id)}" type="button">Delete</button>
      </div>
    </div>`).join('');
};

const loadAdminArticles = async () => {
  const element = document.getElementById('admin-articles-list');
  if (element) element.innerHTML = '<p class="admin-loading">Loading...</p>';
  try {
    const response = await fetch('/api/articles');
    const data = await response.json();
    adminArticlesList = Array.isArray(data.articles) ? data.articles : [];
    renderAdminArticlesList();
  } catch (_error) {
    if (element) element.innerHTML = '<p class="admin-loading">Failed to load.</p>';
  }
};

const renderAdminSocialList = () => {
  const el = document.getElementById('aset-social-list');
  if (!el) return;
  if (adminSocialLinks.length === 0) {
    el.innerHTML = '<p class="admin-loading">No social links yet.</p>';
    return;
  }
  el.innerHTML = adminSocialLinks
    .map(
      (link, i) => `
      <div class="admin-list-row">
        <div class="admin-list-info">
          <span class="admin-list-name">${link.label}</span>
          <span class="admin-list-meta">${link.href}</span>
        </div>
        <div class="admin-list-actions">
          <button class="admin-btn admin-btn-sm admin-btn-danger" data-remove-social="${i}" type="button">×</button>
        </div>
      </div>`
    )
    .join('');
};

const loadAdminSettings = async () => {
  try {
    const res = await fetch('/api/settings');
    const s = await res.json();
    document.getElementById('aset-video-url').value = s.videoSource || '';
    document.getElementById('aset-mobile-video-url').value = s.mobileVideoSource || '';
    document.getElementById('aset-showreel-url').value = s.showreelSource || '';
    document.getElementById('aset-email').value = s.contact?.email || '';
    document.getElementById('aset-phone').value = s.contact?.phone || '';
    document.getElementById('aset-location').value = s.contact?.location || '';
    adminSocialLinks = s.social || [];
    renderAdminSocialList();
  } catch (_err) {}
};

const bindAdminEvents = () => {
  document.getElementById('admin-unlock').addEventListener('click', async () => {
    const secret = document.getElementById('admin-secret-input').value.trim();
    if (!secret) return;
    const btn = document.getElementById('admin-unlock');
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      const res = await fetch('/api/admin/verify', {
        headers: { 'x-admin-secret': secret }
      });
      if (res.status === 401) {
        showAdminError('admin-error', 'Incorrect secret. Try again.');
        document.getElementById('admin-secret-input').select();
        return;
      }
      adminSecret = secret;
      clearAdminError('admin-error');
      showAdminPanel();
    } catch (_err) {
      showAdminError('admin-error', 'Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Unlock';
    }
  });

  document.getElementById('admin-secret-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('admin-unlock').click();
  });

  document.getElementById('admin-close').addEventListener('click', closeAdminOverlay);
  document.getElementById('admin-cancel').addEventListener('click', resetAdminForm);

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const target = tab.dataset.tab;
      document.getElementById('admin-tab-projects').hidden = target !== 'projects';
      document.getElementById('admin-tab-clients').hidden = target !== 'clients';
      document.getElementById('admin-tab-articles').hidden = target !== 'articles';
      document.getElementById('admin-tab-settings').hidden = target !== 'settings';
    });
  });

  document.getElementById('admin-article-cancel').addEventListener('click', resetArticleForm);

  document.getElementById('admin-article-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAdminError('admin-article-error');
    const formData = new FormData(event.currentTarget);
    const payload = {
      id: formData.get('id').trim() || `article-${Date.now()}`,
      title: formData.get('title').trim(),
      publisher: formData.get('publisher').trim(),
      publishedAt: formData.get('publishedAt').trim(),
      language: formData.get('language'),
      url: formData.get('url').trim(),
      summary: formData.get('summary').trim()
    };
    const submitButton = document.getElementById('admin-article-submit');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    try {
      const response = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify(payload)
      });
      if (response.status === 401) {
        adminSecret = null;
        showAdminLocked();
        showAdminError('admin-error', 'Invalid secret. Please re-enter.');
        return;
      }
      if (!response.ok) {
        const data = await response.json();
        showAdminError('admin-article-error', data.error || 'Failed to save article.');
        return;
      }
      const data = await response.json();
      adminArticlesList = data.articles;
      renderAdminArticlesList();
      resetArticleForm();
      await renderArticles();
      refreshFilmExperience();
    } catch (_error) {
      showAdminError('admin-article-error', 'Network error. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = document.getElementById('article-field-id').value ? 'Update' : 'Save';
    }
  });

  document.getElementById('admin-articles-list').addEventListener('click', async (event) => {
    const editId = event.target.dataset.editArticle;
    const deleteId = event.target.dataset.deleteArticle;
    if (editId) {
      const article = adminArticlesList.find((entry) => entry.id === editId);
      if (!article) return;
      document.getElementById('article-field-id').value = article.id;
      document.getElementById('article-field-title').value = article.title || '';
      document.getElementById('article-field-publisher').value = article.publisher || '';
      document.getElementById('article-field-date').value = article.publishedAt || '';
      document.getElementById('article-field-language').value = article.language || 'en';
      document.getElementById('article-field-url').value = article.url || '';
      document.getElementById('article-field-summary').value = article.summary || '';
      document.getElementById('admin-article-submit').textContent = 'Update';
      document.getElementById('article-field-title').focus();
      return;
    }

    if (deleteId && confirm('Delete this article?')) {
      try {
        const response = await fetch(`/api/admin/articles/${encodeURIComponent(deleteId)}`, {
          method: 'DELETE',
          headers: { 'x-admin-secret': adminSecret }
        });
        if (response.status === 401) {
          adminSecret = null;
          showAdminLocked();
          showAdminError('admin-error', 'Invalid secret. Please re-enter.');
          return;
        }
        if (!response.ok) throw new Error('Delete failed');
        const data = await response.json();
        adminArticlesList = data.articles;
        renderAdminArticlesList();
        resetArticleForm();
        await renderArticles();
        refreshFilmExperience();
      } catch (_error) {
        showAdminError('admin-article-error', 'Failed to delete. Please try again.');
      }
    }
  });

  const addClientFromInput = () => {
    const input = document.getElementById('admin-clients-new');
    const val = input.value.trim().toUpperCase();
    if (!val) return;
    if (!adminClientsList.includes(val)) adminClientsList.push(val);
    input.value = '';
    renderAdminClientsList();
  };
  document.getElementById('admin-clients-add').addEventListener('click', addClientFromInput);
  document.getElementById('admin-clients-new').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addClientFromInput(); }
  });

  document.getElementById('admin-clients-list').addEventListener('click', (e) => {
    const upIdx = e.target.dataset.moveUp;
    const downIdx = e.target.dataset.moveDown;
    const removeIdx = e.target.dataset.removeClient;
    if (upIdx !== undefined) {
      const i = Number(upIdx);
      if (i > 0) [adminClientsList[i - 1], adminClientsList[i]] = [adminClientsList[i], adminClientsList[i - 1]];
      renderAdminClientsList();
    } else if (downIdx !== undefined) {
      const i = Number(downIdx);
      if (i < adminClientsList.length - 1) [adminClientsList[i], adminClientsList[i + 1]] = [adminClientsList[i + 1], adminClientsList[i]];
      renderAdminClientsList();
    } else if (removeIdx !== undefined) {
      adminClientsList.splice(Number(removeIdx), 1);
      renderAdminClientsList();
    }
  });

  document.getElementById('admin-clients-save').addEventListener('click', async () => {
    clearAdminError('admin-clients-error');
    const btn = document.getElementById('admin-clients-save');
    btn.disabled = true;
    btn.textContent = 'Saving\u2026';
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ clients: adminClientsList })
      });
      if (res.status === 401) { adminSecret = null; showAdminLocked(); showAdminError('admin-error', 'Invalid secret.'); return; }
      if (!res.ok) { const e = await res.json(); showAdminError('admin-clients-error', e.error || 'Failed to save.'); return; }
      const { clients } = await res.json();
      adminClientsList = clients;
      renderAdminClientsList();
      await renderClients();
      refreshFilmExperience();
    } catch (_err) {
      showAdminError('admin-clients-error', 'Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });

  document.getElementById('afield-credit-add').addEventListener('click', () => {
    document.getElementById('afield-credits-extra').insertAdjacentHTML('beforeend', buildExtraCreditRow('', ''));
  });

  document.getElementById('afield-credits-extra').addEventListener('click', (e) => {
    if (e.target.classList.contains('extra-remove')) {
      e.target.closest('.admin-credits-extra-row').remove();
    }
  });

  const handleFilePick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetInput = document.getElementById(e.target.dataset.target);
    const statusEl = document.getElementById(e.target.dataset.status);
    statusEl.textContent = 'Uploading\u2026';
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-secret': adminSecret },
        body: fd
      });
      if (!res.ok) {
        const err = await res.json();
        statusEl.textContent = `Upload failed: ${err.error}`;
        return;
      }
      const { url } = await res.json();
      targetInput.value = url;
      statusEl.textContent = `\u2713 ${file.name}`;
    } catch (_err) {
      statusEl.textContent = 'Upload failed. Check your connection.';
    } finally {
      e.target.value = '';
    }
  };

  document.getElementById('afield-thumb-pick').addEventListener('change', handleFilePick);
  document.getElementById('afield-video-pick').addEventListener('change', handleFilePick);
  document.getElementById('afield-preview-pick').addEventListener('change', handleFilePick);
  document.getElementById('afield-behind-pick').addEventListener('change', handleFilePick);
  document.getElementById('aset-video-pick').addEventListener('change', handleFilePick);
  document.getElementById('aset-mobile-video-pick').addEventListener('change', handleFilePick);
  document.getElementById('aset-showreel-pick').addEventListener('change', handleFilePick);

  const addSocialLink = () => {
    const label = document.getElementById('aset-social-label').value.trim();
    const href = document.getElementById('aset-social-href').value.trim();
    if (!label || !href) return;
    adminSocialLinks.push({ label, href });
    document.getElementById('aset-social-label').value = '';
    document.getElementById('aset-social-href').value = '';
    renderAdminSocialList();
  };
  document.getElementById('aset-social-add').addEventListener('click', addSocialLink);
  document.getElementById('aset-social-href').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSocialLink(); }
  });

  document.getElementById('aset-social-list').addEventListener('click', (e) => {
    const i = e.target.dataset.removeSocial;
    if (i !== undefined) { adminSocialLinks.splice(Number(i), 1); renderAdminSocialList(); }
  });

  document.getElementById('aset-save').addEventListener('click', async () => {
    clearAdminError('aset-error');
    const btn = document.getElementById('aset-save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const payload = {
        videoSource: document.getElementById('aset-video-url').value.trim(),
        mobileVideoSource: document.getElementById('aset-mobile-video-url').value.trim(),
        showreelSource: document.getElementById('aset-showreel-url').value.trim(),
        contact: {
          email: document.getElementById('aset-email').value.trim(),
          phone: document.getElementById('aset-phone').value.trim(),
          location: document.getElementById('aset-location').value.trim()
        },
        social: adminSocialLinks
      };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) { adminSecret = null; showAdminLocked(); showAdminError('admin-error', 'Invalid secret.'); return; }
      if (!res.ok) { const e = await res.json(); showAdminError('aset-error', e.error || 'Failed to save.'); return; }
      const saved = await res.json();
      Object.assign(siteContent.contact, saved.contact);
      siteContent.contact.social = saved.social;
      siteContent.media.videoSource = saved.videoSource;
      siteContent.media.mobileVideoSource = saved.mobileVideoSource || siteContent.media.mobileVideoSource;
      siteContent.media.showreelSource = saved.showreelSource || siteContent.media.showreelSource;
      setVideoSource();
      renderContact();
      refreshFilmExperience();
    } catch (_err) {
      showAdminError('aset-error', 'Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Settings';
    }
  });

  document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAdminError('admin-form-error');
    const fd = new FormData(document.getElementById('admin-form'));
    const name = fd.get('name').trim();
    const rawId = fd.get('id').trim();
    const id = rawId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `project-${Date.now()}`;
    const director = document.getElementById('afield-credit-director').value.trim();
    const producer = document.getElementById('afield-credit-producer').value.trim();
    const dop = document.getElementById('afield-credit-dop').value.trim();
    const extraRows = document.querySelectorAll('#afield-credits-extra .admin-credits-extra-row');
    const credits = [];
    if (director) credits.push({ role: 'Director', name: director });
    if (producer) credits.push({ role: 'Producer', name: producer });
    if (dop) credits.push({ role: 'DOP', name: dop });
    extraRows.forEach((row) => {
      const role = row.querySelector('.extra-role').value.trim();
      const rowName = row.querySelector('.extra-name').value.trim();
      if (role && rowName) credits.push({ role, name: rowName });
    });

    const payload = {
      id,
      name,
      client: fd.get('client').trim(),
      category: fd.get('category').trim(),
      year: fd.get('year').trim(),
      link: fd.get('link').trim(),
      thumbnail: fd.get('thumbnail').trim(),
      video: fd.get('video').trim(),
      preview: fd.get('preview').trim(),
      behindFrame: fd.get('behindFrame').trim(),
      behindVideo: fd.get('behindVideo').trim(),
      pressLink: fd.get('pressLink').trim(),
      pressTitle: fd.get('pressTitle').trim(),
      location: fd.get('location').trim(),
      duration: fd.get('duration').trim(),
      director,
      producer,
      dop,
      services: splitLines(fd.get('services')),
      deliverables: splitLines(fd.get('deliverables')),
      brief: fd.get('brief').trim(),
      approach: fd.get('approach').trim(),
      production: fd.get('production').trim(),
      frames: splitLines(fd.get('frames')),
      credits,
      note: fd.get('note').trim()
    };

    if (!payload.id || !payload.name) {
      showAdminError('admin-form-error', 'Name is required.');
      return;
    }

    const submitBtn = document.getElementById('admin-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving\u2026';

    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        adminSecret = null;
        showAdminLocked();
        showAdminError('admin-error', 'Invalid secret. Please re-enter.');
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        showAdminError('admin-form-error', errData.error || 'Failed to save project.');
        return;
      }

      resetAdminForm();
      await loadAdminList();
      await renderProjectBrowser();
      if (panelMap.projects.classList.contains('is-open')) renderProjects();
    } catch (_err) {
      showAdminError('admin-form-error', 'Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save';
    }
  });

  document.getElementById('admin-list').addEventListener('click', async (e) => {
    const adminListEl = document.getElementById('admin-list');
    const editId = e.target.dataset.edit;
    const deleteId = e.target.dataset.delete;

    if (editId) {
      const project = adminListEl._projects?.find((p) => p.id === editId);
      if (!project) return;
      document.getElementById('afield-id').value = project.id;
      document.getElementById('afield-name').value = project.name;
      document.getElementById('afield-client').value = project.client || '';
      document.getElementById('afield-category').value = project.category || '';
      document.getElementById('afield-year').value = project.year || '';
      document.getElementById('afield-link').value = project.link || '';
      document.getElementById('afield-thumbnail').value = project.thumbnail || '';
      document.getElementById('afield-video').value = project.video || '';
      document.getElementById('afield-preview').value = project.preview || '';
      document.getElementById('afield-behind-frame').value = project.behindFrame || '';
      document.getElementById('afield-behind-video').value = project.behindVideo || '';
      document.getElementById('afield-press-link').value = project.pressLink || '';
      document.getElementById('afield-press-title').value = project.pressTitle || '';
      document.getElementById('afield-note').value = project.note || '';
      document.getElementById('afield-location').value = project.location || '';
      document.getElementById('afield-duration').value = project.duration || '';
      document.getElementById('afield-brief').value = project.brief || '';
      document.getElementById('afield-approach').value = project.approach || '';
      document.getElementById('afield-production').value = project.production || '';
      document.getElementById('afield-services').value = (project.services || []).join('\n');
      document.getElementById('afield-deliverables').value = (project.deliverables || []).join('\n');
      document.getElementById('afield-frames').value = (project.frames || []).join('\n');
      const creditsList = project.credits || [];
      const dirCredit = creditsList.find((c) => c.role === 'Director');
      const producerCredit = creditsList.find((c) => c.role === 'Producer');
      const dopCredit = creditsList.find((c) => c.role === 'DOP');
      document.getElementById('afield-credit-director').value = project.director || (dirCredit ? dirCredit.name : '');
      document.getElementById('afield-credit-producer').value = project.producer || (producerCredit ? producerCredit.name : '');
      document.getElementById('afield-credit-dop').value = project.dop || (dopCredit ? dopCredit.name : '');
      const extraEl = document.getElementById('afield-credits-extra');
      extraEl.innerHTML = '';
      creditsList
        .filter((c) => c.role !== 'Director' && c.role !== 'Producer' && c.role !== 'DOP')
        .forEach((c) => extraEl.insertAdjacentHTML('beforeend', buildExtraCreditRow(c.role, c.name)));
      document.getElementById('admin-submit').textContent = 'Update';
      document.getElementById('afield-name').focus();
      return;
    }

    if (deleteId) {
      const confirmed = confirm(`Delete project "${deleteId}"?`);
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/admin/projects/${encodeURIComponent(deleteId)}`, {
          method: 'DELETE',
          headers: { 'x-admin-secret': adminSecret }
        });
        if (res.status === 401) {
          adminSecret = null;
          showAdminLocked();
          showAdminError('admin-error', 'Invalid secret. Please re-enter.');
          return;
        }
        await loadAdminList();
        await renderProjectBrowser();
        if (panelMap.projects.classList.contains('is-open')) renderProjects();
      } catch (_err) {
        alert('Failed to delete. Please try again.');
      }
    }
  });
};

const mountAdmin = () => {
  if (adminOverlay) return;
  document.body.insertAdjacentHTML('beforeend', ADMIN_HTML);
  adminOverlay = document.getElementById('admin-overlay');
  bindAdminEvents();
};

export const openAdminOverlay = () => {
  mountAdmin();
  adminOverlay.classList.add('is-open');
  adminOverlay.setAttribute('aria-hidden', 'false');
  if (adminSecret) {
    showAdminPanel();
  } else {
    showAdminLocked();
    requestAnimationFrame(() => document.getElementById('admin-secret-input').focus());
  }
};

export const closeAdminOverlay = () => {
  if (!adminOverlay) return;
  adminOverlay.classList.remove('is-open');
  adminOverlay.setAttribute('aria-hidden', 'true');
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && adminOverlay?.classList.contains('is-open')) {
    closeAdminOverlay();
  }
});
