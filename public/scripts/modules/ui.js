import { siteContent } from '/scripts/content.js';
import { renderProjects } from '/scripts/modules/projects.js?v=20261010-project';

const body = document.body;
const menuToggle = document.getElementById('menu-toggle');
const menuOverlay = document.getElementById('menu-overlay');
const panelBackdrop = document.getElementById('panel-backdrop');
const soundToggle = document.getElementById('sound-toggle');
const heroMedia = document.getElementById('hero-media');
const ambienceStorageKey = 'anchev-ambience-enabled';
let heroVideo = null;
let youtubePlayer = null;
let youtubePlayerReady = false;
let youtubeApiPromise = null;
let heroPlayerVersion = 0;
let currentHeroSource = '';

const getResponsiveHeroSource = () => {
  const primarySource = String(siteContent.media.videoSource || '').trim();
  const mobileSource = String(siteContent.media.mobileVideoSource || '').trim();
  const desktopSource = primarySource === '/media/hero-video.mp4'
    ? '/media/hero-video-web.mp4'
    : primarySource;
  return window.matchMedia('(max-width: 820px)').matches && mobileSource
    ? mobileSource
    : desktopSource;
};

const normalizeYouTubeVideoId = (value) => {
  const videoId = String(value || '').trim();
  return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
};

const getYouTubeVideoId = (source) => {
  try {
    const url = new URL(source, window.location.origin);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = null;

    if (host === 'youtu.be') {
      [videoId] = url.pathname.split('/').filter(Boolean);
    } else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else {
        const [type, id] = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(type)) videoId = id;
      }
    }

    return normalizeYouTubeVideoId(videoId);
  } catch (_error) {
    return null;
  }
};

const createNativeHeroVideo = (source) => {
  const video = document.createElement('video');
  video.id = 'hero-video';
  video.className = 'hero-video';
  video.autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.dataset.src = source;
  if (heroMedia.dataset.poster) video.poster = heroMedia.dataset.poster;
  if (video.autoplay) video.src = source;
  video.addEventListener('playing', () => heroMedia.parentElement.classList.add('is-playing'));
  video.addEventListener('error', () => heroMedia.parentElement.classList.remove('is-playing'));
  return video;
};

const getYouTubePlayerVars = (videoId) => ({
  autoplay: 1,
  controls: 0,
  disablekb: 1,
  enablejsapi: 1,
  fs: 0,
  loop: 1,
  modestbranding: 1,
  mute: 1,
  origin: window.location.origin,
  playsinline: 1,
  playlist: videoId,
  rel: 0
});

const applyYouTubeIframeAttributes = (iframe) => {
  iframe.className = 'hero-video is-youtube';
  iframe.title = '';
  iframe.tabIndex = -1;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.setAttribute('aria-hidden', 'true');
};

const createYouTubePlayerHost = () => {
  const playerHost = document.createElement('div');
  playerHost.id = 'hero-video';
  playerHost.className = 'hero-video is-youtube';
  playerHost.setAttribute('aria-hidden', 'true');
  return playerHost;
};

const createYouTubeFallback = (videoId) => {
  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  Object.entries(getYouTubePlayerVars(videoId)).forEach(([key, value]) => {
    embedUrl.searchParams.set(key, String(value));
  });

  const iframe = document.createElement('iframe');
  iframe.id = 'hero-video';
  iframe.src = embedUrl.toString();
  applyYouTubeIframeAttributes(iframe);
  return iframe;
};

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousOnReady?.();
      resolve(window.YT);
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.addEventListener('error', () => {
      youtubeApiPromise = null;
      reject(new Error('Unable to load the YouTube player API.'));
    }, { once: true });
    document.head.append(script);
  });

  return youtubeApiPromise;
};

