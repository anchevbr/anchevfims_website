import { renderAbout } from '/scripts/modules/about.js';
import { setupAnalytics } from '/scripts/modules/analytics.js?v=20261006-ads-cookies';
import { renderArticles } from '/scripts/modules/articles.js';
import { renderClients } from '/scripts/modules/clients.js?v=20261006-index';
import { renderContact } from '/scripts/modules/contact.js';
import { renderLegalPanel } from '/scripts/modules/legal.js';
import { renderPodcast } from '/scripts/modules/podcast.js';
import { setupFilmExperience } from '/scripts/modules/experience.js?v=20261010-studio-page';
import { openProjectFromLocation, renderProjectBrowser } from '/scripts/modules/projects.js?v=20261010-project';
import { setVideoSource, bindEvents, openPanel, setupMotionPreferences, setupOptionalAudio, animateIn } from '/scripts/modules/ui.js?v=20261010-navigation-motion';
import { openAdminOverlay } from '/scripts/modules/admin.js?v=20261010-project';
import { siteContent } from '/scripts/content.js';

setupAnalytics();

const applySettings = (s) => {
  if (s.videoSource) siteContent.media.videoSource = s.videoSource;
  if (s.mobileVideoSource) siteContent.media.mobileVideoSource = s.mobileVideoSource;
  if (s.showreelSource) siteContent.media.showreelSource = s.showreelSource;
  if (s.contact) Object.assign(siteContent.contact, s.contact);
  if (Array.isArray(s.social)) siteContent.contact.social = s.social;
};

const init = async () => {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) applySettings(await res.json());
  } catch (_) {}

  setVideoSource();
  renderAbout();
  await renderClients();
  renderPodcast();
  await renderArticles();
  renderContact();
  await renderProjectBrowser();
  renderLegalPanel('privacy');
  renderLegalPanel('cookies');
  renderLegalPanel('terms');
  bindEvents();
  if (window.location.hash === '#panel-cookies') openPanel('cookies');
  setupMotionPreferences();
  setupOptionalAudio();
  setupFilmExperience();
  animateIn();
  await openProjectFromLocation();

  if (window.location.pathname === '/studio/anchev') {
    openAdminOverlay();
  }

  document.getElementById('footer-admin-btn').addEventListener('click', openAdminOverlay);
};

init();
