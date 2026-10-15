import { copy } from './localization.js';

export const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({
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

export const safeExternalUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch (_error) {
    return '';
  }
};

export const safeSocialProfileUrl = (value) => {
  const profile = safeExternalUrl(value);
  if (!profile) return '';
  const url = new URL(profile);
  const genericHosts = new Set([
    'instagram.com',
    'www.instagram.com',
    'linkedin.com',
    'www.linkedin.com',
    'vimeo.com',
    'www.vimeo.com'
  ]);
  return genericHosts.has(url.hostname.toLowerCase()) && url.pathname.replace(/\/+$/, '') === ''
    ? ''
    : url.href;
};

const isDirectVideo = (value) => /\.(?:mp4|webm|mov)(?:[?#].*)?$/i.test(value || '');

const projectMetadata = (project) => [
  project.client,
  project.category,
  project.year
].filter(Boolean).join(' / ');

export const renderProjectCardMarkup = (project, index) => {
  const preview = safeAssetUrl(project.preview);
  const projectVideo = safeAssetUrl(project.video);
  const video = isDirectVideo(preview)
    ? preview
    : (isDirectVideo(projectVideo) ? projectVideo : '');
  const thumbnail = safeAssetUrl(project.thumbnail);
  const typeClass = index === 0 || index % 5 === 0 ? ' film-card--wide' : '';
  const fallback = project.isShowreelFeature ? ' data-fallback="true"' : '';
  const poster = thumbnail ? ` poster="${escapeHtml(thumbnail)}"` : '';
  const cardMedia = video
    ? `<video data-project-preview data-src="${escapeHtml(video)}" muted loop playsinline preload="none"${poster}></video>`
    : (thumbnail
      ? `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(project.name)}" loading="lazy" />`
      : '<span class="film-card__placeholder" aria-hidden="true"></span>');

  return `
    <article class="film-card${typeClass}"${fallback}>
      <a class="film-card__trigger" href="/work/${encodeURIComponent(project.id)}" data-project-id="${escapeHtml(project.id)}" data-film-cursor data-cursor-label="View Film">
        <span class="film-card__media">
          ${cardMedia}
          <span class="film-card__screen-label">View Film</span>
        </span>
        <span class="film-card__information">
          <span class="film-card__index">${String(index + 1).padStart(2, '0')}</span>
          <span>
            <span class="film-card__title">${escapeHtml(project.name)}</span>
            ${project.note ? `<span class="film-card__overview">${escapeHtml(project.note)}</span>` : ''}
          </span>
          <span class="film-card__meta">${escapeHtml(projectMetadata(project))}</span>
        </span>
      </a>
    </article>`;
};

export const renderProjectBrowserMarkup = (projects) => (
  Array.isArray(projects) && projects.length
    ? projects.map(renderProjectCardMarkup).join('')
    : '<p class="work-browser-empty">Selected projects are being added soon.</p>'
);

const getYouTubeId = (source) => {
  try {
    const url = new URL(source);
    const videoId = url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : (['youtube.com', 'www.youtube.com'].includes(url.hostname) ? url.searchParams.get('v') : '');
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId || '') ? videoId : '';
  } catch (_error) {
    return '';
  }
};

export const renderProjectFilmMarkup = (source, poster, title, language) => {
  const words = copy(language);
  const videoId = getYouTubeId(source);
  const image = safeAssetUrl(poster);
  const video = safeAssetUrl(source);
  if (!videoId && !isDirectVideo(video)) return '';
  return `<section class="case-study__film" aria-label="${escapeHtml(title)}">
    <h2>${escapeHtml(title)}</h2>
    <div class="case-study__player">
      ${videoId ? `<button class="case-study__play" type="button" data-youtube-id="${videoId}" data-film-title="${escapeHtml(title)}" aria-label="${words.play} ${escapeHtml(title)}">
        ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />` : ''}
        <span class="case-study__play-icon" aria-hidden="true">&#9654;</span>
      </button>` : `<video src="${escapeHtml(video)}"${image ? ` poster="${escapeHtml(image)}"` : ''} controls playsinline preload="none"></video>`}
    </div>
    ${videoId ? `<a class="case-study__external" href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noreferrer">${words.watchYoutube}</a>` : ''}
  </section>`;
};

export const setupProjectFilmPlayers = (root) => {
  root.querySelectorAll('[data-youtube-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const videoId = button.dataset.youtubeId;
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId || '')) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
      iframe.title = button.dataset.filmTitle;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      button.replaceWith(iframe);
    }, { once: true });
  });
};

export const renderProjectSupportingMarkup = (project, language) => {
  const words = copy(language);
  const pressLink = safeExternalUrl(project.pressLink);
  return `${renderProjectFilmMarkup(project.behindVideo, project.behindFrame, words.behind, language)}
    ${pressLink ? `<section class="case-study__copy-section">
      <p class="case-study__section-label">${words.press}</p>
      <div><h2>${words.press}.</h2><a class="case-study__external" href="${escapeHtml(pressLink)}" target="_blank" rel="noreferrer">${escapeHtml(project.pressTitle || words.readCoverage)}</a></div>
    </section>` : ''}`;
};

const renderProjectCreditsMarkup = (project) => {
  const directCredits = [
    ['Director', project.director],
    ['Producer', project.producer],
    ['Director of Photography', project.dop]
  ].filter(([, name]) => name);
  const directRoles = new Set(['director', 'producer', 'dop', 'director of photography']);
  const extraCredits = (Array.isArray(project.credits) ? project.credits : [])
    .filter((credit) => credit?.role && credit?.name && !directRoles.has(credit.role.toLowerCase()))
    .map((credit) => [credit.role, credit.name]);
  const credits = [...directCredits, ...extraCredits];
  return credits.length ? `<section class="case-study__credits" aria-label="Credits">${credits.map(([role, name]) => `<div class="case-study__credit"><span class="case-study__credit-role">${escapeHtml(role)}</span><span class="case-study__credit-name">${escapeHtml(name)}</span></div>`).join('')}</section>` : '';
};

export const renderProjectPageMarkup = (project, projects, description) => {
  const thumbnail = safeAssetUrl(project.thumbnail);
  const video = safeAssetUrl(project.video);
  const media = isDirectVideo(video)
    ? `<video src="${escapeHtml(video)}"${thumbnail ? ` poster="${escapeHtml(thumbnail)}"` : ''} controls playsinline preload="metadata"></video>`
    : (thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(project.name)}" fetchpriority="high" />` : '');
  const sections = [
    ['The Brief', project.brief || project.note || description],
    ['Our Approach', project.approach],
    ['The Production', project.production]
  ].filter(([, text]) => text);
  const details = [
    ['Director', project.director],
    ['Producer', project.producer],
    ['Cinematography', project.dop],
    ['Location', project.location],
    ['Duration', project.duration],
    ['Services', Array.isArray(project.services) ? project.services.join(', ') : ''],
    ['Deliverables', Array.isArray(project.deliverables) ? project.deliverables.join(', ') : '']
  ].filter(([, value]) => value);
  const next = projects.find((item) => item.id && item.id !== project.id);
  const projectLink = safeExternalUrl(project.link);

  return `<article class="case-study case-study--standalone${media ? '' : ' case-study--no-media'} is-open">
    <div class="case-study__shell">
      <header class="case-study__header">
        <p class="case-study__running-title">Anchev Films / Selected work</p>
        <a class="case-study__close" href="/#work-page">Back to work</a>
      </header>
      <main>
        <section class="case-study__hero" aria-labelledby="project-title">
          <div class="case-study__hero-media">${media}</div>
          <div class="case-study__hero-content">
            <p class="case-study__meta">${escapeHtml([project.client, project.category, project.location, project.year].filter(Boolean).join(' / ') || 'Film production / Athens')}</p>
            <h1 id="project-title">${escapeHtml(project.name)}</h1>
            ${project.id === 'anti-bullying' ? '<p class="case-study__meta" lang="el">Ψήσου να μιλήσεις - να δράσεις</p>' : ''}
          </div>
        </section>
        <div class="case-study__content">
          ${getYouTubeId(video) ? renderProjectFilmMarkup(video, thumbnail, 'The Film') : ''}
          ${sections.map(([label, text], index) => `<section class="case-study__copy-section">
            <p class="case-study__section-label">${String(index + 1).padStart(2, '0')} / ${label}</p>
            <div><h2>${label}.</h2><p>${escapeHtml(text)}</p></div>
          </section>`).join('')}
          ${details.length ? `<dl class="case-study__details">${details.map(([label, value]) => `<div class="case-study__detail"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>` : ''}
          ${renderProjectSupportingMarkup(project)}
          <nav class="service-page__links" aria-label="Film production services"><a class="case-study__external" href="/services/video-production-athens">Video production in Athens</a><a class="case-study__external" href="/services/production-services-greece">Production services in Greece</a></nav>
          ${Array.isArray(project.frames) && project.frames.length ? `<section class="case-study__frames" aria-label="Production gallery">${project.frames.map((frame, index) => {
            const src = safeAssetUrl(frame);
            return src ? `<figure><img src="${escapeHtml(src)}" alt="Production photograph ${index + 1} from ${escapeHtml(project.name)}" loading="lazy" /></figure>` : '';
          }).join('')}</section>` : ''}
          ${renderProjectCreditsMarkup(project)}
          ${projectLink ? `<p><a class="case-study__external" href="${escapeHtml(projectLink)}" target="_blank" rel="noreferrer">View project</a></p>` : ''}
          <p><a class="case-study__external" href="/#contact-page">Start a project</a></p>
          ${next ? `<nav class="case-study__next" aria-label="Next project"><p class="case-study__next-label">More selected work</p><a class="case-study__next-button" href="/work/${encodeURIComponent(next.id)}">${escapeHtml(next.name)}</a></nav>` : ''}
        </div>
      </main>
    </div>
  </article>`;
};

export const renderStudioPageMarkup = (visuals = [], managed = null, language = 'en') => {
  if (managed) {
    const greek = language === 'el';
    const images = managed.blocks.filter((block) => block.type === 'image' && block.url);
    const film = managed.blocks.find((block) => block.type === 'video' && block.url);
    const poster = images[0]?.url || '/media/experience/studio-poster.jpg';
    const home = greek ? '/el/' : '/';
    return `<article class="case-study case-study--standalone studio-page is-open"><div class="case-study__shell">
      <header class="case-study__header"><p class="case-study__running-title">Anchev Films / ${greek ? 'Το στούντιο' : 'Our studio'}</p><a class="case-study__close" href="${home}">${greek ? 'Επιστροφή στην Anchev Films' : 'Back to Anchev Films'}</a></header>
      <main><section class="case-study__hero" aria-labelledby="studio-title"><div class="case-study__hero-media">${film ? `<video class="studio-feature__video" muted loop playsinline preload="none" poster="${escapeHtml(poster)}" aria-hidden="true" tabindex="-1"><source data-src="${escapeHtml(film.url)}" /></video>` : `<img src="${escapeHtml(poster)}" alt="${escapeHtml(images[0]?.alt || '')}" fetchpriority="high" />`}</div><div class="case-study__hero-content"><p class="case-study__meta">Anchev Films / ${greek ? 'Αθήνα' : 'Athens'}</p><h1 id="studio-title">${escapeHtml(managed.heading)}</h1></div></section>
      <div class="case-study__content"><p>${escapeHtml(managed.intro).replace(/\n/g, '<br />')}</p>
      <dl class="case-study__details" aria-label="${greek ? 'Στοιχεία στούντιο' : 'Studio facts'}">${managed.blocks.filter((block) => block.type === 'fact').map((block) => `<div class="case-study__detail"><dt>${escapeHtml(block.title)}</dt><dd>${escapeHtml(block.text)}</dd></div>`).join('')}</dl>
      ${managed.blocks.filter((block) => block.type === 'text').map((block, index) => `<section class="case-study__copy-section"><p class="case-study__section-label">${String(index + 1).padStart(2, '0')}</p><div><h2>${escapeHtml(block.title)}</h2><p>${escapeHtml(block.text).replace(/\n/g, '<br />')}</p></div></section>`).join('')}
      <section class="case-study__frames" aria-label="${greek ? 'Εικόνες στούντιο' : 'Studio images'}">${images.slice(1).map((block) => `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy" />${block.text ? `<figcaption>${escapeHtml(block.text)}</figcaption>` : ''}</figure>`).join('')}</section>
      ${managed.blocks.filter((block) => block.type === 'link').map((block) => `<p><a class="case-study__external" href="${escapeHtml(block.url)}">${escapeHtml(block.title || block.url)}</a></p>`).join('')}
      <section class="case-study__copy-section"><div><h2>${greek ? 'Η παραγωγή σας' : 'Your production'}</h2><p>${escapeHtml(managed.body).replace(/\n/g, '<br />')}</p><a class="case-study__external" href="${home}#contact-page">${greek ? 'Επικοινωνήστε μαζί μας' : 'Enquire about the studio'}</a></div></section></div></main></div></article>`;
  }
  const capabilities = [
    ['Room for the bigger idea', 'With a width of 12 metres, a depth of 16 metres and a height of 5 metres, the studio offers an approximate 192-square-metre footprint for ambitious setups. The space is large enough to bring a car inside. Share your vehicle and set requirements so we can confirm access and layout before the shoot.'],
    ['A simpler load-in', 'Truck access reaches the studio entrance, bringing equipment and production deliveries right to the point of arrival. Loading arrangements can be coordinated around your production schedule.'],
    ['Connected for live production', 'A fast internet connection supports live-streaming productions. Tell us your platform, stream format and connectivity requirements so we can plan and test the setup together.'],
    ['Power for production', 'Three-phase power is available for production needs. Lighting loads, distribution and connection requirements are reviewed ahead of the shoot.']
  ];
  return `<article class="case-study case-study--standalone studio-page is-open">
    <div class="case-study__shell">
      <header class="case-study__header">
        <p class="case-study__running-title">Anchev Films / Our studio</p>
        <a class="studio-page__language" href="/el/studio" lang="el" hreflang="el">Ελληνικά</a>
        <a class="case-study__close" href="/#work-page">Back to Anchev Films</a>
      </header>
      <main>
        <section class="case-study__hero" aria-labelledby="studio-title">
          <div class="case-study__hero-media">
            <video class="studio-feature__video" muted loop playsinline preload="none" poster="/media/experience/studio-poster.jpg" aria-hidden="true" tabindex="-1">
              <source data-src="/media/experience/studio-mobile.mp4" media="(max-width: 820px)" type="video/mp4" />
              <source data-src="/media/experience/studio-web.mp4" type="video/mp4" />
            </video>
          </div>
          <div class="case-study__hero-content">
            <p class="case-study__meta">Production space / Live streaming / Melissia, Athens</p>
            <h1 id="studio-title">Anchev Studio.</h1>
          </div>
        </section>
        <div class="case-study__content">
          <section class="case-study__copy-section">
            <p class="case-study__section-label">01 / The Space</p>
            <div><h2>Space to make it happen.</h2><p>From a focused product shoot to a larger set or a vehicle-led production, our studio gives your team a place to bring the brief to life. Convenient load-in, fast internet and three-phase power help turn the space into a practical working environment.</p><a class="case-study__external" href="/#contact-page">Discuss your studio shoot</a></div>
          </section>
          <dl class="case-study__details" aria-label="Studio dimensions">
            <div class="case-study__detail"><dt>Width</dt><dd>12 m</dd></div>
            <div class="case-study__detail"><dt>Depth</dt><dd>16 m</dd></div>
            <div class="case-study__detail"><dt>Height</dt><dd>5 m</dd></div>
            <div class="case-study__detail"><dt>Approximate footprint</dt><dd>192 sq m</dd></div>
          </dl>
          <section class="studio-page__capabilities" aria-label="Studio facilities">
            ${capabilities.map(([title, text], index) => `<section class="case-study__copy-section"><p class="case-study__section-label">${String(index + 2).padStart(2, '0')} / ${['Space', 'Access', 'Connectivity', 'Power'][index]}</p><div><h2>${title}.</h2><p>${text}</p></div></section>`).join('')}
          </section>
          <section class="case-study__copy-section">
            <p class="case-study__section-label">06 / Location</p>
            <div><h2>Find the studio.</h2><p>Apostolou Rapti 5, Melissia 151 27, Greece. Anchev Studio is the production space presented here by Anchev Films; the location is listed on Google Maps as Hologram Studio. Contact Anchev Films for production enquiries and to coordinate access, unloading and your setup before arrival.</p><a class="case-study__external" href="https://www.google.com/maps/dir/?api=1&amp;destination=Apostolou%20Rapti%205%2C%20Melissia%20151%2027%2C%20Greece" target="_blank" rel="noreferrer">Get directions</a></div>
          </section>
          <section class="case-study__frames" aria-label="Inside the studio">
            ${[1, 2, 3].map((index) => `<figure><img src="/media/studio/studio-frame-0${index}.jpg" alt="View ${index} of the Anchev Studio, captured from our studio film" loading="lazy" /><figcaption>Inside Anchev Studio</figcaption></figure>`).join('')}
          </section>
          ${visuals.length ? `<section class="case-study__frames" aria-label="Studio visualisations">${visuals.map((image, index) => `<figure><img src="${escapeHtml(image)}" alt="AI-generated studio visualisation ${index + 1}, based on Anchev Studio" loading="lazy" /><figcaption>Studio visualisation / AI-generated</figcaption></figure>`).join('')}</section>` : ''}
          <section class="case-study__copy-section">
            <p class="case-study__section-label">Next / Your Production</p>
            <div><h2>Bring us your brief.</h2><p>Send your preferred dates, crew size, set or vehicle dimensions, equipment list and any streaming requirements. We will confirm the space, access and technical arrangements for your production.</p><a class="case-study__external" href="/#contact-page">Enquire about the studio</a></div>
          </section>
          <nav class="service-page__links" aria-label="Studio production services"><a class="case-study__external" href="/services/video-production-athens">Video production in Athens</a><a class="case-study__external" href="/services/live-streaming-athens">Event filming &amp; live streaming</a></nav>
        </div>
      </main>
    </div>
  </article>`;
};

const clientSortKey = (client) => String(client).replace(/^\u039a\u0399EFER$/u, 'KIEFER');

export const renderClientsMarkup = (clients) => (Array.isArray(clients) ? clients : [])
  .slice()
  .sort((first, second) => clientSortKey(first).localeCompare(clientSortKey(second), 'en', { sensitivity: 'base' }))
  .map((client) => `<button class="client-mark" type="button" aria-current="false"><span class="client-mark__name">${escapeHtml(client)}</span></button>`)
  .join('');

const dateFormatters = Object.fromEntries(['en', 'el'].map((language) => [language, new Intl.DateTimeFormat(language, {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})]));

const formatDate = (value, language = 'en') => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : (dateFormatters[language] || dateFormatters.en).format(date);
};

export const renderArticlesMarkup = (articles, language = 'en') => {
  const words = copy(language);
  const entries = Array.isArray(articles) ? articles : [];
  if (!entries.length) return `<p class="articles-empty">${words.articlesEmpty}</p>`;

  return entries.map((article, index) => {
    const url = safeExternalUrl(article.url);
    if (!url) return '';
    const publishedAt = formatDate(article.publishedAt, language);
    const articleLanguage = ['el', 'en'].includes(article.language) ? article.language : 'en';
    return `
      <article class="article-row">
        <a class="article-row__link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer" data-film-cursor data-cursor-label="Read Article">
          <span class="article-row__index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <span class="article-row__body">
            <span class="article-row__meta">
              ${article.publisher ? `<span>${escapeHtml(article.publisher)}</span>` : ''}
              ${publishedAt ? `<time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(publishedAt)}</time>` : ''}
            </span>
            <span class="article-row__title" lang="${articleLanguage}">${escapeHtml(article.title)}</span>
            ${article.summary ? `<span class="article-row__summary">${escapeHtml(article.summary)}</span>` : ''}
          </span>
          <span class="article-row__action">${words.readArticle} <span aria-hidden="true">↗</span></span>
        </a>
      </article>`;
  }).join('');
};

const formatDuration = (value, language = 'en') => {
  const words = copy(language);
  const parts = String(value || '').split(':').map(Number);
  if (parts.some(Number.isNaN)) return String(value || '');
  const hours = parts.length === 3 ? parts[0] : 0;
  const minutes = parts.length === 3 ? parts[1] : parts[0];
  if (hours) return `${hours} ${words.hours}${minutes ? ` ${minutes} ${words.minutes}` : ''}`;
  return minutes ? `${minutes} ${words.minutes}` : `< 1 ${words.minutes}`;
};

export const getPodcastEpisodePath = (episode) => `/podcast/${encodeURIComponent(episode.id)}`;

export const renderPodcastPageMarkup = (episode, podcast) => {
  const audio = safeExternalUrl(episode.audioUrl);
  const image = safeAssetUrl(episode.image || podcast.cover);
  const source = safeExternalUrl(episode.link || podcast.spotifyUrl);
  return `<article class="case-study case-study--standalone service-page podcast-page${image ? '' : ' case-study--no-media'} is-open">
    <div class="case-study__shell">
      <header class="case-study__header"><a class="case-study__close" href="/#podcast-page">Anchev Films / Podcasts</a></header>
      <main lang="el">
        <section class="case-study__hero" aria-labelledby="episode-title">
          ${image ? `<div class="case-study__hero-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(podcast.title)}" fetchpriority="high" /></div>` : ''}
          <div class="case-study__hero-content"><p class="case-study__meta">${escapeHtml(podcast.title)}${episode.episodeNumber ? ` / Episode ${escapeHtml(episode.episodeNumber)}` : ''}</p><h1 id="episode-title">${escapeHtml(episode.title)}</h1></div>
        </section>
        <div class="case-study__content">
          ${episode.publishedAt ? `<p><time datetime="${escapeHtml(episode.publishedAt)}">${escapeHtml(formatDate(episode.publishedAt))}</time>${episode.duration ? ` / ${escapeHtml(formatDuration(episode.duration))}` : ''}</p>` : ''}
          ${audio ? `<audio class="podcast-page__audio" controls preload="none" src="${escapeHtml(audio)}" aria-label="${escapeHtml(episode.title)}"></audio>` : ''}
          ${episode.description ? `<section class="case-study__copy-section"><p class="case-study__section-label">Σχετικά με το επεισόδιο</p><div><h2>${escapeHtml(episode.title)}</h2><p>${escapeHtml(episode.description)}</p></div></section>` : ''}
          ${source ? `<p><a class="case-study__external" href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Ακούστε στην πλατφόρμα</a></p>` : ''}
          <nav class="service-page__links" aria-label="Περισσότερα επεισόδια">${podcast.episodes.filter((other) => other.id !== episode.id).map((other) => `<a class="case-study__external" href="${getPodcastEpisodePath(other)}">${escapeHtml(other.title)}</a>`).join('')}<a class="case-study__external" href="/#podcast-page">Όλα τα επεισόδια</a><a class="case-study__external" href="/el/services/video-production-athens">Παραγωγή βίντεο στην Αθήνα</a></nav>
        </div>
      </main>
    </div>
  </article>`;
};

export const renderPodcastEpisodeMarkup = (episode, index, spotifyUrl, language = 'en') => {
  const words = copy(language);
  const rawTitle = String(episode.title || `Episode ${index + 1}`);
  const title = escapeHtml(rawTitle);
  const publishedAt = formatDate(episode.publishedAt, language);
  const duration = formatDuration(episode.duration, language);
  const audioUrl = safeExternalUrl(episode.audioUrl);
  const episodeUrl = safeExternalUrl(episode.link) || spotifyUrl;
  const episodeNumber = String(episode.episodeNumber || index + 1).padStart(2, '0');

  return `
    <article class="podcast-episode">
      ${audioUrl ? `
        <button
          class="podcast-episode__play"
          type="button"
          data-podcast-play
          data-audio-url="${escapeHtml(audioUrl)}"
          data-episode-title="${escapeHtml(rawTitle)}"
          aria-label="${words.play} ${title}"
        ><span class="podcast-play-icon" aria-hidden="true"></span></button>
      ` : `<span class="podcast-episode__number" aria-hidden="true">${episodeNumber}</span>`}
      <div class="podcast-episode__body">
        <div class="podcast-episode__topline">
          <span>${words.episode} ${episodeNumber}</span>
          ${publishedAt ? `<time datetime="${escapeHtml(episode.publishedAt)}">${escapeHtml(publishedAt)}</time>` : ''}
        </div>
        <h3><a href="${getPodcastEpisodePath(episode)}">${title}</a></h3>
        ${episode.description ? `<p>${escapeHtml(episode.description)}</p>` : ''}
        <div class="podcast-episode__footer">
          ${duration ? `<span>${escapeHtml(duration)}</span>` : '<span></span>'}
          <a href="${escapeHtml(episodeUrl)}" target="_blank" rel="noreferrer">${words.openEpisode}</a>
        </div>
      </div>
    </article>`;
};

export const renderPodcastEpisodesMarkup = (podcast, language = 'en') => {
  const words = copy(language);
  const episodes = Array.isArray(podcast?.episodes) ? podcast.episodes : [];
  const spotifyUrl = safeExternalUrl(podcast?.spotifyUrl);
  if (episodes.length) {
    return episodes.map((episode, index) => renderPodcastEpisodeMarkup(episode, index, spotifyUrl, language)).join('');
  }
  return `<p class="podcast-episodes__status">${words.podcastEmpty} <a href="${escapeHtml(spotifyUrl)}" target="_blank" rel="noreferrer">${words.followSpotify}</a>.</p>`;
};

const renderSocialLinks = (social) => (Array.isArray(social) ? social : [])
  .map((item) => {
    const href = safeSocialProfileUrl(item.href);
    return href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`
      : '';
  })
  .join('');

