import { escapeHtml, renderProjectFilmMarkup } from '../public/scripts/modules/content-markup.js';
import { servicePages, getServicePath } from '../public/scripts/modules/service-pages.js';
import { sanitizeNewsContent } from './security.js';
import { Temporal } from '@js-temporal/polyfill';

export const newsTimeZone = process.env.NEWS_TIMEZONE || 'Europe/Athens';
new Intl.DateTimeFormat('en', { timeZone: newsTimeZone });
export const publicationInstant = (local) => {
  if (!local) return '';
  try { return Temporal.PlainDateTime.from(local).toZonedDateTime(newsTimeZone, { disambiguation: 'reject' }).toInstant().toString(); }
  catch { throw Object.assign(new Error(`Choose a valid, unambiguous publication time in ${newsTimeZone}. Times skipped or repeated by daylight saving cannot be scheduled.`), { status: 400 }); }
};

export const newsCategories = {
  company: ['Company news', 'Εταιρικά νέα'], collaborations: ['New collaborations', 'Συνεργασίες'],
  productions: ['Productions', 'Παραγωγές'], 'behind-the-scenes': ['Behind the scenes', 'Στα παρασκήνια'],
  studio: ['Studio news', 'Νέα του στούντιο'], press: ['Press & recognition', 'Τύπος και διακρίσεις']
};
export const newsPath = (article) => `${article.locale === 'el' ? '/el' : ''}/news/${article.id.slice(5)}`;
const label = (category, language) => newsCategories[category]?.[language === 'el' ? 1 : 0] || newsCategories.company[language === 'el' ? 1 : 0];
const dateLabel = (value, language) => new Intl.DateTimeFormat(language === 'el' ? 'el-GR' : 'en-GB', { dateStyle: 'long', timeZone: newsTimeZone }).format(new Date(value));

export const renderNewsIndex = (articles, language) => {
  const greek = language === 'el';
  const categories = [...new Set(articles.map((article) => article.category))];
  return `<main class="news-index" id="main-content"><header class="cinema-page-heading"><p class="section-kicker">${greek ? 'Από την Anchev Films' : 'From Anchev Films'}</p><h1>${greek ? 'Ιστορίες.' : 'Journal.'}</h1><p>${greek ? 'Σημειώσεις παραγωγής, άνθρωποι και αποφάσεις πίσω από τις ταινίες.' : 'Production notes, people and decisions behind the films.'}</p></header>
  ${categories.length > 1 ? `<div class="news-filters" role="group" aria-label="${greek ? 'Κατηγορία' : 'Category'}"><button type="button" data-news-category="" aria-pressed="true">${greek ? 'Όλα' : 'All updates'}</button>${categories.map((category) => `<button type="button" data-news-category="${category}" aria-pressed="false">${label(category, language)}</button>`).join('')}</div>` : ''}
  <div class="news-list">${articles.length ? articles.map((article) => `<article class="news-preview" data-news-item="${article.category}"><a href="${newsPath(article)}">${article.thumbnail ? `<img src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(article.imageAlt)}" width="1200" height="800" loading="lazy" />` : ''}<div><p class="news-meta"><span>${label(article.category, language)}</span><time datetime="${escapeHtml(article.publicationDate)}">${dateLabel(article.publicationDate, language)}</time></p><h2>${escapeHtml(article.heading)}</h2><p>${escapeHtml(article.intro)}</p><span class="news-preview__read">${greek ? 'Διαβάστε την ιστορία' : 'Read the story'} <span aria-hidden="true">&nearr;</span></span></div></a></article>`).join('') : `<p class="news-empty">${greek ? 'Δεν έχουν δημοσιευτεί ακόμη ιστορίες.' : 'No stories published yet.'}</p>`}<nav class="cinema-editorial-links" aria-label="${greek ? 'Περισσότερα από την Anchev Films' : 'More from Anchev Films'}"><a class="text-link" href="${greek ? '/el' : ''}/press">${greek ? 'Στον Τύπο' : 'In the press'} <span aria-hidden="true">&nearr;</span></a><a class="text-link" href="${greek ? '/el' : ''}/podcast">${greek ? 'Συζητήσεις για τον κινηματογράφο' : 'Conversations about cinema'} <span aria-hidden="true">&nearr;</span></a></nav></div><p class="sr-only" role="status" id="news-filter-status"></p></main>`;
};

