import { load } from 'cheerio';
import { escapeHtml, renderContactPageMarkup, renderStudioPageMarkup } from '../public/scripts/modules/content-markup.js';
import { copy, homepageFields } from '../public/scripts/modules/localization.js';
import { servicePages, getServicePage } from '../public/scripts/modules/service-pages.js';
import { renderLegalPanelMarkup } from '../public/scripts/modules/legal.js';
import { applyCinemaDesign } from './cinema.js';

const greekHome = {
  '.hero-kicker': 'Κινηματογραφική παραγωγή / Αθήνα',
  '.hero-positioning': 'Ιδέες με κατεύθυνση. Παραγωγές με συνέπεια. Ταινίες που ξεχωρίζουν.',
  '.reel-trigger-label': 'Δείτε το showreel',
  '.story-label': 'Μια παραγωγή σε τρία στάδια',
  '[data-story-scene="0"] .story-scene-number': '01 / Δημιουργική κατεύθυνση',
  '[data-story-scene="0"] h2': 'Ιδέες<span>.</span>',
  '[data-story-scene="0"] > p:last-child': 'Η δουλειά ξεκινά πριν από το γύρισμα: με σαφή στόχο, μια δημιουργική ματιά και έναν λόγο για να γίνει η ταινία.',
  '[data-story-scene="1"] .story-scene-number': '02 / Οργάνωση παραγωγής',
  '[data-story-scene="1"] h2': 'Σχεδιασμός<span>.</span>',
  '[data-story-scene="1"] > p:last-child': 'Η ιδέα γίνεται πλάνο παραγωγής. Το συνεργείο, οι συνθήκες και οι αποφάσεις δουλεύουν μαζί για να της δώσουν μορφή.',
  '[data-story-scene="2"] .story-scene-number': '03 / Ταινία',
  '[data-story-scene="2"] h2': 'Στην<br>οθόνη<span>.</span>',
  '[data-story-scene="2"] > p:last-child': 'Το αποτέλεσμα δεν είναι μόνο ένα ολοκληρωμένο κάδρο. Είναι μια ταινία με προοπτική σε διαφορετικά κοινά και κανάλια προβολής.',
  '#work-page .section-kicker': 'Επιλεγμένες παραγωγές',
  '#work-title': 'Ταινίες με<br><em>χαρακτήρα.</em>',
  '#work-page .experience-heading > p:last-child': 'Παραγωγές, επιλεγμένες εικόνες και η προσέγγιση πίσω από κάθε έργο.',
  '#studio-feature-title': 'Το<br><em>στούντιο.</em>',
  '.studio-feature__eyebrow': '<span>Στον χώρο της Anchev Films</span><span>Αθήνα / Διεθνώς</span>',
  '.studio-feature__footer > span:first-child': 'Γνωρίστε το στούντιο<br>Απεικόνιση με τεχνητή νοημοσύνη',
  '#services-page .section-kicker': 'Ολοκληρωμένη παραγωγή',
  '#services-title': 'Από την ιδέα<br><em>στην οθόνη.</em>',
  '#services-page .experience-heading > p:last-child': 'Από την πρώτη ιδέα και το σενάριο μέχρι τα γυρίσματα, το μοντάζ και την τελική παράδοση.',
  '.services-ledger-meta': '<p>Αθήνα / Διεθνώς</p><p>Ιδέα / Γυρίσματα / Post-production / Παράδοση</p>',
  '#service-directory-title': 'Υπηρεσίες παραγωγής',
  '#clients-page .section-kicker': 'Επιλεγμένοι πελάτες',
  '#clients-title': 'Εμπιστοσύνη<br><em>στην εικόνα.</em>',
  '.clients-stage-meta > span:first-child': 'Ευρετήριο πελατών',
  '.clients-spotlight__eyebrow': 'Στο επίκεντρο',
  '.clients-spotlight__name': 'Επιλεγμένοι πελάτες',
  '#podcast-page .section-kicker': 'Ακούστε τα podcasts μας',
  '.podcast-heading__link': 'Ακούστε στο Spotify',
  '.podcast-episodes__heading > p': 'Πρόσφατα επεισόδια',
  '#articles-page .section-kicker': 'Άρθρα / Τύπος',
  '#articles-title': 'Ιστορίες πίσω<br><em>από τις παραγωγές.</em>',
  '.articles-heading > div > p': 'Δημοσιεύματα, συζητήσεις και ιστορίες που συνδέονται με τις παραγωγές μας.',
  '.menu-eyebrow': 'Μενού', '.overlay-close': 'Κλείσιμο',
  '.menu-location-meta > span:first-child': 'ΑΘΗΝΑ / ΕΛΛΑΔΑ',
  '.menu-location-meta > span:nth-child(2)': 'ΠΑΡΑΓΩΓΕΣ ΔΙΕΘΝΩΣ',
  '.menu-legal-eyebrow': 'Νομικές πληροφορίες',
  '.footer-meta > span': 'Με βάση την Αθήνα. Με προοπτική πέρα από τα σύνορα.',
  '.about-ed-eyebrow': 'Η Anchev Films', '.about-ed-back': 'Επιστροφή',
  '.about-ed-quote em': '«Ο στόχος είναι απλός: η δουλειά να έχει ουσία.»',
  '.about-ed-quote cite': 'Boris Anchev, Ιδρυτής',
  '.about-ed-tagline': 'Η ανάγκη να κάνουμε τις ιδέες πραγματικότητα.',
  '#consent-title': 'Επιλέξτε πώς χρησιμοποιούνται τα δεδομένα σας.',
  '.consent-banner__eyebrow': 'Επιλογές απορρήτου',
  '.consent-banner__copy': 'Τα προαιρετικά εργαλεία ανάλυσης και μέτρησης διαφήμισης ενεργοποιούνται μόνο μετά την επιλογή σας.',
  '[data-consent-reject]': 'Απόρριψη προαιρετικών', '[data-consent-manage]': 'Ρυθμίσεις', '[data-consent-accept]': 'Αποδοχή όλων',
  '[data-consent-save]': 'Αποθήκευση επιλογών', '[data-cookie-settings]': 'Ρυθμίσεις cookies',
  '[data-open-panel="privacy"]': 'Πολιτική απορρήτου', '[data-open-panel="cookies"]': 'Πολιτική cookies', '[data-open-panel="terms"]': 'Όροι χρήσης',
  '.consent-preference:first-child strong': 'Ανάλυση επισκεψιμότητας',
  '.consent-preference:first-child strong + span': 'Μέτρηση χρήσης σελίδων και ενεργειών επικοινωνίας με το Google Analytics.',
  '.consent-preference:nth-child(2) strong': 'Μέτρηση διαφήμισης',
  '.consent-preference:nth-child(2) strong + span': 'Μέτρηση καμπανιών και ενεργειών επικοινωνίας της Google.',
  '.panel-close': 'Κλείσιμο', '.reel-player-close': 'Κλείσιμο', '#menu-toggle': 'Μενού'
};
const greekAbout = [
  ['Η φιλοδοξία χρειάζεται<br>σχέδιο.', 'Μια καλή ιδέα χρειάζεται ένα πλάνο που να αντέχει στις απαιτήσεις του προϋπολογισμού, του χρόνου, των χώρων και της ομάδας.', 'Ορίζουμε νωρίς την κατεύθυνση, συγκροτούμε την κατάλληλη ομάδα και οργανώνουμε την παραγωγή γύρω από το έργο.'],
  ['Η παραγωγή δίνει<br>ρυθμό.', 'Φέρνουμε τους σωστούς ανθρώπους στη συζήτηση από την αρχή και κρατάμε κοντά τη δημιουργική πρόθεση με την εκτέλεση.', 'Έτσι η παραγωγή προχωρά χωρίς βιαστικές παραχωρήσεις και η ιδέα διατηρεί τον χαρακτήρα της μέχρι την παράδοση.'],
  ['Συνέπεια μέχρι<br>την παράδοση.', 'Από το πρώτο treatment έως το τελικό αρχείο, αναλαμβάνουμε τις λεπτομέρειες που καθορίζουν το αποτέλεσμα.', 'Κάθε επιλογή υπηρετεί την ταινία: την κάνει πιο δυνατή, πιο σαφή και πιο αποτελεσματική.'],
  ['Κοντά στα<br>δύσκολα σημεία.', 'Μια αλλαγή της τελευταίας στιγμής, ένας απαιτητικός χώρος ή ένα στενό χρονοδιάγραμμα χρειάζονται καθαρές αποφάσεις.', 'Είμαστε εκεί για να βρούμε λύσεις και να προστατεύσουμε την ποιότητα της παραγωγής.'],
  ['Η ταινία πρέπει<br>να ταξιδεύει.', 'Η δουλειά συνεχίζεται πέρα από το γύρισμα: σε διαφορετικά κοινά, κανάλια και αγορές.', 'Σχεδιάζουμε με σαφή ιδέα, προσεγμένο φινίρισμα και οργανωμένη παράδοση, ώστε η ταινία να στέκεται όπου κι αν προβληθεί.']
];
const greekServices = [
  ['Δημιουργική ανάπτυξη', ['Δημιουργική στρατηγική', 'Ιδέα και σύλληψη', 'Treatments και σενάρια', 'Storyboards και πλάνα λήψεων', 'Σχεδιασμός καμπάνιας και μορφών']],
  ['Παράδοση και εκδόσεις', ['Αρχεία για μετάδοση και πλατφόρμες', 'Σύντομα βίντεο και αναλογίες εικόνας', 'Λεζάντες και υπότιτλοι', 'Γλωσσική προσαρμογή', 'Παράδοση τελικού υλικού']],
  ['Βιντεοσκόπηση εκδηλώσεων', ['Συνέδρια και εταιρικές εκδηλώσεις', 'Συναυλίες και παραστάσεις', 'Παρουσιάσεις προϊόντων', 'Πολυκάμερη καταγραφή', 'Ταινίες με στιγμιότυπα της εκδήλωσης']],
  ['Παραγωγή ταινιών και βίντεο', ['Διαφημιστικά και brand films', 'Εταιρικές ταινίες και ντοκιμαντέρ', 'Συνεντεύξεις και μαρτυρίες', 'Βίντεο για κοινωνικά δίκτυα', 'Γυρίσματα σε τοποθεσίες και στούντιο']],
  ['Post-production', ['Μοντάζ και αφήγηση', 'Χρωματική επεξεργασία', 'Σχεδιασμός και μίξη ήχου', 'Motion graphics και VFX', 'Μουσική και εκφωνήσεις']],
  ['Προετοιμασία παραγωγής', ['Προϋπολογισμός και χρονοδιάγραμμα', 'Casting και αναζήτηση χώρων', 'Συνεργείο και εξοπλισμός', 'Σκηνογραφία και εικαστική κατεύθυνση', 'Άδειες και οργάνωση']]
];