export const renderContactPageMarkup = (contact, language = 'en', editorial = null) => {
  const words = copy(language);
  const email = String(contact?.email || '').trim();
  const phone = String(contact?.phone || '').trim();
  const location = String(contact?.location || '').trim();
  const socialLinks = renderSocialLinks(contact?.social);
  return `
    <div class="contact-final">
      <div>
        <p class="contact-final__eyebrow">${words.start}</p>
        <h2 class="contact-final__title">${editorial ? escapeHtml(editorial.heading).replace(/\n/g, '<br />') : language === 'el' ? 'Έχετε μια ιδέα;<br><em>Ας της δώσουμε εικόνα.</em>' : "Have something<br>in mind?<br><em>Let's make it.</em>"}</h2>
        ${editorial?.intro ? `<p>${escapeHtml(editorial.intro).replace(/\n/g, '<br />')}</p>` : ''}
        ${editorial?.body ? `<p>${escapeHtml(editorial.body).replace(/\n/g, '<br />')}</p>` : ''}
      </div>
      <div class="contact-final__details">
        <div>
          <p class="contact-final__meta">${words.email}</p>
          <a href="mailto:${escapeHtml(email)}" data-film-cursor data-cursor-kind="contact" data-cursor-label="Let's Talk">${escapeHtml(email)}</a>
        </div>
        <div>
          <p class="contact-final__meta">${words.phone}</p>
          <a href="tel:${escapeHtml(phone.replace(/\s+/g, ''))}">${escapeHtml(phone)}</a>
        </div>
        <div>
          <p class="contact-final__meta">${words.worldwide}</p>
          <strong>${escapeHtml(location)}</strong>
        </div>
        <div class="contact-final__socials">${socialLinks}</div>
      </div>
    </div>
    <form class="inquiry-form" id="inquiry-form" action="/api/contact" method="post">
      <h3>${words.inquiryTitle}</h3>
      <div class="inquiry-form__grid">
        <label for="inquiry-name">${words.name}<input id="inquiry-name" name="name" autocomplete="name" minlength="2" maxlength="120" required /></label>
        <label for="inquiry-email">${words.email}<input id="inquiry-email" name="email" type="email" autocomplete="email" maxlength="254" required /></label>
        <label for="inquiry-company">${words.company}<input id="inquiry-company" name="company" autocomplete="organization" maxlength="200" /></label>
        <label class="inquiry-form__wide" for="inquiry-message">${words.message}<textarea id="inquiry-message" name="message" rows="4" minlength="20" maxlength="5000" required></textarea></label>
      </div>
      <div class="inquiry-form__trap" aria-hidden="true"><label for="inquiry-website">Website<input id="inquiry-website" name="website" tabindex="-1" autocomplete="off" /></label></div>
      <label class="inquiry-form__consent" for="inquiry-privacy"><input id="inquiry-privacy" name="privacy" type="checkbox" required /><span>${words.privacy} <a href="${language === 'el' ? '/el/privacy' : '/privacy'}">${words.privacyLink}</a></span></label>
      <button class="inquiry-form__submit" type="submit">${words.send}</button>
      <p class="inquiry-form__status" id="inquiry-status" role="status" aria-live="polite"></p>
    </form>`;
};