export const renderNewsArticle = (article, { store, origin, language }) => {
  const greek = language === 'el';
  const prefix = greek ? '/el' : '';
  const url = `${origin}${newsPath(article)}`;
  const projects = (article.relatedProjects || []).map((id) => store.project(id, { publicOnly: true, locale: language })).filter(Boolean);
  const services = servicePages.filter((service) => article.relatedServices?.includes(service.slug));
  return `<main class="news-article" id="main-content"><article><header class="news-article__heading"><a class="text-link" href="${prefix}/news">${greek ? 'Όλα τα νέα' : 'All news'} <span aria-hidden="true">&larr;</span></a><p class="news-meta"><span>${label(article.category, language)}</span>${article.publicationDate ? `<time datetime="${escapeHtml(article.publicationDate)}">${dateLabel(article.publicationDate, language)}</time>` : `<span>${greek ? 'Πρόχειρο' : 'Draft'}</span>`}</p><h1>${escapeHtml(article.heading)}</h1>${article.intro ? `<p class="news-article__intro">${escapeHtml(article.intro)}</p>` : ''}<p class="news-byline">${escapeHtml(article.author || 'Anchev Films')}</p></header>
  ${article.thumbnail ? `<figure class="news-article__cover"><img src="${escapeHtml(article.thumbnail)}" alt="${escapeHtml(article.imageAlt)}" width="1600" height="1067" fetchpriority="high" /></figure>` : ''}
  <div class="news-article__layout"><div class="news-prose">${sanitizeNewsContent(article.richContent || '')}${article.body ? `<p>${escapeHtml(article.body).replace(/\n/g, '<br />')}</p>` : ''}${renderProjectFilmMarkup(article.video, article.thumbnail, greek ? 'Η ταινία' : 'The film', language)}${(article.blocks || []).map((block) => block.type === 'image' ? `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy" />${block.text ? `<figcaption>${escapeHtml(block.text)}</figcaption>` : ''}</figure>` : block.type === 'text' ? `<section>${block.title ? `<h2>${escapeHtml(block.title)}</h2>` : ''}<p>${escapeHtml(block.text).replace(/\n/g, '<br />')}</p></section>` : '').join('')}</div>
  <aside class="news-article__aside">${projects.length || services.length ? `<h2>${greek ? 'Σχετικά' : 'Explore further'}</h2>${projects.map((project) => `<a href="${prefix && project.hasGreek ? prefix : ''}/work/${project.id}">${escapeHtml(project.name)} <span aria-hidden="true">&nearr;</span></a>`).join('')}${services.map((service) => `<a href="${getServicePath(service, language)}">${escapeHtml(service[language].title)} <span aria-hidden="true">&nearr;</span></a>`).join('')}` : ''}<h2>${greek ? 'Μοιραστείτε' : 'Share this story'}</h2><a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">&nearr;</span></a><a href="mailto:?subject=${encodeURIComponent(article.heading)}&amp;body=${encodeURIComponent(url)}">Email <span aria-hidden="true">&nearr;</span></a></aside></div>
  <footer class="news-article__footer"><a class="text-link" href="${prefix}/contact">${greek ? 'Ας μιλήσουμε για την παραγωγή σας' : 'Let\'s talk about your production'} <span aria-hidden="true">&nearr;</span></a></footer></article></main>`;
};

export const getNewsSeo = ({ route, language, origin, store, pageOverride, defaultImage }) => {
  const prefix = language === 'el' ? '/el' : '';
  const index = route === `${prefix}/news`;
  const match = route.match(/^\/(?:el\/)?news\/([a-z0-9-]+)$/);
  if (!index && !match) return null;
  const article = match ? pageOverride?.kind === 'news' ? pageOverride : store.page(`news-${match[1]}`, language, true) : null;
  if (match && article?.kind !== 'news') return null;
  const articles = index ? store.news({ locale: language }) : [];
  const canonical = `${origin}${index ? `${prefix}/news` : newsPath(article)}`;
  const title = index ? language === 'el' ? 'Ιστορίες | Anchev Films' : 'Journal | Anchev Films' : article.seo?.title || `${article.heading} | Anchev Films`;
  const description = index ? language === 'el' ? 'Νέα, παραγωγές, συνεργασίες και ιστορίες από την Anchev Films και το Anchev Studio στην Αθήνα.' : 'Productions, collaborations and studio updates from Anchev Films, an independent film production company in Athens.' : article.seo?.description || article.intro || article.heading;
  const image = article?.seo?.image || article?.thumbnail;
  const counterpart = index || store.page(article.id, language === 'el' ? 'en' : 'el', true);
  const alternates = counterpart && !counterpart.seo?.noindex && !article?.seo?.noindex ? ['en', 'el', 'x-default'].map((locale) => ({ language: locale, url: `${origin}${locale === 'el' ? '/el' : ''}/news${index ? '' : `/${article.id.slice(5)}`}` })) : [];
  const organization = { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Anchev Films', url: origin, logo: { '@type': 'ImageObject', url: `${origin}/assets/anchevlogo.png` } };
  return {
    status: 200, language, title, description, canonical, alternates,
    image: image ? new URL(image, origin).href : defaultImage, imageAlt: article?.imageAlt || 'Anchev Films', ogType: index ? 'website' : 'article',
    publishedTime: article?.publicationDate, modifiedTime: article?.modifiedAt,
    robots: article?.seo?.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large',
    schema: { '@context': 'https://schema.org', '@graph': [organization,
      index ? { '@type': 'CollectionPage', name: title, description, url: canonical, inLanguage: language, mainEntity: { '@type': 'ItemList', itemListElement: articles.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, name: entry.heading, url: `${origin}${newsPath(entry)}` })) } }
        : { '@type': 'BlogPosting', '@id': `${canonical}#article`, headline: article.heading, description, url: canonical, mainEntityOfPage: canonical, inLanguage: language, image: image ? new URL(image, origin).href : defaultImage, datePublished: article.publicationDate || undefined, dateModified: article.modifiedAt || article.publicationDate || undefined, articleSection: label(article.category, language), author: article.author && article.author !== 'Anchev Films' ? { '@type': 'Person', name: article.author } : { '@id': `${origin}/#organization` }, publisher: { '@id': `${origin}/#organization` } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Anchev Films', item: `${origin}${prefix}/` }, { '@type': 'ListItem', position: 2, name: language === 'el' ? 'Νέα' : 'News', item: `${origin}${prefix}/news` }, ...(index ? [] : [{ '@type': 'ListItem', position: 3, name: article.heading, item: canonical }])] }
    ] }, renderData: index ? { newsIndex: articles, language } : { newsArticle: article, language }
  };
};