export const sitePageTemplates = () => {
  const studio = load(renderStudioPageMarkup());
  const location = studio('a[href^="https://www.google.com/maps/dir/"]').closest('section');
  return ['en', 'el'].flatMap((locale) => {
    const greek = locale === 'el';
    const studioCopy = getServicePage('/el/studio').el;
    return [
      ...servicePages.map((service) => ({ id: `service-${service.slug}`, locale, heading: service[locale].title, intro: service[locale].intro, body: service[locale].brief, blocks: [{ type: 'image', url: service.heroImage || '/media/studio/studio-frame-01.jpg', alt: service.heroAlt || (greek ? 'Εσωτερικό στούντιο' : 'Studio interior'), title: '', text: '' }, ...service[locale].sections.map(([title, text]) => ({ type: 'text', title, text, url: '', alt: '' })), ...(service[locale].capabilities || []).map((text) => ({ type: 'fact', title: greek ? 'Δυνατότητα' : 'Capability', text }))] })),
      { id: 'studio', locale, heading: greek ? studioCopy.title : 'Anchev Studio.', intro: greek ? studioCopy.intro : studio('.case-study__copy-section').first().find('p:not(.case-study__section-label)').text(), body: greek ? studioCopy.brief : studio('.case-study__copy-section').last().find('p').text(), blocks: [
        { type: 'image', url: '/media/experience/studio-poster.jpg', alt: greek ? 'Anchev Studio' : 'Inside Anchev Studio' },
        { type: 'video', url: '/media/experience/studio-web.mp4' },
        ...[['Width', 'Πλάτος', '12 m'], ['Depth', 'Βάθος', '16 m'], ['Height', 'Ύψος', '5 m'], ['Approximate footprint', 'Κατά προσέγγιση αποτύπωμα', '192 sq m']].map(([en, el, text]) => ({ type: 'fact', title: greek ? el : en, text })),
        ...(greek ? studioCopy.sections.map(([title, text]) => ({ type: 'text', title, text })) : studio('.studio-page__capabilities .case-study__copy-section').map((_index, element) => ({ type: 'text', title: studio(element).find('h2').text(), text: studio(element).find('div > p').text() })).get()),
        ...(!greek ? [{ type: 'text', title: location.find('h2').text(), text: location.find('div > p').text() }] : []),
        { type: 'link', title: greek ? 'Οδηγίες άφιξης' : 'Get directions', url: location.find('a').attr('href') },
        ...[1, 2, 3].map((number) => ({ type: 'image', url: `/media/studio/studio-frame-0${number}.jpg`, alt: `${greek ? 'Εικόνα στούντιο' : 'Studio view'} ${number}` }))
      ] },
      { id: 'contact', locale, heading: greek ? 'Έχετε μια ιδέα; Ας της δώσουμε εικόνα.' : "Have something in mind? Let's make it.", intro: '', body: '', blocks: [] },
      { id: 'about', locale, heading: 'Anchev Films.', intro: greek ? 'Ανεξάρτητη εταιρεία κινηματογραφικής και οπτικοακουστικής παραγωγής με βάση την Αθήνα και συνεργασίες στην Ελλάδα και διεθνώς.' : 'An independent film and audiovisual production company based in Athens, working with brands, agencies and collaborators in Greece and internationally.', body: '', blocks: greek ? [
        { type: 'text', title: 'Η φιλοδοξία χρειάζεται σχέδιο.', text: 'Μια καλή ιδέα χρειάζεται ένα πλάνο που να αντέχει στις απαιτήσεις του προϋπολογισμού, του χρόνου, των χώρων και της ομάδας. Ορίζουμε νωρίς την κατεύθυνση και οργανώνουμε την παραγωγή γύρω από το έργο.' },
        { type: 'text', title: 'Η παραγωγή δίνει ρυθμό.', text: 'Φέρνουμε τους σωστούς ανθρώπους στη συζήτηση από την αρχή και κρατάμε κοντά τη δημιουργική πρόθεση με την εκτέλεση. Έτσι η ιδέα διατηρεί τον χαρακτήρα της μέχρι την παράδοση.' },
        { type: 'text', title: 'Μέχρι την τελική παράδοση.', text: 'Από το πρώτο treatment έως το τελικό αρχείο, κάθε επιλογή υπηρετεί την ταινία. Σχεδιάζουμε για διαφορετικά κοινά, κανάλια και αγορές.' }
      ] : [
        { type: 'text', title: 'Ambition needs a way through.', text: 'A good idea needs a plan that can carry it through the realities of budget, schedule, location and people. We build the structure early: one clear direction, the right team and a production plan that keeps the work moving.' },
        { type: 'text', title: 'Production should create momentum.', text: 'We bring the right people into the conversation early and keep creative intent close to execution. The production moves forward without losing the character of the idea.' },
        { type: 'text', title: 'Through to delivery.', text: 'From the first treatment to the final file, each choice serves the film. We plan for its life across audiences, channels and markets.' }
      ] }
    ];
  });
};

