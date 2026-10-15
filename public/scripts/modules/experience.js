import { siteContent } from '/scripts/content.js';

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const isDirectVideoSource = (source) => /(^\/|^https?:\/\/).+\.(mp4|webm|mov)(\?.*)?$/i.test(source || '');

const getShowreelSource = () => String(
  siteContent.media.showreelSource || '/media/showreel.mp4'
).trim();

const formatDuration = (duration) => {
  if (!Number.isFinite(duration) || duration < 0) return '00:00';
  const totalSeconds = Math.floor(duration);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  return hours ? `${String(hours).padStart(2, '0')}:${time}` : time;
};

const setupOpeningSequence = () => {
  const opening = document.querySelector('.opening-sequence');
  const shell = document.querySelector('.site-shell');
  const videoStage = document.querySelector('.video-stage');
  const heroCopy = document.querySelector('.hero-copy');
  if (!opening || !shell || !videoStage || !heroCopy) return () => {};

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let chromeRetired = false;

  const update = () => {
    frame = 0;
    const range = Math.max(1, opening.offsetHeight - window.innerHeight);
    const scrollProgress = clamp(-opening.getBoundingClientRect().top / range, 0, 1);
    const progress = motionQuery.matches ? 0 : scrollProgress;
    if (scrollProgress >= 0.99) chromeRetired = true;
    if (scrollProgress <= 0.94) chromeRetired = false;
    opening.classList.toggle('is-complete', chromeRetired);
    videoStage.style.setProperty('--opening-inset', `${Math.round(progress * 22)}px`);
    videoStage.style.setProperty('--opening-radius', `${Math.round(progress * 12)}px`);
    videoStage.style.setProperty('--opening-scale', String(1 - progress * 0.075));
    videoStage.style.setProperty('--opening-opacity', String(1 - progress * 0.14));
    heroCopy.style.setProperty('--hero-copy-opacity', String(1 - progress * 1.2));
    heroCopy.style.setProperty('--hero-copy-offset', `${Math.round(progress * -50)}px`);
    document.body.classList.toggle('at-opening', progress < 0.16);
  };

  const schedule = () => {
    if (!frame) frame = window.setTimeout(update, 16);
  };

  schedule();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  motionQuery.addEventListener('change', schedule);

  return () => {
    window.clearTimeout(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    motionQuery.removeEventListener('change', schedule);
  };
};

const setupStoryProgression = () => {
  const root = document.querySelector('.tagline-story');
  const mediaRoot = document.getElementById('story-media');
  const counter = document.getElementById('story-index-current');
  const scenes = [...document.querySelectorAll('[data-story-scene]')];
  if (!root || !mediaRoot || !counter || scenes.length === 0) return () => {};

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  const update = () => {
    frame = 0;
    const travel = Math.max(1, root.offsetHeight - window.innerHeight);
    const progress = motionQuery.matches ? 0 : clamp(-root.getBoundingClientRect().top / travel, 0, 1);
    const index = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
    root.dataset.storyIndex = String(index);
    root.style.setProperty('--story-progress', `${Math.round(progress * 100)}%`);
    counter.textContent = String(index + 1).padStart(2, '0');
    scenes.forEach((scene, sceneIndex) => {
      const active = sceneIndex === index;
      scene.classList.toggle('is-active', active);
      scene.setAttribute('aria-hidden', String(!active));
    });
  };

  const schedule = () => {
    if (!frame) frame = window.setTimeout(update, 16);
  };

  schedule();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  motionQuery.addEventListener('change', schedule);

  return () => {
    window.clearTimeout(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    motionQuery.removeEventListener('change', schedule);
  };
};

const setupIndexedScrollChapter = ({
  rootSelector,
  itemSelector,
  currentSelector,
  totalSelector,
  activeNameSelector,
  prefix
}) => {
  const root = document.querySelector(rootSelector);
  const items = root ? [...root.querySelectorAll(itemSelector)] : [];
  const current = root?.querySelector(currentSelector);
  const total = root?.querySelector(totalSelector);
  const activeNames = root ? [...root.querySelectorAll(activeNameSelector)] : [];
  if (!root || !items.length || !current || !total || !activeNames.length) return () => {};

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasFlowingLayout = () => window.matchMedia('(min-width: 601px) and (max-width: 820px) and (max-height: 760px)').matches
    || (prefix === 'client' && window.matchMedia('(max-width: 600px)').matches);
  let frame = 0;

  const update = () => {
    frame = 0;
    const travel = Math.max(1, root.offsetHeight - window.innerHeight);
    let progress = motionQuery.matches ? 0 : clamp(-root.getBoundingClientRect().top / travel, 0, 1);
    let index = Math.min(items.length - 1, Math.floor(progress * items.length));
    if (hasFlowingLayout()) {
      const visibleIndex = items.findIndex((item) => item.getBoundingClientRect().bottom >= window.innerHeight * 0.5);
      index = visibleIndex < 0 ? items.length - 1 : visibleIndex;
      progress = (index + 1) / items.length;
    }
    const name = items[index].querySelector('.service-item__name')?.textContent.trim() || items[index].textContent.trim();
    root.dataset[`${prefix}Index`] = String(index);
    root.style.setProperty(`--${prefix}-progress`, `${Math.round(progress * 100)}%`);
    root.style.setProperty(`--${prefix}-media-offset`, `${(0.5 - progress) * 8}%`);
    current.textContent = String(index + 1).padStart(2, '0');
    total.textContent = String(items.length).padStart(2, '0');
    activeNames.forEach((element) => { element.textContent = name; });
    items.forEach((item, itemIndex) => {
      item.classList.toggle('is-active', itemIndex === index);
      item.classList.toggle('is-past', itemIndex < index);
      if (prefix === 'service') {
        item.querySelector('.service-item__name').setAttribute('aria-expanded', String(motionQuery.matches || hasFlowingLayout() || itemIndex === index));
      } else {
        item.setAttribute('aria-current', String(itemIndex === index));
      }
    });
  };

  const schedule = () => {
    if (!frame) frame = window.setTimeout(update, 16);
  };

  const onSelect = (event) => {
    const button = event.target.closest(prefix === 'service' ? '.service-item__name' : '.client-mark');
    if (!button || !root.contains(button)) return;
    const index = items.findIndex((item) => item.contains(button));
    if (index < 0) return;
    if (motionQuery.matches || hasFlowingLayout()) {
      items[index].scrollIntoView({ block: 'center', behavior: 'instant' });
      update();
      return;
    }
    const travel = Math.max(1, root.offsetHeight - window.innerHeight);
    const start = window.scrollY + root.getBoundingClientRect().top;
    window.scrollTo({ top: start + (index + 0.5) / items.length * travel, behavior: 'instant' });
    update();
  };

  schedule();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  motionQuery.addEventListener('change', schedule);
  root.addEventListener('click', onSelect);

  return () => {
    window.clearTimeout(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    motionQuery.removeEventListener('change', schedule);
    root.removeEventListener('click', onSelect);
  };
};

const setupIndexedScrollChapters = () => {
  const cleanups = [
    setupIndexedScrollChapter({
      rootSelector: '.services-page',
      itemSelector: '.service-item',
      currentSelector: '[data-service-current]',
      totalSelector: '[data-service-total]',
      activeNameSelector: '[data-service-active-name]',
      prefix: 'service'
    }),
    setupIndexedScrollChapter({
      rootSelector: '.clients-page',
      itemSelector: '.client-mark',
      currentSelector: '[data-client-current]',
      totalSelector: '[data-client-total]',
      activeNameSelector: '[data-client-active-name]',
      prefix: 'client'
    })
  ];
  return () => cleanups.forEach((cleanup) => cleanup());
};

const setupReelPlayer = () => {
  const player = document.getElementById('reel-player');
  const video = document.getElementById('reel-player-video');
  if (!player || !video) return () => {};

  const durationLabels = [...document.querySelectorAll('[data-showreel-duration]')];
  const updateDuration = () => {
    const duration = formatDuration(video.duration);
    durationLabels.forEach((label) => {
      label.textContent = duration;
    });
  };

  const loadSource = () => {
    const source = getShowreelSource();
    if (!isDirectVideoSource(source)) return false;
    if (video.dataset.source !== source) {
      video.src = source;
      video.dataset.source = source;
      video.load();
    }
    return true;
  };

  const open = () => {
    if (!loadSource()) return;
    player.classList.add('is-open');
    player.setAttribute('aria-hidden', 'false');
    document.body.classList.add('reel-player-open');
    video.play().catch(() => undefined);
  };

  const close = () => {
    player.classList.remove('is-open');
    player.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('reel-player-open');
    video.pause();
    video.currentTime = 0;
  };

  const openButtons = [...document.querySelectorAll('[data-open-reel]')];
  const closeButtons = [...player.querySelectorAll('[data-close-reel]')];
  openButtons.forEach((button) => button.addEventListener('click', open));
  closeButtons.forEach((button) => button.addEventListener('click', close));
  video.addEventListener('loadedmetadata', updateDuration);
  video.addEventListener('durationchange', updateDuration);
  loadSource();

  const onKeydown = (event) => {
    if (event.key === 'Escape' && player.classList.contains('is-open')) close();
  };
  document.addEventListener('keydown', onKeydown);

  return () => {
    openButtons.forEach((button) => button.removeEventListener('click', open));
    closeButtons.forEach((button) => button.removeEventListener('click', close));
    video.removeEventListener('loadedmetadata', updateDuration);
    video.removeEventListener('durationchange', updateDuration);
    document.removeEventListener('keydown', onKeydown);
    close();
  };
};

const setupRevealObserver = () => {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (items.length === 0) return () => {};
  let timer = 0;
  const revealImmediately = (item) => {
    const transition = item.style.transition;
    item.style.transition = 'none';
    item.classList.add('is-revealed');
    void item.offsetWidth;
    item.style.transition = transition;
  };
  const revealVisibleItems = () => {
    const viewportBottom = window.innerHeight - 50;
    items.forEach((item) => {
      if (item.classList.contains('is-revealed')) return;
      const bounds = item.getBoundingClientRect();
      const visibleHeight = Math.min(bounds.bottom, viewportBottom) - Math.max(bounds.top, 0);
      if (visibleHeight >= Math.min(bounds.height * 0.12, 50)) {
        revealImmediately(item);
      }
    });
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
  items.forEach((item) => observer.observe(item));
  const scheduleFallback = () => {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      revealVisibleItems();
    }, 16);
  };
  scheduleFallback();
  window.addEventListener('scroll', scheduleFallback, { passive: true });
  window.addEventListener('resize', scheduleFallback);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener('scroll', scheduleFallback);
    window.removeEventListener('resize', scheduleFallback);
    observer.disconnect();
  };
};

const setupAthensTime = () => {
  const time = document.getElementById('athens-time');
  if (!time) return () => {};

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const update = () => {
    const value = formatter.format(new Date());
    time.textContent = `LOCAL TIME / ${value}`;
    time.dateTime = value;
  };

  update();
  const timer = window.setInterval(update, 30000);
  return () => window.clearInterval(timer);
};

const setupMagneticElements = () => {
  const query = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!query.matches) return () => {};
  const elements = [...document.querySelectorAll('[data-magnetic]')];
  const cleanups = elements.map((element) => {
    const move = (event) => {
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 6;
      element.style.transform = `translate(${x}px, ${y}px)`;
    };
    const leave = () => {
      element.style.transform = '';
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', leave);
    return () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
    };
  });
  return () => cleanups.forEach((cleanup) => cleanup());
};

