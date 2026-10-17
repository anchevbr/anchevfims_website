import { load } from 'cheerio';
import { escapeHtml, renderProjectBrowserMarkup, renderContactPageMarkup, renderInquiryForm, renderArticlesMarkup, renderPodcastEpisodesMarkup } from '../public/scripts/modules/content-markup.js';
import { servicePages, getServicePath } from '../public/scripts/modules/service-pages.js';
import { aboutPageContent } from '../public/scripts/content.js';

const arrow = '<span aria-hidden="true">&nearr;</span>';
export const renderServiceIndex = (language = 'en', primary = true) => `<ol class="cinema-service-list">${servicePages.filter((service) => service.primary === primary).map((service, index) => `<li><a href="${getServicePath(service, language)}"><span class="cinema-service-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(service[language].title)}</h3><p>${escapeHtml(service[language].summary || service[language].sections[0][0])}</p></div>${arrow}</a></li>`).join('')}</ol>`;

export const getCinemaPageSeo = ({ route, language, origin, store, settings, podcast, articles, pageOverride }) => {
  const key = route.match(/^\/(?:el\/)?(work|services|about|contact|press|podcast)$/)?.[1];
  if (!key) return null;
  const greek = language === 'el';
  const prefix = greek ? '/el' : '';
  const projects = store.projects({ publicOnly: true, locale: language });
  const page = pageOverride || store.page(key, language, true) || (key === 'about' ? aboutPageContent[language] : null);
  const titles = {
    work: ['Selected work.', 'Επιλεγμένες ταινίες.'], services: ['What we make.', 'Οι ταινίες που κάνουμε.'],
    about: ['Anchev Films.', 'Anchev Films.'], contact: ["Let's talk about the film.", 'Ας μιλήσουμε για την ταινία σας.'],
    press: ['In the press.', 'Στον Τύπο.'], podcast: ['Σπόιλερ - αλέρτ.', 'Σπόιλερ - αλέρτ.']
  };
  const descriptions = {
    work: ['Films, selected frames, and the thinking behind the production. Explore the work of Anchev Films, Athens.', 'Ταινίες, επιλεγμένες εικόνες και η προσέγγιση πίσω από κάθε παραγωγή της Anchev Films στην Αθήνα.'],
    services: ['Commercial films, branded stories, fiction, documentary and music videos. One connected production process, with post-production built in.', 'Διαφημιστικά, ταινίες για brands, μυθοπλασία, ντοκιμαντέρ και μουσικά βίντεο. Μια ενιαία διαδικασία, από την ανάπτυξη έως το post-production.'],
    about: ['An independent film and audiovisual production company based in Athens, working with brands, agencies and collaborators in Greece and internationally.', 'Ανεξάρτητη εταιρεία κινηματογραφικής και οπτικοακουστικής παραγωγής με βάση την Αθήνα και συνεργασίες στην Ελλάδα και διεθνώς.'],
    contact: ['Discuss a film, campaign, studio shoot or production in Greece with Anchev Films. Send your brief to our Athens production office.', 'Συζητήστε μια ταινία, καμπάνια ή γύρισμα στο στούντιο με την Anchev Films. Στείλτε το αίτημά σας στην ομάδα παραγωγής μας στην Αθήνα.'],
    press: ['Published coverage, interviews and stories connected to Anchev Films and our productions.', 'Δημοσιεύματα, συνεντεύξεις και ιστορίες που συνδέονται με την Anchev Films και τις παραγωγές μας.'],
    podcast: ['Σπόιλερ - αλέρτ: conversations about cinema from Anchev Films. Listen to the latest episodes.', 'Σπόιλερ - αλέρτ: συζητήσεις για τον κινηματογράφο από την Anchev Films. Ακούστε τα τελευταία επεισόδια.']
  };
  const heading = page?.heading || titles[key][greek ? 1 : 0];
  const description = page?.seo?.description || page?.intro || descriptions[key][greek ? 1 : 0];
  const cover = page?.blocks?.find((block) => block.type === 'image');
  const heroImage = cover?.url || projects[0]?.behindFrame || '/media/studio/studio-frame-02.jpg';
  const documentHeading = `<header class="cinema-page-heading"><p class="section-kicker">Anchev Films / ${greek ? 'Αθήνα & διεθνώς' : 'Athens & worldwide'}</p><h1${key === 'podcast' ? ' lang="el"' : ''}>${escapeHtml(heading)}</h1><p${key === 'about' ? ' class="cinema-about-intro"' : ''}>${escapeHtml(page?.intro || descriptions[key][greek ? 1 : 0])}</p></header>`;
  const blocks = (page?.blocks || []).filter((block) => block !== cover).map((block, index) => block.type === 'image' ? `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy" />${block.text ? `<figcaption>${escapeHtml(block.text)}</figcaption>` : ''}</figure>` : block.type === 'video' ? `<video src="${escapeHtml(block.url)}" controls playsinline preload="none" aria-label="${escapeHtml(block.title || heading)}"></video>` : block.type === 'link' ? `<p><a class="text-link" href="${escapeHtml(block.url)}">${escapeHtml(block.title || block.url)} ${arrow}</a></p>` : `<section><span>${String(index + 1).padStart(2, '0')}</span><div><h2>${escapeHtml(block.title)}</h2><p>${escapeHtml(block.text).replace(/\n/g, '<br />')}</p></div></section>`).join('');
  let body;
  if (key === 'work') {
    const categories = [...new Set(projects.map((project) => project.category).filter(Boolean))];
    body = `${documentHeading}<div class="cinema-overview-content"><div class="work-filters"><label for="work-search">${greek ? 'Αναζήτηση' : 'Search'}<input id="work-search" type="search" /></label><label for="work-category">${greek ? 'Κατηγορία' : 'Category'}<select id="work-category"><option value="">${greek ? 'Όλες οι παραγωγές' : 'All work'}</option>${categories.map((category) => `<option>${escapeHtml(category)}</option>`).join('')}</select></label><p id="work-filter-status" role="status" aria-live="polite"></p></div><div id="work-browser" class="work-browser">${renderProjectBrowserMarkup(projects)}</div><p id="work-no-results" hidden>${greek ? 'Δεν βρέθηκαν παραγωγές.' : 'No productions match your search.'}</p></div>`;
  } else if (key === 'services') body = `${documentHeading}<div class="cinema-overview-content">${renderServiceIndex(language)}<a class="text-link" href="${prefix}/contact">${greek ? 'Στείλτε το brief' : 'Send a brief'} ${arrow}</a><section class="cinema-support"><h2>${greek ? 'Υποστήριξη για την παραγωγή σας.' : 'More production support.'}</h2><p>${greek ? 'Τοπική οργάνωση, εταιρική επικοινωνία, εκδηλώσεις και φωτογραφία, με βάση τις ανάγκες του έργου.' : 'Local production, company communications, events and photography, scoped around the project.'}</p>${renderServiceIndex(language, false)}</section><a class="text-link" href="${prefix}/studio">${greek ? 'Γνωρίστε το Anchev Studio' : 'Explore Anchev Studio'} ${arrow}</a></div>`;
  else if (key === 'contact') {
    const markup = load(renderContactPageMarkup({ ...settings.contact, social: settings.social }, language, page));
    markup('.contact-final__title')[0].name = 'h1';
    body = `<section class="contact-page" id="contact-page"><div class="experience-wrap" id="contact-page-content">${markup('body').html()}</div></section>`;
  } else if (key === 'about') {
    body = `<section class="cinema-about-hero"><img src="${escapeHtml(heroImage)}" alt="${escapeHtml(cover?.alt || (projects[0]?.behindFrame ? (greek ? 'Πίσω από τις κάμερες της Anchev Films' : 'Behind the scenes with Anchev Films') : (greek ? 'Στο Anchev Studio' : 'Inside Anchev Studio')))}" fetchpriority="high" />${documentHeading}</section><div class="cinema-about-story">${page.body ? `<p class="cinema-about-lead">${escapeHtml(page.body).replace(/\n/g, '<br />')}</p>` : ''}${blocks}<nav class="cinema-about-links"><a class="text-link" href="${prefix}/work">${greek ? 'Οι ταινίες μας' : 'Our films'} ${arrow}</a><a class="text-link" href="${prefix}/studio">Anchev Studio ${arrow}</a><a class="text-link" href="${prefix}/contact">${greek ? 'Στείλτε το brief' : 'Send a brief'} ${arrow}</a></nav></div>`;
  } else if (key === 'press') body = `${documentHeading}<div class="cinema-overview-content articles-page"><div id="articles-list" class="articles-list">${renderArticlesMarkup(articles, language)}</div></div>`;
  else body = `${documentHeading}<div class="cinema-overview-content podcast-page"><div id="podcast-episodes-list">${podcast ? renderPodcastEpisodesMarkup(podcast, language) : `<p>${greek ? 'Ακούστε τα επεισόδια στο Spotify.' : 'Listen to the episodes on Spotify.'}</p><a href="https://open.spotify.com/show/2f9bhw76eO5EWttGU6IVuV">Spotify ${arrow}</a>`}</div></div>`;
  const canonical = `${origin}${route}`;
  const image = new URL(page?.seo?.image || heroImage, origin).href;
  const pageTitle = key === 'about' ? greek ? 'Η εταιρεία | Anchev Films' : 'About | Anchev Films' : key === 'podcast' ? greek ? 'Σπόιλερ - αλέρτ | Podcast της Anchev Films' : 'Cinema Podcast | Anchev Films' : `${heading.replace(/\.$/, '')} | Anchev Films`;
  return { status: 200, title: page?.seo?.title || pageTitle, description, canonical, image, imageAlt: heading, ogType: 'website', language,
    robots: page?.seo?.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large',
    alternates: page?.seo?.noindex || store.page(key, greek ? 'en' : 'el', true)?.seo?.noindex ? [] : ['en', 'el', 'x-default'].map((locale) => ({ language: locale, url: `${origin}${locale === 'el' ? '/el' : ''}/${key}` })),
    schema: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Anchev Films', url: origin, email: settings.contact?.email, telephone: settings.contact?.phone },
      { '@type': key === 'about' ? 'AboutPage' : key === 'contact' ? 'ContactPage' : 'CollectionPage', name: heading, description, url: canonical, inLanguage: language, about: { '@id': `${origin}/#organization` },
        ...(key === 'work' ? { mainEntity: { '@type': 'ItemList', itemListElement: projects.map((project, index) => ({ '@type': 'ListItem', position: index + 1, name: project.name, url: `${origin}${project.hasGreek && greek ? '/el' : ''}/work/${project.id}` })) } } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Anchev Films', item: `${origin}${prefix}/` }, { '@type': 'ListItem', position: 2, name: heading, item: canonical }] }
    ] }, renderData: { cinemaPage: `<main class="cinema-overview cinema-overview--${key}" id="main-content">${body}</main>`, language }
  };
};

