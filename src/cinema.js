import { load } from 'cheerio';
import { escapeHtml, renderProjectBrowserMarkup, renderContactPageMarkup, renderInquiryForm, renderArticlesMarkup, renderPodcastEpisodesMarkup } from '../public/scripts/modules/content-markup.js';
import { servicePages, getServicePath } from '../public/scripts/modules/service-pages.js';

const arrow = '<span aria-hidden="true">&nearr;</span>';
export const renderServiceIndex = (language = 'en') => `<ol class="cinema-service-list">${servicePages.filter((service) => !service.legacy).map((service, index) => `<li><a href="${getServicePath(service, language)}"><span class="cinema-service-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(service[language].title)}</h3><p>${escapeHtml(service[language].summary || service[language].sections[0][0])}</p></div>${arrow}</a></li>`).join('')}</ol>`;

export const getCinemaPageSeo = ({ route, language, origin, store, settings, podcast, articles, pageOverride }) => {
  const key = route.match(/^\/(?:el\/)?(work|services|about|contact|press|podcast)$/)?.[1];
  if (!key) return null;
  const greek = language === 'el';
  const prefix = greek ? '/el' : '';
  const projects = store.projects({ publicOnly: true, locale: language });
  const page = pageOverride || store.page(key, language, true);
  const titles = {
    work: ['Selected work.', 'Επιλεγμένες παραγωγές.'], services: ['From the first idea. To the final frame.', 'Από την πρώτη ιδέα. Στην τελική εικόνα.'],
    about: ['Anchev Films.', 'Anchev Films.'], contact: ["Let's make it.", 'Ας δώσουμε εικόνα στην ιδέα σας.'],
    press: ['In the press.', 'Στον Τύπο.'], podcast: ['Σπόιλερ - αλέρτ.', 'Σπόιλερ - αλέρτ.']
  };
  const descriptions = {
    work: ['Films, selected frames, and the thinking behind the production. Explore the work of Anchev Films, Athens.', 'Ταινίες, επιλεγμένες εικόνες και η προσέγγιση πίσω από κάθε παραγωγή της Anchev Films στην Αθήνα.'],
    services: ['Commercials, brand stories, corporate films, documentaries, events, post-production and photography. One Athens production partner, from brief to delivery.', 'Διαφημιστικά, εταιρικές ταινίες, ντοκιμαντέρ, εκδηλώσεις, post-production και φωτογραφία. Ολοκληρωμένη παραγωγή από την Anchev Films στην Αθήνα.'],
    about: ['An independent film and audiovisual production company based in Athens, working with brands, agencies and collaborators in Greece and internationally.', 'Ανεξάρτητη εταιρεία κινηματογραφικής και οπτικοακουστικής παραγωγής με βάση την Αθήνα και συνεργασίες στην Ελλάδα και διεθνώς.'],
    contact: ['Discuss a film, campaign, studio shoot or production in Greece with Anchev Films. Send your brief to our Athens production office.', 'Συζητήστε μια ταινία, καμπάνια ή γύρισμα στο στούντιο με την Anchev Films. Στείλτε το αίτημά σας στην ομάδα παραγωγής μας στην Αθήνα.'],
    press: ['Published coverage, interviews and stories connected to Anchev Films and our productions.', 'Δημοσιεύματα, συνεντεύξεις και ιστορίες που συνδέονται με την Anchev Films και τις παραγωγές μας.'],
    podcast: ['Σπόιλερ - αλέρτ: conversations about cinema from Anchev Films. Listen to the latest episodes.', 'Σπόιλερ - αλέρτ: συζητήσεις για τον κινηματογράφο από την Anchev Films. Ακούστε τα τελευταία επεισόδια.']
  };
  const heading = page?.heading || titles[key][greek ? 1 : 0];
  const description = page?.seo?.description || page?.intro || descriptions[key][greek ? 1 : 0];
  const cover = page?.blocks?.find((block) => block.type === 'image');
  const heroImage = cover?.url || projects[0]?.behindFrame || '/media/studio/studio-frame-02.jpg';
  const documentHeading = `<header class="cinema-page-heading"><p class="section-kicker">Anchev Films / ${greek ? 'Αθήνα & διεθνώς' : 'Athens & worldwide'}</p><h1${key === 'podcast' ? ' lang="el"' : ''}>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p></header>`;
  const blocks = (page?.blocks || []).filter((block) => block !== cover).map((block, index) => block.type === 'image' ? `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy" />${block.text ? `<figcaption>${escapeHtml(block.text)}</figcaption>` : ''}</figure>` : block.type === 'video' ? `<video src="${escapeHtml(block.url)}" controls playsinline preload="none" aria-label="${escapeHtml(block.title || heading)}"></video>` : block.type === 'link' ? `<p><a class="text-link" href="${escapeHtml(block.url)}">${escapeHtml(block.title || block.url)} ${arrow}</a></p>` : `<section><span>${String(index + 1).padStart(2, '0')}</span><div><h2>${escapeHtml(block.title)}</h2><p>${escapeHtml(block.text).replace(/\n/g, '<br />')}</p></div></section>`).join('');
  let body;
  if (key === 'work') {
    const categories = [...new Set(projects.map((project) => project.category).filter(Boolean))];
    body = `${documentHeading}<div class="cinema-overview-content"><div class="work-filters"><label for="work-search">${greek ? 'Αναζήτηση' : 'Search'}<input id="work-search" type="search" /></label><label for="work-category">${greek ? 'Κατηγορία' : 'Category'}<select id="work-category"><option value="">${greek ? 'Όλες οι παραγωγές' : 'All work'}</option>${categories.map((category) => `<option>${escapeHtml(category)}</option>`).join('')}</select></label><p id="work-filter-status" role="status" aria-live="polite"></p></div><div id="work-browser" class="work-browser">${renderProjectBrowserMarkup(projects)}</div><p id="work-no-results" hidden>${greek ? 'Δεν βρέθηκαν παραγωγές.' : 'No productions match your search.'}</p></div>`;
  } else if (key === 'services') body = `${documentHeading}<div class="cinema-overview-content">${renderServiceIndex(language)}<a class="text-link" href="${prefix}/studio">${greek ? 'Γνωρίστε το Anchev Studio' : 'Explore Anchev Studio'} ${arrow}</a></div>`;
  else if (key === 'contact') {
    const markup = load(renderContactPageMarkup({ ...settings.contact, social: settings.social }, language, page));
    markup('.contact-final__title')[0].name = 'h1';
    body = `<section class="contact-page" id="contact-page"><div class="experience-wrap" id="contact-page-content">${markup('body').html()}</div></section>`;
  } else if (key === 'about') {
    const story = greek ? [
      ['Ιδέες με κατεύθυνση.', 'Ξεκινάμε με τον στόχο, το κοινό και μια δημιουργική ματιά. Η ιδέα, το σενάριο και το πλάνο δίνουν κοινή κατεύθυνση στην παραγωγή.'],
      ['Η παραγωγή δίνει ρυθμό.', 'Συνεργείο, τοποθεσίες, προϋπολογισμός και χρονοδιάγραμμα οργανώνονται γύρω από το έργο. Κρατάμε κοντά τη δημιουργική πρόθεση με την εκτέλεση.'],
      ['Μέχρι το τελικό κάδρο.', 'Μοντάζ, χρώμα, ήχος και τελικές εκδόσεις διαμορφώνουν μια ταινία έτοιμη για τα κοινά και τα κανάλια της.']
    ] : [
      ['Ideas with intent.', 'We begin with a clear brief, an audience and a point of view. Concepts, treatments and production planning give everyone a shared direction.'],
      ['A production that holds together.', 'Crew, locations, budgets and schedules are organised around the work. We keep the distance between creative intent and practical execution short.'],
      ['Through to the final frame.', 'Editing, colour, sound and considered delivery turn the material into a film. We plan for its life across audiences, platforms and markets.']
    ];
    body = `<section class="cinema-about-hero"><img src="${escapeHtml(heroImage)}" alt="${escapeHtml(cover?.alt || (greek ? 'Παραγωγή της Anchev Films' : 'Anchev Films production'))}" fetchpriority="high" />${documentHeading}</section><div class="cinema-about-story">${page ? `<p class="cinema-about-intro">${escapeHtml(page.intro)}</p><p>${escapeHtml(page.body).replace(/\n/g, '<br />')}</p>${blocks}` : `<p class="cinema-about-intro">${escapeHtml(description)}</p><blockquote>${greek ? 'Ο στόχος είναι απλός: η δουλειά να έχει ουσία.' : 'The standard is simple: make the work matter.'}<cite>Boris Anchev, ${greek ? 'Ιδρυτής' : 'Founder'}</cite></blockquote>${story.map(([title, text], index) => `<section><span>0${index + 1}</span><div><h2>${title}</h2><p>${text}</p></div></section>`).join('')}`}<nav class="cinema-about-links"><a class="text-link" href="${prefix}/work">${greek ? 'Οι παραγωγές μας' : 'Our work'} ${arrow}</a><a class="text-link" href="${prefix}/news">${greek ? 'Νέα της εταιρείας' : 'Company news'} ${arrow}</a></nav></div>`;
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
  const navigation = [['/', greek ? 'Αρχική' : 'Home'], ['/work', greek ? 'Παραγωγές' : 'Work'], ['/services', greek ? 'Υπηρεσίες' : 'Services'], ['/studio', greek ? 'Στούντιο' : 'Studio'], ['/about', greek ? 'Εταιρεία' : 'About'], ['/contact', greek ? 'Επικοινωνία' : 'Contact']];
  const links = navigation.map(([path, title]) => `<a href="${prefix}${path}" ${route === `${prefix}${path}` ? 'aria-current="page"' : ''}>${title}</a>`).join('');
  $('body').addClass(`cinema-site${home ? ' cinema-home' : ''}`);
  $('head').append('<link rel="stylesheet" href="/styles/cinema.css?v=20261015-redesign" />');
  $('.topbar, #menu-overlay, .language-switch, .project-footer').remove();
  const header = `<header class="cinema-header"><a class="brandmark" href="${prefix}/" aria-label="Anchev Films ${greek ? 'αρχική' : 'home'}"><img src="/assets/anchevlogo.png" alt="Anchev Films" width="64" height="64" /></a><nav class="cinema-nav" aria-label="${greek ? 'Κύρια πλοήγηση' : 'Primary'}">${links}</nav><div class="cinema-header__actions">${languageLinks}<details class="cinema-menu" id="cinema-menu"><summary aria-label="${greek ? 'Μενού' : 'Menu'}"><span class="cinema-menu-icon" aria-hidden="true"></span></summary><div class="cinema-menu__sheet"><nav aria-label="${greek ? 'Μενού πλοήγησης' : 'Menu navigation'}">${links}</nav><div class="cinema-menu__secondary"><a href="${prefix}/news">${greek ? 'Νέα' : 'News'}</a><a href="${prefix}/press">${greek ? 'Τύπος' : 'Press'}</a><a href="${prefix}/podcast">Podcast</a><span>${greek ? 'Αθήνα, Ελλάδα / Διεθνώς' : 'Athens, Greece / Working worldwide'}</span></div></div></details></div></header>`;
  $('.public-skip-link').after(header);
  $('#reel-player').attr('role', 'dialog').attr('aria-modal', 'true');
  $('.hero-copy [data-showreel-duration]').text('');
  const cookies = store.page('cookies', language, true) ? `${prefix}/pages/cookies` : `${prefix}/#panel-cookies`;
  const terms = store.page('terms', language, true) ? `${prefix}/pages/terms` : `${prefix}/#panel-terms`;
  const footer = `<footer class="cinema-footer"><div class="cinema-footer__top"><p>${greek ? 'Η επόμενη ταινία<br>ξεκινά με μια συζήτηση.' : 'The next film starts<br>with a conversation.'}</p><a class="text-link" href="${prefix}/contact">${greek ? 'Ας μιλήσουμε' : 'Start a conversation'} ${arrow}</a></div><p class="cinema-footer__wordmark">Anchev <em>Films.</em></p><div class="cinema-footer__bottom"><span>&copy; ${new Date().getFullYear()} Anchev Films</span><span>Athens, Greece</span><nav aria-label="${greek ? 'Περισσότερα' : 'More'}"><a href="${prefix}/news">${greek ? 'Νέα' : 'News'}</a><a href="${prefix}/press">${greek ? 'Τύπος' : 'Press'}</a><a href="${prefix}/podcast">Podcast</a></nav><nav class="legal-links" aria-label="${greek ? 'Νομικά' : 'Legal'}"><a class="legal-link" href="${prefix}/privacy">${greek ? 'Απόρρητο' : 'Privacy'}</a><a class="legal-link" href="${cookies}" ${home && cookies.includes('#panel-') ? 'data-open-panel="cookies"' : ''}>Cookies</a><button class="legal-link" type="button" data-cookie-settings>${greek ? 'Ρυθμίσεις cookies' : 'Cookie settings'}</button><a class="legal-link" href="${terms}" ${home && terms.includes('#panel-') ? 'data-open-panel="terms"' : ''}>${greek ? 'Όροι' : 'Terms'}</a></nav></div></footer>`;
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
    $('.site-shell').append(`<div class="cinema-hero-caption"><span>${greek ? 'Ανεξάρτητη παραγωγή / Αθήνα & διεθνώς' : 'Independent production / Athens & worldwide'}</span>${lead ? `<a href="${lead.hasGreek && greek ? '/el' : ''}/work/${lead.id}">${greek ? 'Στην οθόνη' : 'On screen'} / ${escapeHtml(lead.name)} ${arrow}</a>` : `<a href="${prefix}/work">${greek ? 'Οι παραγωγές μας' : 'Explore our work'} ${arrow}</a>`}</div>`);
    $('.hero-copy').append(`<a class="cinema-hero-work text-link" href="${prefix}/work">${greek ? 'Εξερευνήστε τις παραγωγές' : 'Explore the work'} ${arrow}</a>`);
    $('.tagline-story').addClass('cinema-process');
    $('.tagline-story-media').html(`<img class="tagline-story-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-near-src="${escapeHtml(productionImage)}" alt="" loading="lazy" /><noscript><img class="tagline-story-image" src="${escapeHtml(productionImage)}" alt="" loading="lazy" /></noscript>`);
    $('.tagline-story-ui').html(`<p class="section-kicker">${greek ? 'Η προσέγγισή μας' : 'Our approach'}</p><p class="cinema-process__statement">${greek ? 'Μια ιδέα.<br>Όλες οι δυνατότητες.' : 'One idea.<br>Every possibility.'}</p>`);
    $('.story-scene').removeAttr('aria-hidden').addClass('is-active');
    $('.story-progress, .tagline-story-shade').remove();
    $('#work-page .experience-heading').append(`<a class="text-link" href="${prefix}/work">${greek ? 'Όλες οι παραγωγές' : 'All work'} ${arrow}</a>`);
    $('.studio-feature__video').attr('poster', '/media/experience/studio-poster.jpg');
    $('.studio-feature__video source').each((_index, element) => $(element).attr('data-src', $(element).attr('media') ? '/media/experience/studio-mobile.mp4' : '/media/experience/studio-web.mp4'));
    if (!settings.homepage?.[language]?.studioFooter) $('.studio-feature__footer > span:first-child').text(greek ? 'Γνωρίστε το Anchev Studio' : 'Explore Anchev Studio');
    $('.services-composition').replaceWith(renderServiceIndex(language));
    $('.services-ledger-meta, .service-directory').remove();
    $('.clients-stage-meta, .clients-spotlight, .clients-progress').remove();
    $('.client-mark').each((_index, element) => { const mark = $(element); mark.replaceWith(`<span class="client-mark">${escapeHtml(mark.text().replace(/^\s*\d+\s*/, '').trim())}</span>`); });
    $('#about-page-content').html(`<div class="cinema-about"><div><p class="section-kicker">${greek ? 'Η Anchev Films' : 'About Anchev Films'}</p><h2>${escapeHtml(store.page('about', language, true)?.heading || (greek ? 'Δημιουργική ματιά. Ολοκληρωμένη παραγωγή.' : 'A point of view. And a way through.'))}</h2><p>${escapeHtml(store.page('about', language, true)?.intro || (greek ? 'Ανεξάρτητη εταιρεία κινηματογραφικής παραγωγής με βάση την Αθήνα. Δημιουργική σκέψη, κινηματογράφηση και οργάνωση, από την πρώτη ιδέα έως την τελική παράδοση.' : 'An independent film production company based in Athens. Creative thinking, considered cinematography, and the practical discipline to carry an idea through to its final frame.'))}</p><a class="text-link" href="${prefix}/about">${greek ? 'Η εταιρεία' : 'Meet Anchev Films'} ${arrow}</a></div><figure><img src="${escapeHtml(lead?.behindFrame || productionImage)}" alt="${greek ? 'Στιγμή από παραγωγή της Anchev Films' : 'A moment from an Anchev Films production'}" loading="lazy" /><figcaption>${greek ? 'Η δουλειά πίσω από την εικόνα.' : 'The work behind the frame.'}</figcaption></figure></div>`);
    const primary = $('<main class="cinema-main" id="main-content"></main>');
    const sections = $('body > section').filter((_index, element) => ['home', 'story-page', 'work-page', 'services-page', 'clients-page', 'podcast-page', 'articles-page', 'about-page', 'contact-page'].includes($(element).attr('id')) || $(element).hasClass('studio-feature'));
    sections.first().before(primary);
    sections.each((_index, element) => primary.append(element));
    primary.after(footer);
    $('.public-skip-link').attr('href', '#main-content');
    const news = store.news({ locale: language }).slice(0, 2);
    if (news.length) $('#about-page').after(`<section class="cinema-news-note"><p class="section-kicker">${greek ? 'Από το ημερολόγιο' : 'From the journal'}</p>${news.map((article) => `<a href="${prefix}/news/${article.id.slice(5)}">${escapeHtml(article.heading)} ${arrow}</a>`).join('')}<a class="text-link" href="${prefix}/news">${greek ? 'Όλα τα νέα' : 'All news'} ${arrow}</a></section>`);
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