export const renderPageBody = (page, language = 'en') => {
  const words = copy(language);
  const blocks = (page.blocks || []).map((block) => {
    if (block.type === 'image') return `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy" />${block.text ? `<figcaption>${escapeHtml(block.text)}</figcaption>` : ''}</figure>`;
    if (block.type === 'video') return `<video src="${escapeHtml(block.url)}" controls playsinline preload="none" aria-label="${escapeHtml(block.title || words.film)}"></video>`;
    if (block.type === 'link') return `<p><a class="case-study__external" href="${escapeHtml(block.url)}">${escapeHtml(block.title || block.url)}</a></p>`;
    return `<section>${block.title ? `<h2>${escapeHtml(block.title)}</h2>` : ''}<p>${escapeHtml(block.text).replace(/\n/g, '<br />')}</p></section>`;
  }).join('');
  return `<article class="editorial-page"><header><a href="${language === 'el' ? '/el/' : '/'}" class="editorial-page__brand">ANCHEV FILMS</a><h1>${escapeHtml(page.heading)}</h1>${page.intro ? `<p class="editorial-page__intro">${escapeHtml(page.intro)}</p>` : ''}</header><main>${page.body ? `<p>${escapeHtml(page.body).replace(/\n/g, '<br />')}</p>` : ''}${blocks}</main><footer><a class="case-study__external" href="${language === 'el' ? '/el/#contact-page' : '/#contact-page'}">${words.startProject}</a></footer></article>`;
};