export const applyCinemaDesign = ($, { language, route, home, store, settings, languageLinks }) => {
  const greek = language === 'el';
  const prefix = greek ? '/el' : '';
  const navigation = [['/work', greek ? 'Ταινίες' : 'Work'], ['/studio', greek ? 'Στούντιο' : 'Studio'], ['/about', greek ? 'Εταιρεία' : 'About'], ['/news', greek ? 'Ιστορίες' : 'Journal'], ['/contact', greek ? 'Επικοινωνία' : 'Contact']];
  const links = navigation.map(([path, title]) => `<a href="${prefix}${path}" ${route === `${prefix}${path}` ? 'aria-current="page"' : route.startsWith(`${prefix}${path}/`) ? 'aria-current="location"' : ''}>${title}</a>`).join('');
  $('body').addClass(`cinema-site${home ? ' cinema-home' : ''}`);
  $('head').append('<link rel="stylesheet" href="/styles/cinema.css?v=20261015-brand" />');
  if (greek) $('link[rel="preload"][as="font"]').each((_index, element) => $(element).attr('href', $(element).attr('href').replace('-latin-', '-greek-')));
  $('.topbar, #menu-overlay, .language-switch, .project-footer').remove();
  const header = `<header class="cinema-header"><a class="brandmark" href="${prefix}/" aria-label="Anchev Films ${greek ? 'αρχική' : 'home'}"><img src="/assets/anchevlogo.png" alt="Anchev Films" width="72" height="72" /></a><nav class="cinema-nav" aria-label="${greek ? 'Κύρια πλοήγηση' : 'Primary'}">${links}</nav><div class="cinema-header__actions">${languageLinks}<details class="cinema-menu" id="cinema-menu"><summary aria-label="${greek ? 'Μενού' : 'Menu'}" title="${greek ? 'Μενού' : 'Menu'}" aria-controls="cinema-menu-sheet"><span class="cinema-menu-icon" aria-hidden="true"></span></summary><div class="cinema-menu__sheet" id="cinema-menu-sheet" role="dialog" aria-modal="true" aria-label="${greek ? 'Μενού πλοήγησης' : 'Menu navigation'}"><button class="cinema-menu__close" type="button" data-cinema-menu-close aria-label="${greek ? 'Κλείσιμο μενού' : 'Close menu'}" title="${greek ? 'Κλείσιμο μενού' : 'Close menu'}"><span aria-hidden="true">&times;</span></button><nav aria-label="${greek ? 'Μενού πλοήγησης' : 'Menu navigation'}">${links}</nav><div class="cinema-menu__secondary"><a href="${prefix}/services">${greek ? 'Υπηρεσίες' : 'Capabilities'}</a><a href="${prefix}/press">${greek ? 'Τύπος' : 'Press'}</a><a href="${prefix}/podcast">Podcast</a>${settings.contact?.email ? `<a href="mailto:${escapeHtml(settings.contact.email)}">${escapeHtml(settings.contact.email)}</a>` : ''}<span>${greek ? 'Αθήνα, Ελλάδα' : 'Athens, Greece'}</span></div></div></details></div></header>`;
  $('.public-skip-link').after(header);
  $('#reel-player').attr('role', 'dialog').attr('aria-modal', 'true');
  $('.hero-copy [data-showreel-duration]').text('');
  const cookies = store.page('cookies', language, true) ? `${prefix}/pages/cookies` : `${prefix}/#panel-cookies`;
  const terms = store.page('terms', language, true) ? `${prefix}/pages/terms` : `${prefix}/#panel-terms`;
  const footer = `<footer class="cinema-footer"><div class="cinema-footer__top"><p>${greek ? 'Ας μιλήσουμε για την ταινία σας.' : 'Let\'s talk about the film.'}</p><a class="text-link" href="${prefix}/contact">${greek ? 'Στείλτε το brief' : 'Send a brief'} ${arrow}</a></div><div class="cinema-footer__identity"><a href="${prefix}/" aria-label="Anchev Films ${greek ? 'αρχική' : 'home'}"><img src="/assets/anchevlogo.png" alt="Anchev Films" width="96" height="96" loading="lazy" /></a><p>${greek ? 'Παραγωγή ταινιών.<br>Αθήνα, Ελλάδα.' : 'Film production.<br>Athens, Greece.'}</p></div><div class="cinema-footer__bottom"><span>&copy; ${new Date().getFullYear()} Anchev Films</span><nav aria-label="${greek ? 'Περισσότερα' : 'More'}"><a href="${prefix}/services">${greek ? 'Υπηρεσίες' : 'Capabilities'}</a><a href="${prefix}/news">${greek ? 'Ιστορίες' : 'Journal'}</a><a href="${prefix}/press">${greek ? 'Τύπος' : 'Press'}</a><a href="${prefix}/podcast">Podcast</a></nav><nav class="legal-links" aria-label="${greek ? 'Νομικά' : 'Legal'}"><a class="legal-link" href="${prefix}/privacy">${greek ? 'Απόρρητο' : 'Privacy'}</a><a class="legal-link" href="${cookies}" ${home && cookies.includes('#panel-') ? 'data-open-panel="cookies"' : ''}>Cookies</a><button class="legal-link" type="button" data-cookie-settings>${greek ? 'Ρυθμίσεις cookies' : 'Cookie settings'}</button><a class="legal-link" href="${terms}" ${home && terms.includes('#panel-') ? 'data-open-panel="terms"' : ''}>${greek ? 'Όροι' : 'Terms'}</a></nav></div></footer>`;
  $('.site-footer').remove();
  if (home) {
    const projects = store.projects({ publicOnly: true, locale: language });
    const lead = projects.find((project) => project.featured) || projects[0];
    const productionImage = lead?.frames?.[0] || '/media/studio/studio-frame-02.jpg';
    const hero = $('.hero');
    if (hero[0]) hero[0].name = 'div';
    $('.hero-copy').removeAttr('data-animate');
    $('.hero-production-meta').remove();
    $('.scroll-hint').remove();
    $('.site-shell').append(`<div class="cinema-hero-caption"><span>${greek ? 'Αθήνα, Ελλάδα' : 'Athens, Greece'}</span><a href="${prefix}/work">${greek ? 'Επιλεγμένες ταινίες' : 'Selected films'} ${arrow}</a></div>`);
    $('.hero-copy').append(`<a class="cinema-hero-work text-link" href="${prefix}/work">${greek ? 'Εξερευνήστε τις παραγωγές' : 'Explore the work'} ${arrow}</a>`);
    $('.tagline-story').addClass('cinema-process');
    $('.tagline-story-media').html(`<img class="tagline-story-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-near-src="${escapeHtml(productionImage)}" alt="" loading="lazy" /><noscript><img class="tagline-story-image" src="${escapeHtml(productionImage)}" alt="" loading="lazy" /></noscript>`);
    $('.tagline-story-ui').html(`<p class="section-kicker">${greek ? 'Η διαδικασία' : 'The process'}</p><p class="cinema-process__statement">${greek ? 'Από τη συζήτηση στην τελική κόπια.' : 'From the conversation to the final master.'}</p>`);
    $('.story-scene').removeAttr('aria-hidden').addClass('is-active');
    $('.story-progress, .tagline-story-shade').remove();
    $('#work-page .experience-heading').append(`<a class="text-link" href="${prefix}/work">${greek ? 'Όλες οι παραγωγές' : 'All work'} ${arrow}</a>`);
    $('.studio-feature__video').attr('poster', '/media/experience/studio-poster.jpg');
    $('.studio-feature__video source').each((_index, element) => $(element).attr('data-src', $(element).attr('media') ? '/media/experience/studio-mobile.mp4' : '/media/experience/studio-web.mp4'));
    if (!settings.homepage?.[language]?.studioFooter) $('.studio-feature__footer > span:first-child').text(greek ? 'Γνωρίστε το Anchev Studio' : 'Explore Anchev Studio');
    $('.services-composition').replaceWith(renderServiceIndex(language));
    $('.services-ledger-meta, .service-directory').remove();
    $('#services-page .services-sticky').append(`<a class="text-link" href="${prefix}/services">${greek ? 'Όλες οι υπηρεσίες παραγωγής' : 'All production capabilities'} ${arrow}</a>`);
    $('.clients-stage-meta, .clients-spotlight, .clients-progress').remove();
    $('.client-mark').each((_index, element) => { const mark = $(element); mark.replaceWith(`<span class="client-mark">${escapeHtml(mark.text().replace(/^\s*\d+\s*/, '').trim())}</span>`); });
    $('#about-page-content').html(`<div class="cinema-about"><div><p class="section-kicker">${greek ? 'Η Anchev Films' : 'About Anchev Films'}</p><h2>${escapeHtml(store.page('about', language, true)?.heading || (greek ? 'Από μια σαφή ιδέα σε μια ολοκληρωμένη ταινία.' : 'From a clear idea to a finished film.'))}</h2><p>${escapeHtml(store.page('about', language, true)?.intro || aboutPageContent[language].intro)}</p><a class="text-link" href="${prefix}/about">${greek ? 'Γνωρίστε την Anchev Films' : 'About the company'} ${arrow}</a></div><figure><img src="${escapeHtml(lead?.behindFrame || productionImage)}" alt="${escapeHtml(lead ? `${greek ? 'Από την παραγωγή' : 'From the production'}: ${lead.name}` : 'Inside Anchev Studio')}" loading="lazy" /><figcaption>${escapeHtml(lead?.name || 'Anchev Studio')}</figcaption></figure></div>`);
    if (!$('#clients-page .client-mark').length) $('#clients-page').remove();
    if (!$('#articles-page .article-row').length) $('#articles-page').remove();
    if (!$('#podcast-page .podcast-episode').length) $('#podcast-page').remove();
    const primary = $('<main class="cinema-main" id="main-content"></main>');
    const sections = $('body > section').filter((_index, element) => ['home', 'story-page', 'work-page', 'services-page', 'clients-page', 'podcast-page', 'articles-page', 'about-page', 'contact-page'].includes($(element).attr('id')) || $(element).hasClass('studio-feature'));
    sections.first().before(primary);
    for (const selector of ['#home', '#work-page', '#about-page', '#services-page', '.studio-feature', '#story-page', '#clients-page', '#articles-page', '#podcast-page', '#contact-page']) primary.append(sections.filter(selector));
    primary.after(footer);
    $('.public-skip-link').attr('href', '#main-content');
    const news = store.news({ locale: language }).slice(0, 2);
    if (news.length) primary.find('#articles-page, #podcast-page, #contact-page').first().before(`<section class="cinema-news-note"><p class="section-kicker">${greek ? 'Ιστορίες από την παραγωγή' : 'From the journal'}</p>${news.map((article) => `<a href="${prefix}/news/${article.id.slice(5)}">${escapeHtml(article.heading)} ${arrow}</a>`).join('')}<a class="text-link" href="${prefix}/news">${greek ? 'Όλες οι ιστορίες' : 'Read the journal'} ${arrow}</a></section>`);
  } else {
    $('#project-page-root').after(footer);
    $('.case-study__header').addClass('cinema-case-header');
    if ($('#main-content').length) $('.public-skip-link').attr('href', '#main-content');
  }
  if ($('.studio-page').length) {
    $('.studio-page a[href$="#contact-page"]').attr('href', '#studio-enquiry');
    $('.studio-page .case-study__content').append(`<section class="studio-enquiry" id="studio-enquiry"><h2>${greek ? 'Το επόμενο γύρισμά σας.' : 'Your next studio shoot.'}</h2>${renderInquiryForm(language, { studio: true })}</section>`);
  }
  $('.case-study__frames img').each((_index, element) => {
    const image = $(element);
    if (!image.parent().is('a')) image.wrap(`<a class="cinema-gallery-link" href="${escapeHtml(image.attr('src'))}" data-gallery-image></a>`);
  });
  $('[data-film-cursor]').removeAttr('data-film-cursor data-cursor-label data-cursor-kind');
};