const MEASUREMENT_ID = 'G-PK5DJ9ZFQE';
const GOOGLE_ADS_ID = 'AW-18486399436';
const EMAIL_CONVERSION_ID = `${GOOGLE_ADS_ID}/YDZJCJ-hyZIdEMyjgO9E`;
const CONSENT_STORAGE_KEY = 'anchev-consent-v1';

let consent = { analytics: false, advertising: false };
let googleTagLoaded = false;

const getGtag = () => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  return window.gtag;
};

const getStoredConsent = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY));
    if (typeof value?.analytics === 'boolean' && typeof value?.advertising === 'boolean') {
      return value;
    }
  } catch (_error) {}
  return null;
};

const deleteDeniedGoogleCookies = () => {
  document.cookie.split(';').forEach((entry) => {
    const name = entry.split('=')[0].trim();
    const analyticsCookie = name.startsWith('_ga');
    const advertisingCookie = name.startsWith('_gcl_') || name.startsWith('_gac_');
    if ((!analyticsCookie || consent.analytics) && (!advertisingCookie || consent.advertising)) return;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
  });
};

const loadGoogleTag = () => {
  if (googleTagLoaded) return;
  googleTagLoaded = true;

  const script = document.createElement('script');
  script.id = 'google-analytics-tag';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.append(script);

  const gtag = getGtag();
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    send_page_view: consent.analytics,
    allow_google_signals: consent.advertising
  });
  if (consent.advertising) gtag('config', GOOGLE_ADS_ID);
};

const updateConsent = (nextConsent, { persist = true } = {}) => {
  const previousAnalyticsConsent = consent.analytics;
  const previousAdvertisingConsent = consent.advertising;
  consent = {
    analytics: Boolean(nextConsent.analytics),
    advertising: Boolean(nextConsent.advertising)
  };

  getGtag()('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.advertising ? 'granted' : 'denied',
    ad_user_data: consent.advertising ? 'granted' : 'denied',
    ad_personalization: consent.advertising ? 'granted' : 'denied'
  });

  if (persist) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch (_error) {}
  }
  if (googleTagLoaded && (previousAdvertisingConsent !== consent.advertising || (!previousAnalyticsConsent && consent.analytics))) {
    getGtag()('config', MEASUREMENT_ID, {
      send_page_view: !previousAnalyticsConsent && consent.analytics,
      allow_google_signals: consent.advertising
    });
  }
  if (googleTagLoaded && !previousAdvertisingConsent && consent.advertising) {
    getGtag()('config', GOOGLE_ADS_ID);
  }
  if (consent.analytics || consent.advertising) loadGoogleTag();
  if (!consent.analytics || !consent.advertising) deleteDeniedGoogleCookies();
};

const trackContactIntent = (anchor) => {
  if ((!consent.analytics && !consent.advertising) || !googleTagLoaded) return;
  const href = anchor.getAttribute('href') || '';
  const method = href.startsWith('mailto:') ? 'email' : 'telephone';
  getGtag()('event', `contact_${method}_click`, {
    contact_method: method
  });
  if (method === 'email' && consent.advertising) {
    getGtag()('event', 'conversion', { send_to: EMAIL_CONVERSION_ID });
  }
};

export const setupAnalytics = () => {
  if (document.documentElement.hasAttribute('data-settings-preview')) return;
  const banner = document.getElementById('consent-banner');
  const preferences = document.getElementById('consent-preferences');
  const analyticsToggle = document.getElementById('consent-analytics');
  const advertisingToggle = document.getElementById('consent-advertising');
  const manageButton = banner?.querySelector('[data-consent-manage]');
  const heading = document.getElementById('consent-title');
  if (!banner || !preferences || !analyticsToggle || !advertisingToggle || !manageButton) return;

  const gtag = getGtag();
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  const closeBanner = () => {
    banner.hidden = true;
    preferences.hidden = true;
    manageButton.setAttribute('aria-expanded', 'false');
  };

  const showBanner = ({ manage = false } = {}) => {
    banner.hidden = false;
    preferences.hidden = !manage;
    manageButton.setAttribute('aria-expanded', String(manage));
    analyticsToggle.checked = consent.analytics;
    advertisingToggle.checked = consent.advertising;
    window.requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
  };

  const saveChoice = (nextConsent) => {
    updateConsent(nextConsent);
    closeBanner();
  };

  banner.querySelector('[data-consent-reject]')?.addEventListener('click', () => {
    saveChoice({ analytics: false, advertising: false });
  });
  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => {
    saveChoice({ analytics: true, advertising: true });
  });
  banner.querySelector('[data-consent-save]')?.addEventListener('click', () => {
    saveChoice({
      analytics: analyticsToggle.checked,
      advertising: advertisingToggle.checked
    });
  });
  manageButton.addEventListener('click', () => {
    const isOpen = preferences.hidden;
    preferences.hidden = !isOpen;
    manageButton.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
    button.addEventListener('click', () => showBanner({ manage: true }));
  });
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href^="mailto:"], a[href^="tel:"]');
    if (anchor) trackContactIntent(anchor);
  });

  const storedConsent = getStoredConsent();
  if (storedConsent) {
    updateConsent(storedConsent, { persist: false });
    closeBanner();
  } else {
    showBanner();
  }
};