export const renderPublicDocument = (html, { language = 'en', route = '/', store, settings: settingsOverride, page: pageOverride = null, preview = null, home = false, project = null }) => {
  const $ = load(html);
  const words = copy(language);
  $('html').attr('lang', language);
  $('head').prepend('<script>document.documentElement.classList.add("has-js")</script>');
  $('head').append('<link rel="stylesheet" href="/styles/refinements.css?v=20261015-platform" />');
  $('body').prepend(`<a class="public-skip-link" href="${home ? '#work-page' : '#project-page-root'}">${language === 'el' ? 'Μετάβαση στο περιεχόμενο' : 'Skip to content'}</a>`);
  if (home) {
    $('.tagline-story-image').each((_index, element) => {
      const image = $(element);
      const fallback = $.html(element);
      image.attr('data-near-src', image.attr('src')).attr('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
      image.after(`<noscript>${fallback}</noscript>`);
    });
    $('head').append('<noscript><style>img[data-near-src]{display:none}</style></noscript>');
    const contentSettings = settingsOverride || store.settings();
    const source = contentSettings.videoSource || '/media/hero-video.mp4';
    const original = store.db.prepare('SELECT id FROM media WHERE url=?').get(source);
    const generatedPoster = original ? store.db.prepare("SELECT url FROM media_derivatives WHERE media_id=? AND kind='poster'").get(original.id)?.url : null;
    const poster = generatedPoster || (['/media/hero-video.mp4', '/media/hero-video-web.mp4'].includes(source) ? '/media/hero-poster.webp' : null);
    if (poster) {
      $('head').append(`<link rel="preload" as="image" href="${escapeHtml(poster)}" fetchpriority="high" />`);
      $('#hero-media').attr('data-poster', poster).before(`<img class="hero-poster" src="${escapeHtml(poster)}" alt="" width="1280" height="536" fetchpriority="high" decoding="async" />`);
    }
    const settings = JSON.stringify(contentSettings).replace(/</g, '\\u003c');
    $('head').append(`<script id="public-settings" type="application/json">${settings}</script>`);
    const projects = JSON.stringify(store.projects({ publicOnly: true, locale: language })).replace(/</g, '\\u003c');
    $('head').append(`<script id="public-projects" type="application/json">${projects}</script>`);
    $('.hero h1').html('<span>Anchev</span><span class="hero-title-accent">Films.</span>');
    $('.hero h1').after('<p class="hero-positioning">Ideas, planned and brought to life.<br>Film production in Athens. Built for everywhere.</p>');
    $('.hero-kicker').text('Film production / Athens');
    const categories = [...new Set(store.projects({ publicOnly: true }).map((entry) => entry.category).filter(Boolean))];
    $('#work-browser').before(`<div class="work-filters"><label for="work-search">${words.search}<input type="search" id="work-search" /></label><label for="work-category">${words.filter}<select id="work-category"><option value="">${words.all}</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}</select><p id="work-filter-status" role="status" aria-live="polite"></p></div>`);
    if (language === 'el') {
      for (const [selector, value] of Object.entries(greekHome)) $(selector).html(value);
      const labels = ['Στούντιο', 'Παραγωγές', 'Εταιρεία', 'Υπηρεσίες', 'Podcasts', 'Άρθρα', 'Επικοινωνία'];
      $('.desktop-nav a, .menu-nav-col a').each((_index, element) => {
        const link = $(element);
        const index = ['/studio', '#work-page', '#about-page', '#services-page', '#podcast-page', '#articles-page', '#contact-page'].indexOf(link.attr('href'));
        if (index >= 0) link.text(labels[index]);
      });
      $('.about-ed-section').each((index, element) => {
        const content = greekAbout[index];
        if (!content) return;
        $(element).find('h3').html(content[0]);
        $(element).find('.about-ed-body').html(`<p>${content[1]}</p><p>${content[2]}</p>`);
      });
      $('.service-item').each((index, element) => {
        $(element).find('button').text(greekServices[index][0]);
        $(element).find('.service-item__details').html(greekServices[index][1].map((item) => `<li>${item}</li>`).join(''));
      });
      $('[data-service-active-name]').text(greekServices[0][0]);
      $('.podcast-episode__topline > span').each((_index, element) => $(element).text($(element).text().replace('Episode', words.episode)));
      $('.podcast-episode__footer a').text(words.openEpisode);
      $('.article-row__action').text(words.readArticle);
      $('.articles-empty').text(words.articlesEmpty);
      $('.podcast-episodes__status').contents().filter((_index, node) => node.type === 'text').first().replaceWith(`${words.podcastEmpty} `);
      $('.podcast-episodes__status a').text(words.followSpotify);
      $('[data-podcast-play]').each((_index, element) => $(element).attr('aria-label', `${words.play} ${$(element).attr('data-episode-title')}`));
      $('[data-project-id]').each((_index, element) => {
        const current = store.project($(element).attr('data-project-id'), { publicOnly: true, locale: 'el' });
        if (!current?.hasGreek) $(element).attr('lang', 'en');
      });
      $('#contact-page-content').html(renderContactPageMarkup({ ...contentSettings.contact, social: contentSettings.social }, 'el'));
    }
    for (const key of ['privacy', 'cookies', 'terms']) {
      const managed = key !== 'privacy' && store.page(key, language, true);
      if (key === 'privacy' || managed) {
        const href = `${language === 'el' ? '/el' : ''}${key === 'privacy' ? '/privacy' : `/pages/${key}`}`;
        $(`[data-open-panel="${key}"]`).each((_index, element) => {
          const button = $(element);
          button.replaceWith(`<a class="${escapeHtml(button.attr('class') || '')}" href="${href}">${escapeHtml(button.text())}</a>`);
        });
      } else $(`#panel-content-${key}`).html(renderLegalPanelMarkup(key, language));
    }
    for (const field of homepageFields) {
      const value = contentSettings.homepage?.[language]?.[field.key];
      if (typeof value === 'string' && value.trim()) $(field.selector).html(escapeHtml(value).replace(/\n/g, '<br />')).removeAttr('lang');
    }
    const contactPage = pageOverride?.id === 'contact' ? pageOverride : store.page('contact', language, true);
    if (contactPage) $('#contact-page-content').html(renderContactPageMarkup({ ...contentSettings.contact, social: contentSettings.social }, language, contactPage));
    const about = store.page('about', language, true);
    if (about?.heading) {
      $('#about-page-content').html(`<div class="managed-about"><p class="section-kicker">${language === 'el' ? 'Η εταιρεία' : 'About Anchev Films'}</p><h2>${escapeHtml(about.heading)}</h2><p>${escapeHtml(about.intro)}</p><p>${escapeHtml(about.body).replace(/\n/g, '<br />')}</p></div>`);
    }
  }
  if (project && language === 'el') {
    $('.case-study__running-title').text('Anchev Films / Επιλεγμένες παραγωγές');
    $('.case-study__close').text(words.back).attr('href', '/el/#work-page');
    $('.case-study__copy-section').each((index, element) => {
      const labels = [words.brief, words.approach, words.production];
      const heading = $(element).find('h2');
      const original = heading.text();
      const label = original.startsWith('The Brief') ? words.brief : original.startsWith('Our Approach') ? words.approach : original.startsWith('The Production') ? words.production : original.startsWith('In the press') ? words.press : labels[index];
      if (label) { heading.text(`${label}.`); $(element).find('.case-study__section-label').text(`${String(index + 1).padStart(2, '0')} / ${label}`); }
    });
    $('.case-study__film h2').each((_index, element) => $(element).text($(element).text() === 'The Film' ? words.film : words.behind));
    $('.case-study__film').each((_index, element) => {
      const title = $(element).find('h2').text();
      $(element).find('[data-youtube-id]').attr({ 'data-film-title': title, 'aria-label': `${words.play} ${title}` });
      $(element).find('a[href^="https://www.youtube.com/"]').text(words.watchYoutube);
    });
    $('.case-study__frames').attr('aria-label', words.gallery).find('img').each((index, element) => $(element).attr('alt', `${words.photograph} ${index + 1}: ${project.name}`));
    if (!project.pressTitle) $('.case-study__copy-section a').filter((_index, element) => $(element).attr('href') === project.pressLink).text(words.readCoverage);
    $('.case-study__next-label').text(words.next);
    $('.case-study__external[href="/#contact-page"]').text(words.startProject).attr('href', '/el/#contact-page');
    const labels = { Director: words.director, Producer: words.producer, Cinematography: words.dop, Location: words.location, Duration: words.duration, Services: words.services, Deliverables: words.deliverables };
    $('.case-study__detail dt').each((_index, element) => $(element).text(labels[$(element).text()] || $(element).text()));
  }
  if (language === 'el') {
    $('a[href="/studio"]').attr('href', '/el/studio');
    $('a[href="/"]').attr('href', '/el/');
    $('.service-page__links a').each((_index, element) => {
      const link = $(element);
      const service = servicePages.find((entry) => link.attr('href') === `/services/${entry.slug}`);
      if (service) link.attr('href', `/el/services/${service.slug}`).text(service.el.title);
    });
    $('a[href^="/work/"]').each((_index, element) => {
      const id = $(element).attr('href').split('/')[2];
      if (store.project(id, { publicOnly: true })?.hasGreek) $(element).attr('href', `/el/work/${id}`);
    });
  }
  const pageId = route.match(/^\/(?:el\/)?pages\/([a-z0-9-]+)$/)?.[1];
  const newsId = route.match(/^\/(?:el\/)?news\/([a-z0-9-]+)$/)?.[1];
  const hasCounterpart = home || Boolean(project?.hasGreek) || /^\/(?:el\/)?(?:studio|privacy|work|services|about|contact|press|podcast|news)$/.test(route) || /^\/(?:el\/)?services\//.test(route) || Boolean(pageId && store.page(pageId, language === 'el' ? 'en' : 'el', true)) || Boolean(newsId && store.page(`news-${newsId}`, language === 'el' ? 'en' : 'el', true));
  const counterpart = hasCounterpart ? language === 'el' ? route.replace(/^\/el(?=\/|$)/, '') || '/' : `/el${route === '/' || route === '/index.html' ? '/' : route}` : null;
  const languageLinks = `<nav class="language-switch" aria-label="${language === 'el' ? 'Γλώσσα' : 'Language'}"><a href="${language === 'el' ? counterpart || '/' : route}" lang="en" ${language === 'en' ? 'aria-current="page"' : ''}>EN</a>${counterpart || language === 'el' ? `<a href="${language === 'el' ? route : counterpart}" lang="el" ${language === 'el' ? 'aria-current="page"' : ''}>EL</a>` : ''}</nav>`;
  if ($('.topbar-actions').length) $('.topbar-actions').prepend(languageLinks);
  else if ($('.case-study__header').length) $('.case-study__header').prepend(languageLinks);
  else $('.editorial-page > header').prepend(languageLinks);
  applyCinemaDesign($, { language, route, home, store, settings: settingsOverride || store.settings(), languageLinks });
  $('img').each((_index, element) => {
    const image = $(element);
    const url = image.attr('src');
    const row = store.db.prepare('SELECT id,width,height FROM media WHERE url=? UNION SELECT media_id AS id,width,height FROM media_derivatives WHERE url=?').get(url || '', url || '');
    if (row?.width && row?.height) image.attr({ width: row.width, height: row.height });
    image.attr('decoding', 'async');
    if (!row || image.parent().is('picture')) return;
    const derivatives = store.db.prepare('SELECT * FROM media_derivatives WHERE media_id=? AND mime IN (?,?) ORDER BY width').all(row.id, 'image/avif', 'image/webp');
    if (!derivatives.length) return;
    const sources = ['image/avif', 'image/webp'].map((mime) => {
      const entries = derivatives.filter((entry) => entry.mime === mime && entry.width);
      return entries.length ? `<source type="${mime}" srcset="${entries.map((entry) => `${escapeHtml(entry.url)} ${entry.width}w`).join(', ')}" sizes="(max-width: 600px) 100vw, 80vw" />` : '';
    }).join('');
    image.wrap('<picture></picture>').before(sources);
  });
  $('video[data-project-preview]').attr('preload', 'none');
  $('.podcast-art').removeAttr('aria-label');
  $('.brandmark img').attr({ width: 72, height: 72, fetchpriority: 'high', loading: 'eager' });
  if ($('.brandmark img').length) $('head').append('<link rel="preload" as="image" href="/assets/anchevlogo.png" fetchpriority="high" />');
  if (preview) {
    $('html').attr('data-settings-preview', String(preview.version));
    $('#consent-banner, #consent-preferences').attr('hidden', '');
    $('#inquiry-form [type="submit"]').attr('disabled', '');
    $('a[href]').each((_index, element) => {
      const link = $(element);
      const href = link.attr('href');
      if (!preview.version || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/') || /\.[a-z0-9]+(?:$|[?#])/i.test(href)) return;
      const target = new URL(href, 'https://preview.invalid');
      link.attr('href', `/api/admin/settings/preview.html?version=${preview.version}&path=${encodeURIComponent(target.pathname)}${target.hash}`);
    });
  }
  return $.html();
};