const setupFilmCursor = () => {
  const query = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!query.matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const cursor = document.createElement('div');
  cursor.className = 'film-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);

  const move = (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  };
  const over = (event) => {
    const target = event.target.closest('[data-film-cursor]');
    if (!target) return;
    cursor.textContent = target.dataset.cursorLabel || 'View Film';
    cursor.classList.toggle('is-contact', target.dataset.cursorKind === 'contact');
    cursor.classList.add('is-visible');
  };
  const out = (event) => {
    const target = event.target.closest('[data-film-cursor]');
    if (!target || target.contains(event.relatedTarget)) return;
    cursor.classList.remove('is-visible', 'is-contact');
  };

  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerover', over);
  document.addEventListener('pointerout', out);
  return () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerover', over);
    document.removeEventListener('pointerout', out);
    cursor.remove();
  };
};

export const setupStudioVideo = () => {
  const video = document.querySelector('.studio-feature__video');
  if (!video) return () => {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  const loadVideo = () => {
    if (!video.getAttribute('src')) {
      const sources = [...video.querySelectorAll('source[data-src]')];
      const source = sources.find((candidate) => !candidate.media || window.matchMedia(candidate.media).matches);
      if (!source) return;
      video.src = source.dataset.src;
      video.muted = true;
      video.preload = 'auto';
      video.load();
    }
  };
  const updatePlayback = () => {
    if (!visible || document.hidden || reducedMotion.matches) {
      video.pause();
      return;
    }
    loadVideo();
    video.play().catch(() => undefined);
  };
  const loadObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting) || document.hidden || reducedMotion.matches) return;
    loadVideo();
  }, { rootMargin: '300px' });
  const playbackObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  });
  loadObserver.observe(video);
  playbackObserver.observe(video);
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', updatePlayback);
  return () => {
    loadObserver.disconnect();
    playbackObserver.disconnect();
    document.removeEventListener('visibilitychange', updatePlayback);
    reducedMotion.removeEventListener('change', updatePlayback);
    video.pause();
  };
};

export const setupFilmExperience = () => {
  window.__anchevFilmExperienceCleanup?.();
  const nearImages = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.querySelectorAll('img[data-near-src]').forEach((image) => {
        image.src = image.dataset.nearSrc;
        image.removeAttribute('data-near-src');
      });
      nearImages.unobserve(entry.target);
    }
  });
  document.querySelectorAll('.tagline-story').forEach((section) => nearImages.observe(section));
  const contact = document.querySelector('.contact-page');
  const contactObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      contact?.classList.add('is-media-ready');
      contactObserver.disconnect();
    }
  }, { rootMargin: '600px' });
  if (contact) contactObserver.observe(contact);
  const cleanups = [
    () => nearImages.disconnect(),
    () => contactObserver.disconnect(),
    setupOpeningSequence(),
    setupStoryProgression(),
    setupIndexedScrollChapters(),
    setupReelPlayer(),
    setupStudioVideo(),
    setupRevealObserver(),
    setupAthensTime(),
    setupMagneticElements(),
    setupFilmCursor()
  ];
  window.__anchevFilmExperienceCleanup = () => cleanups.forEach((cleanup) => cleanup?.());
};

export const refreshFilmExperience = () => setupFilmExperience();