export const renderAboutPageMarkup = () => `
  <div class="about-production-field" aria-hidden="true">
    <svg class="about-production-field-svg" viewBox="0 0 1 1" preserveAspectRatio="none">
      <g class="about-production-grid"></g>
    </svg>
  </div>
  <div class="about-ed">
    <div class="about-route" aria-hidden="true">
      <svg class="about-route-svg" viewBox="0 0 1 1" preserveAspectRatio="none">
        <path class="about-route-track"></path>
        <path class="about-route-progress"></path>
        <g class="about-route-nodes"></g>
      </svg>
    </div>
    <div class="about-ed-bar">
      <span class="about-ed-eyebrow" data-av>About Anchev Films</span>
      <span class="about-ed-bar-rule"></span>
      <button class="about-ed-back" data-av data-scroll-to="home" type="button">&uarr; Back</button>
    </div>
    <div class="about-ed-quote-wrap" data-av>
      <blockquote class="about-ed-quote">
        <p><em>"The standard is simple: make the work matter."</em></p>
        <cite>&mdash; Boris Anchev, Founder</cite>
      </blockquote>
    </div>
    <div class="about-ed-section" data-av>
      <div class="about-ed-section-hd"><h3 class="about-ed-heading">Ambition needs<br>a way through.</h3></div>
      <div class="about-ed-body">
        <p>Good ideas do not fail because they lack imagination. They fail when the plan cannot carry them through the realities of budget, schedule, location, and people.</p>
        <p>We build the structure early: one clear direction, the right team, and a production plan that keeps the work moving.</p>
      </div>
    </div>
    <div class="about-ed-section" data-av>
      <div class="about-ed-section-hd"><h3 class="about-ed-heading">Production should<br>create momentum.</h3></div>
      <div class="about-ed-body">
        <p>We bring the right people into the room early, set decisions in motion, and keep the distance between creative intent and execution short.</p>
        <p>That is how a production moves quickly without becoming careless, and how an idea keeps its edge from first conversation to final delivery.</p>
      </div>
    </div>
    <div class="about-ed-section" data-av>
      <div class="about-ed-section-hd"><h3 class="about-ed-heading">Built to deliver,<br>not just impress.</h3></div>
      <div class="about-ed-body">
        <p>From the first treatment to the final master, we take responsibility for the details that determine whether the work lands.</p>
        <p>Every choice is tested against the same question: does it make the film stronger, clearer, and more effective?</p>
      </div>
    </div>
    <div class="about-ed-section" data-av>
      <div class="about-ed-section-hd"><h3 class="about-ed-heading">We stay close<br>to the hard parts.</h3></div>
      <div class="about-ed-body">
        <p>Production becomes valuable when the pressure arrives: a late change, a tight location, a difficult schedule, or a decision that cannot wait.</p>
        <p>We are there to solve, make the call, and protect the work. That is what clients are hiring when they bring us in.</p>
      </div>
    </div>
    <div class="about-ed-section" data-av>
      <div class="about-ed-section-hd"><h3 class="about-ed-heading">The work has<br>to travel.</h3></div>
      <div class="about-ed-body">
        <p>A film has to work beyond the set: across audiences, channels, markets, and the life of a campaign.</p>
        <p>We make with that in mind: a clear idea, a considered finish, and the operational discipline to deliver work that holds up wherever it is seen.</p>
      </div>
    </div>
    <header class="about-ed-hero" data-av>
      <p class="about-ed-tagline">Built on the need to make things happen.</p>
    </header>
  </div>`;