const updateHeroPlayback = () => {
  if (!heroVideo) return;

  if (youtubePlayer && youtubePlayerReady) {
    if (body.classList.contains('reduced-motion')) {
      youtubePlayer.pauseVideo();
    } else {
      youtubePlayer.mute();
      youtubePlayer.playVideo();
    }
    return;
  }

  if (heroVideo instanceof HTMLVideoElement) {
    if (body.classList.contains('reduced-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) {
      heroVideo.pause();
    } else {
      if (!heroVideo.getAttribute('src') && heroVideo.dataset.src) heroVideo.src = heroVideo.dataset.src;
      heroVideo.play().catch(() => undefined);
    }
    return;
  }
};

export const panelMap = {
  about: document.getElementById('panel-about'),
  projects: document.getElementById('panel-projects'),
  contact: document.getElementById('panel-contact'),
  privacy: document.getElementById('panel-privacy'),
  cookies: document.getElementById('panel-cookies'),
  terms: document.getElementById('panel-terms')
};

export const setVideoSource = () => {
  const source = getResponsiveHeroSource();
  if (!source || !heroMedia) return;

  currentHeroSource = source;
  heroPlayerVersion += 1;
  const playerVersion = heroPlayerVersion;
  if (youtubePlayer) youtubePlayer.destroy();
  youtubePlayer = null;
  youtubePlayerReady = false;

  const youtubeVideoId = getYouTubeVideoId(source);
  if (youtubeVideoId) {
    const playerHost = createYouTubePlayerHost();
    heroVideo = playerHost;
    heroMedia.replaceChildren(playerHost);

    loadYouTubeApi()
      .then((YT) => {
        if (playerVersion !== heroPlayerVersion || !heroMedia.contains(playerHost)) return;

        youtubePlayer = new YT.Player(playerHost, {
          videoId: youtubeVideoId,
          playerVars: getYouTubePlayerVars(youtubeVideoId),
          events: {
            onReady: (event) => {
              if (playerVersion !== heroPlayerVersion) {
                event.target.destroy();
                return;
              }
              heroVideo = event.target.getIframe();
              applyYouTubeIframeAttributes(heroVideo);
              youtubePlayerReady = true;
              updateHeroPlayback();
            }
          }
        });
      })
      .catch(() => {
        if (playerVersion !== heroPlayerVersion) return;
        heroVideo = createYouTubeFallback(youtubeVideoId);
        heroMedia.replaceChildren(heroVideo);
      });
    return;
  }

  heroVideo = createNativeHeroVideo(source);
  heroMedia.replaceChildren(heroVideo);
  updateHeroPlayback();
};

export const closeOverlay = () => {
  menuOverlay.classList.remove('is-open');
  menuOverlay.setAttribute('aria-hidden', 'true');
  menuToggle.setAttribute('aria-expanded', 'false');
};

export const closePanels = () => {
  Object.values(panelMap).forEach((panel) => panel.classList.remove('is-open'));
  panelBackdrop.classList.remove('is-visible');
  panelBackdrop.setAttribute('aria-hidden', 'true');
  body.classList.remove('panel-open');
};

export const openPanel = (key) => {
  closeOverlay();
  closePanels();
  const panel = panelMap[key];
  if (!panel) return;
  panel.classList.add('is-open');
  panelBackdrop.classList.add('is-visible');
  panelBackdrop.setAttribute('aria-hidden', 'false');
  body.classList.add('panel-open');
  if (key === 'projects') renderProjects();
};

export const animateIn = () => {
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-animate]').forEach((element, index) => {
      element.style.setProperty('--delay', `${index * 120}ms`);
      element.classList.add('is-visible');
    });
  });
};

export const setupMotionPreferences = () => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 820px)');
  const applyReduced = () => {
    if (media.matches) {
      body.classList.add('reduced-motion');
    } else {
      body.classList.remove('reduced-motion');
    }
    body.classList.toggle('is-mobile', mobile.matches);
    if (currentHeroSource !== getResponsiveHeroSource()) {
      setVideoSource();
      return;
    }
    updateHeroPlayback();
  };

  applyReduced();
  media.addEventListener('change', applyReduced);
  mobile.addEventListener('change', applyReduced);
};

export const setupOptionalAudio = () => {
  if (!siteContent.media.ambientAudio) return;

  const ambience = new Audio(siteContent.media.ambientAudio);
  ambience.loop = true;
  ambience.volume = 0.25;
  soundToggle.classList.remove('is-hidden');

  const setToggleState = (enabled) => {
    soundToggle.setAttribute('aria-pressed', String(enabled));
    soundToggle.textContent = enabled ? 'Ambience On' : 'Ambience Off';
    try {
      sessionStorage.setItem(ambienceStorageKey, String(enabled));
    } catch (_error) {}
  };

  let savedPreference = false;
  try {
    savedPreference = sessionStorage.getItem(ambienceStorageKey) === 'true';
  } catch (_error) {}
  setToggleState(savedPreference);

  const startAmbience = async () => {
    try {
      await ambience.play();
    } catch (_error) {
      soundToggle.textContent = 'Autoplay Blocked';
      soundToggle.setAttribute('aria-pressed', 'false');
    }
  };

  if (savedPreference) {
    document.addEventListener('pointerdown', startAmbience, { once: true });
  }

  soundToggle.addEventListener('click', async () => {
    const nextPressed = soundToggle.getAttribute('aria-pressed') !== 'true';
    setToggleState(nextPressed);

    if (nextPressed) {
      await startAmbience();
    } else {
      ambience.pause();
      ambience.currentTime = 0;
    }
  });
};

export const bindEvents = () => {
  menuToggle.addEventListener('click', () => {
    const nextState = !menuOverlay.classList.contains('is-open');
    menuOverlay.classList.toggle('is-open', nextState);
    menuOverlay.setAttribute('aria-hidden', String(!nextState));
    menuToggle.setAttribute('aria-expanded', String(nextState));
  });

  document.querySelectorAll('[data-open-panel]').forEach((button) => {
    button.addEventListener('click', () => openPanel(button.dataset.openPanel));
  });

  // Event delegation — handles dynamically-rendered buttons (e.g. about-fs-back)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scroll-to]');
    if (!btn) return;
    if (btn.matches('a') && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
    if (btn.matches('a')) e.preventDefault();
    closeOverlay();
    const targetId = btn.dataset.scrollTo;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    if (targetId === 'home') {
      document.body.classList.remove('about-unlocked');
      window.scrollTo({ top: 0, behavior });
    } else {
      document.body.classList.add('about-unlocked');
      document.getElementById(targetId)?.scrollIntoView({ behavior });
    }
  });

  document.querySelectorAll('[data-close-panel]').forEach((button) => {
    button.addEventListener('click', closePanels);
  });

  document.querySelectorAll('[data-close-overlay]').forEach((button) => {
    button.addEventListener('click', closeOverlay);
  });

  panelBackdrop.addEventListener('click', closePanels);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOverlay();
      closePanels();
    }
  });
};
