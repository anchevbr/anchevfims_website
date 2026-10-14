import { renderProjectCardMarkup, renderProjectFilmMarkup, renderProjectSupportingMarkup, setupProjectFilmPlayers } from '/scripts/modules/content-markup.js?v=20261010-project';

const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#039;',
  '"': '&quot;'
}[character]));

const safeAssetUrl = (value) => {
  const source = String(value || '').trim();
  return /^(?:\/(?!\/)|https?:\/\/)/i.test(source) ? source : '';
};

const isDirectVideo = (value) => /\.(?:mp4|webm|mov)(?:[?#].*)?$/i.test(value || '');

const getPreviewSource = (project) => {
  const preview = safeAssetUrl(project.preview);
  const video = safeAssetUrl(project.video);
  if (isDirectVideo(preview)) return preview;
  if (isDirectVideo(video)) return video;
  return '';
};

const getThumbnailSource = (project) => safeAssetUrl(project.thumbnail);

let cachedProjects = [];
let projectsRequestFailed = false;
let activeCaseStudy = null;
export let projectModal = null;

const fetchProjects = async () => {
  try {
    const response = await fetch(`/api/projects?lang=${document.documentElement.lang === 'el' ? 'el' : 'en'}`);
    if (!response.ok) throw new Error('Unable to load projects.');
    const data = await response.json();
    const projects = Array.isArray(data.projects) ? data.projects : [];
    cachedProjects = projects;
    projectsRequestFailed = false;
    return cachedProjects;
  } catch (_error) {
    projectsRequestFailed = true;
    return cachedProjects;
  }
};

const emptyProjectsMarkup = () => '<p class="work-browser-empty">Selected projects are being added soon.</p>';

const metadata = (project) => [
  project.client,
  project.category,
  project.year
].filter(Boolean).join(' / ');

const mediaMarkup = (project, className, options = {}) => {
  const preview = getPreviewSource(project);
  const thumbnail = getThumbnailSource(project);
  const name = escapeHtml(project.name || 'Project');
  const poster = thumbnail ? ` poster="${escapeHtml(thumbnail)}"` : '';

  if (preview) {
    return `<video class="${className}" src="${escapeHtml(preview)}" muted loop playsinline preload="${options.preload || 'metadata'}"${poster}${options.controls ? ' controls' : ''}${options.autoplay ? ' autoplay' : ''}></video>`;
  }
  if (thumbnail) {
    return `<img class="${className}" src="${escapeHtml(thumbnail)}" alt="${name}" loading="${options.loading || 'lazy'}" />`;
  }
  return `<span class="${className}__placeholder" aria-hidden="true"></span>`;
};

const bindPreviewPlayback = (card) => {
  const video = card.querySelector('[data-project-preview]');
  if (!video || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const play = () => {
    if (!video.src && video.dataset.src) video.src = video.dataset.src;
    video.play().catch(() => undefined);
  };
  const pause = () => {
    video.pause();
    video.currentTime = 0;
  };
  card.addEventListener('pointerenter', play);
  card.addEventListener('pointerleave', pause);
  card.addEventListener('focusin', play);
  card.addEventListener('focusout', pause);
};

const createTransitionCover = (project, sourceCard, direction = 'open') => {
  const media = sourceCard?.querySelector('.film-card__media');
  if (!media) return;
  const rect = media.getBoundingClientRect();
  const cover = document.createElement('div');
  cover.className = 'project-transition-cover';
  cover.style.inset = direction === 'open'
    ? `${rect.top}px ${window.innerWidth - rect.right}px ${window.innerHeight - rect.bottom}px ${rect.left}px`
    : '0px';
  cover.innerHTML = mediaMarkup(project, 'project-transition-cover__media', {
    preload: 'none',
    loading: 'eager'
  });
  document.body.append(cover);

  requestAnimationFrame(() => {
    if (direction === 'open') {
      cover.classList.add('is-expanded');
    } else {
      cover.style.inset = `${rect.top}px ${window.innerWidth - rect.right}px ${window.innerHeight - rect.bottom}px ${rect.left}px`;
    }
  });

  window.setTimeout(() => cover.remove(), 680);
};

const getCredits = (project) => {
  const directCredits = [
    ['Director', project.director],
    ['Producer', project.producer],
    ['Director of Photography', project.dop]
  ].filter(([, name]) => name);
  const existingRoles = new Set(directCredits.map(([role]) => role.toLowerCase()));
  const additionalCredits = Array.isArray(project.credits)
    ? project.credits.filter((credit) => {
      const rawRole = String(credit?.role || '').toLowerCase();
      const role = rawRole === 'dop' ? 'director of photography' : rawRole;
      return credit?.role && credit?.name && !existingRoles.has(role);
    }).map((credit) => [credit.role, credit.name])
    : [];
  return [...directCredits, ...additionalCredits];
};

const detailRows = (project) => [
  ['Client', project.client],
  ['Category', project.category],
  ['Year', project.year],
  ['Location', project.location],
  ['Duration', project.duration],
  ['Services', Array.isArray(project.services) ? project.services.join(', ') : ''],
  ['Deliverables', Array.isArray(project.deliverables) ? project.deliverables.join(', ') : '']
].filter(([, value]) => value);

const buildBehindFrame = (project) => {
  const finished = getThumbnailSource(project);
  const behind = safeAssetUrl(project.behindFrame);
  if (!finished || !behind) return '';
  const behindMedia = isDirectVideo(behind)
    ? `<video class="behind-frame__reveal" src="${escapeHtml(behind)}" muted loop playsinline preload="metadata"></video>`
    : `<img class="behind-frame__reveal" src="${escapeHtml(behind)}" alt="Behind the frame for ${escapeHtml(project.name)}" loading="lazy" />`;
  return `
    <div class="behind-frame" data-behind-frame>
      <button class="behind-frame__trigger" type="button" aria-pressed="false">
        <span class="behind-frame__media">
          <img src="${escapeHtml(finished)}" alt="Finished frame from ${escapeHtml(project.name)}" loading="lazy" />
          ${behindMedia}
        </span>
        <span class="behind-frame__instruction">Hold to see behind the frame</span>
      </button>
    </div>`;
};

const bindBehindFrame = (root) => {
  root.querySelectorAll('[data-behind-frame]').forEach((frame) => {
    const trigger = frame.querySelector('.behind-frame__trigger');
    const behindVideo = frame.querySelector('.behind-frame__reveal:is(video)');
    const reveal = () => {
      frame.classList.add('is-revealed');
      trigger.setAttribute('aria-pressed', 'true');
      behindVideo?.play().catch(() => undefined);
    };
    const hide = () => {
      frame.classList.remove('is-revealed');
      trigger.setAttribute('aria-pressed', 'false');
      if (behindVideo) {
        behindVideo.pause();
        behindVideo.currentTime = 0;
      }
    };
    trigger.addEventListener('pointerdown', (event) => {
      trigger.setPointerCapture?.(event.pointerId);
      reveal();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach((eventName) => {
      trigger.addEventListener(eventName, hide);
    });
    trigger.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Enter') reveal();
    });
    trigger.addEventListener('keyup', hide);
  });
};

const caseStudySection = (index, label, heading, body) => {
  if (!body) return '';
  return `
    <section class="case-study__copy-section">
      <p class="case-study__section-label">${String(index).padStart(2, '0')} / ${escapeHtml(label)}</p>
      <div>
        <h2>${escapeHtml(heading)}</h2>
        <p>${escapeHtml(body)}</p>
      </div>
    </section>`;
};

const buildCaseStudy = (project, projects) => {
  const video = getPreviewSource(project);
  const thumbnail = getThumbnailSource(project);
  const heroMedia = video
    ? `<video data-case-video src="${escapeHtml(video)}" muted loop playsinline preload="metadata" autoplay${thumbnail ? ` poster="${escapeHtml(thumbnail)}"` : ''} controls></video>`
    : (thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(project.name)}" />` : '<span class="film-card__placeholder" aria-hidden="true"></span>');
  const rows = detailRows(project);
  const credits = getCredits(project);
  const frames = Array.isArray(project.frames) ? project.frames.map(safeAssetUrl).filter(Boolean) : [];
  const projectIndex = Math.max(0, projects.findIndex((item) => item.id === project.id));
  const nextProject = projects[(projectIndex + 1) % projects.length];
  const brief = project.brief || project.note;
  const externalLink = safeAssetUrl(project.link);

  return `
    <div class="case-study__shell">
      <header class="case-study__header">
        <p class="case-study__running-title">Anchev Films / Project ${String(projectIndex + 1).padStart(2, '0')}</p>
        <button class="case-study__close" type="button" data-close-case>Close</button>
      </header>
      <section class="case-study__hero">
        <div class="case-study__hero-media">${heroMedia}</div>
        <div class="case-study__hero-content">
          <p class="case-study__meta">${escapeHtml([project.client, project.category, project.location, project.year].filter(Boolean).join(' / '))}</p>
          <h1>${escapeHtml(project.name)}</h1>
        </div>
      </section>
      <div class="case-study__content">
        ${!isDirectVideo(project.video) ? renderProjectFilmMarkup(project.video, thumbnail, 'The Film') : ''}
        ${caseStudySection(1, 'The Brief', 'The brief.', brief)}
        ${caseStudySection(2, 'Our Approach', 'The approach.', project.approach)}
        ${caseStudySection(3, 'The Production', 'The production.', project.production)}
        ${rows.length ? `
          <dl class="case-study__details">
            ${rows.map(([label, value]) => `
              <div class="case-study__detail">
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>`).join('')}
          </dl>` : ''}
        ${renderProjectSupportingMarkup(project)}
        ${buildBehindFrame(project)}
        ${frames.length ? `
          <section class="case-study__frames" aria-label="Production gallery">
            ${frames.map((frame, index) => `<figure><img src="${escapeHtml(frame)}" alt="Production photograph ${index + 1} from ${escapeHtml(project.name)}" loading="lazy" /></figure>`).join('')}
          </section>` : ''}
        ${credits.length ? `
          <section class="case-study__credits" aria-label="Credits">
            ${credits.map(([role, name]) => `
              <div class="case-study__credit">
                <span class="case-study__credit-role">${escapeHtml(role)}</span>
                <span class="case-study__credit-name">${escapeHtml(name)}</span>
              </div>`).join('')}
          </section>` : ''}
        ${externalLink ? `<p><a class="case-study__external" href="${escapeHtml(externalLink)}" target="_blank" rel="noreferrer">View project</a></p>` : ''}
        ${nextProject && nextProject.id !== project.id ? `
          <div class="case-study__next">
            <p class="case-study__next-label">Next project</p>
            <button class="case-study__next-button" type="button" data-next-project="${escapeHtml(nextProject.id)}">${escapeHtml(nextProject.name)}</button>
          </div>` : ''}
      </div>
    </div>`;
};

export const closeProjectModal = (options = {}) => {
  if (!activeCaseStudy) return;
  const { updateHistory = true } = options;
  const active = activeCaseStudy;
  active.element.querySelectorAll('video').forEach((video) => {
    video.pause();
    video.currentTime = 0;
  });
  createTransitionCover(active.project, active.sourceCard, 'close');
  active.element.classList.remove('is-open');
  document.body.classList.remove('case-study-open');
  activeCaseStudy = null;
  projectModal = null;
  window.setTimeout(() => active.element.remove(), 420);

  if (updateHistory && /^\/work\//.test(window.location.pathname)) {
    history.pushState({}, '', '/');
    document.getElementById('work-page')?.scrollIntoView({ behavior: 'smooth' });
  }
};

export const openProjectModal = (project, sourceCard = null, options = {}) => {
  if (!project) return;
  if (activeCaseStudy) closeProjectModal({ updateHistory: false });
  const { updateHistory = true } = options;
  const projects = cachedProjects.length ? cachedProjects : [project];
  const element = document.createElement('article');
  element.className = 'case-study';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  element.setAttribute('aria-label', `${project.name} case study`);
  element.tabIndex = -1;
  element.innerHTML = buildCaseStudy(project, projects);
  document.body.append(element);
  document.body.classList.add('case-study-open');
  activeCaseStudy = { element, project, sourceCard };
  projectModal = element;
  createTransitionCover(project, sourceCard, 'open');
  window.setTimeout(() => {
    if (activeCaseStudy?.element === element) {
      element.classList.add('is-open');
      element.focus({ preventScroll: true });
      element.querySelector('[data-case-video]')?.play().catch(() => undefined);
    }
  }, sourceCard ? 260 : 0);

  if (updateHistory && window.location.pathname !== `/work/${encodeURIComponent(project.id)}`) {
    history.pushState({ projectId: project.id }, '', `/work/${encodeURIComponent(project.id)}`);
  }

  element.querySelector('[data-close-case]')?.addEventListener('click', () => closeProjectModal());
  element.querySelector('[data-next-project]')?.addEventListener('click', (event) => {
    const next = projects.find((candidate) => candidate.id === event.currentTarget.dataset.nextProject);
    if (next) openProjectModal(next, null);
  });
  bindBehindFrame(element);
  setupProjectFilmPlayers(element);
};

const bindProjectBrowser = (root, projects) => {
  root.querySelectorAll('[data-project-id]').forEach((button) => {
    const project = projects.find((item) => item.id === button.dataset.projectId);
    if (!project) return;
    const card = button.closest('.film-card');
    bindPreviewPlayback(card);
    button.addEventListener('click', (event) => {
      if (document.documentElement.lang === 'el') return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openProjectModal(project, card);
    });
  });
};

export const renderProjectBrowser = async () => {
  const root = document.getElementById('work-browser');
  if (!root) return [];
  if (!root.children.length) {
    root.innerHTML = '<p class="work-browser-loading">Loading selected work</p>';
  }
  root.setAttribute('aria-busy', 'true');
  const projects = await fetchProjects();
  if ((!projectsRequestFailed && !root.querySelector('[data-project-id]')) || root.querySelector('.work-browser-loading')) {
    root.innerHTML = projects.length ? projects.map(renderProjectCardMarkup).join('') : emptyProjectsMarkup();
  }
  root.setAttribute('aria-busy', 'false');
  bindProjectBrowser(root, projects);
  const search = document.getElementById('work-search');
  const category = document.getElementById('work-category');
  const filter = () => {
    let count = 0;
    root.querySelectorAll('.film-card').forEach((card) => {
      const project = projects.find((entry) => entry.id === card.querySelector('[data-project-id]')?.dataset.projectId);
      const query = search?.value.toLowerCase().trim() || '';
      const visible = Boolean(project && (!query || `${project.name} ${project.client} ${project.category}`.toLowerCase().includes(query)) && (!category?.value || project.category === category.value));
      card.hidden = !visible;
      if (visible) count++;
    });
    const status = document.getElementById('work-filter-status');
    if (status) status.textContent = document.documentElement.lang === 'el' ? `${count} παραγωγές` : `${count} productions`;
  };
  search?.addEventListener('input', filter);
  category?.addEventListener('change', filter);
  return projects;
};

export const renderProjects = async () => {
  const root = document.getElementById('panel-content-projects');
  if (!root) return;
  const projects = await fetchProjects();
  root.innerHTML = `
    <div class="projects-header"><h2 class="panel-title">Selected productions.</h2></div>
    ${projects.length ? `<div class="project-thumb-grid">
      ${projects.map((project) => {
        const thumbnail = getThumbnailSource(project);
        return `<button class="project-thumb-card" type="button" data-project-id="${escapeHtml(project.id)}">
          <span class="project-thumb-img">${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="" loading="lazy" />` : '<span class="project-thumb-placeholder"></span>'}</span>
          <span class="project-thumb-info">
            <span class="project-thumb-name">${escapeHtml(project.name)}</span>
            <span class="project-thumb-meta">${escapeHtml(metadata(project))}</span>
          </span>
        </button>`;
      }).join('')}
    </div>` : emptyProjectsMarkup()}`;
  root.querySelectorAll('[data-project-id]').forEach((button) => {
    const project = projects.find((item) => item.id === button.dataset.projectId);
    if (project) button.addEventListener('click', () => openProjectModal(project, null));
  });
};

export const openProjectFromLocation = async () => {
  const match = window.location.pathname.match(/^\/work\/([^/]+)$/);
  if (!match) return;
  const id = decodeURIComponent(match[1]);
  const projects = cachedProjects.length ? cachedProjects : await fetchProjects();
  const project = projects.find((item) => item.id === id);
  if (project && !activeCaseStudy) openProjectModal(project, null, { updateHistory: false });
};

window.addEventListener('popstate', () => {
  if (/^\/work\//.test(window.location.pathname)) {
    openProjectFromLocation();
  } else {
    closeProjectModal({ updateHistory: false });
  }
});
