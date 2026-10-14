import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { ContentStore } from './src/database.js';
import { installAuthentication } from './src/auth.js';
import { installAdminApi } from './src/admin-api.js';
import { MediaService } from './src/media.js';
import {
  renderAboutPageMarkup,
  renderArticlesMarkup,
  renderClientsMarkup,
  renderContactPageMarkup,
  renderPodcastEpisodesMarkup,
  getPodcastEpisodePath,
  renderPodcastPageMarkup,
  renderProjectBrowserMarkup,
  renderProjectPageMarkup,
  renderStudioPageMarkup
} from './public/scripts/modules/content-markup.js';
import { servicePages, getServicePage, getServicePath, getLanguageAlternates, renderServicePageMarkup } from './public/scripts/modules/service-pages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(publicDir, 'uploads'));
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const store = new ContentStore(dataDir);
store.importJson();
const media = new MediaService(store, uploadsDir);
const indexFile = path.join(publicDir, 'index.html');
const projectTemplateFile = path.join(publicDir, 'project.html');
const projectsFile = path.join(dataDir, 'projects.json');
const clientsFile = path.join(dataDir, 'clients.json');
const articlesFile = path.join(dataDir, 'articles.json');
const settingsFile = path.join(dataDir, 'settings.json');
const podcastSnapshotFile = path.join(dataDir, 'podcast-cache.json');
const contentMarkupFile = path.join(publicDir, 'scripts', 'modules', 'content-markup.js');
const socialImageFile = path.join(publicDir, 'assets', 'anchev-films-social.jpg');
const SITE_NAME = 'Anchev Films';
const SEO_BLOCK = /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/;
const PODCAST_FEED_URL = process.env.PODCAST_FEED_URL || 'https://anchor.fm/s/117d9f3d8/podcast/rss';
const PODCAST_SPOTIFY_URL = 'https://open.spotify.com/show/2f9bhw76eO5EWttGU6IVuV';
const PODCAST_CACHE_TTL = 5 * 60 * 1000;
const SERVICE_CATALOG = [
  'Creative Development',
  'Pre-Production',
  'Film & Video Production',
  'Event Film Production',
  'Post-Production',
  'Delivery & Versions'
];
const DEFAULT_SETTINGS = {
  videoSource: '/media/hero-video.mp4',
  mobileVideoSource: '/media/hero-video-mobile.mp4',
  showreelSource: '/media/showreel.mp4',
  contact: { email: 'ab@anchevfilms.com', phone: '+30 21 0444 5296', location: 'Athens, Greece' },
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/anchev.films/' }
  ]
};

store.setSettings({ ...DEFAULT_SETTINGS, ...store.settings() });
const readProjects = async () => store.projects({ publicOnly: true });
const readClients = async () => store.clients();
const readArticles = async () => store.articles();
const readSettings = async () => ({ ...DEFAULT_SETTINGS, ...store.settings() });

const podcastFeedParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true
});
let podcastCache = null;
let podcastRefresh = null;

const getFeedText = (value) => {
  const text = value && typeof value === 'object' ? value['#text'] : value;
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getFeedAttribute = (value, name) => (
  value && typeof value === 'object' ? value[`@_${name}`] : ''
);

const getSafePodcastUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' ? url.href : '';
  } catch (_error) {
    return '';
  }
};

const refreshPodcastFeed = async () => {
  if (podcastCache && Date.now() - podcastCache.fetchedAt < PODCAST_CACHE_TTL) {
    return podcastCache.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(PODCAST_FEED_URL, {
      headers: {
        accept: 'application/rss+xml, application/xml;q=0.9',
        'user-agent': 'AnchevFilms.com podcast reader'
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Podcast feed returned ${response.status}`);

    const parsed = podcastFeedParser.parse(await response.text());
    const channel = parsed?.rss?.channel;
    if (!channel) throw new Error('Podcast feed is missing its channel.');

    const feedItems = Array.isArray(channel.item)
      ? channel.item
      : (channel.item ? [channel.item] : []);
    const episodes = feedItems.map((item, index) => {
      const published = new Date(getFeedText(item.pubDate));
      const guid = getFeedText(item.guid);
      return {
        id: guid || `episode-${index + 1}`,
        title: getFeedText(item.title),
        description: getFeedText(item.description || item['itunes:summary']),
        publishedAt: Number.isNaN(published.getTime()) ? '' : published.toISOString(),
        duration: getFeedText(item['itunes:duration']),
        episodeNumber: getFeedText(item['itunes:episode']),
        image: getSafePodcastUrl(getFeedAttribute(item['itunes:image'], 'href')),
        audioUrl: getSafePodcastUrl(getFeedAttribute(item.enclosure, 'url')),
        link: getSafePodcastUrl(item.link) || PODCAST_SPOTIFY_URL
      };
    }).filter((episode) => episode.title);

    const data = {
      title: getFeedText(channel.title),
      description: getFeedText(channel.description || channel['itunes:summary']),
      cover: getSafePodcastUrl(getFeedAttribute(channel['itunes:image'], 'href')),
      spotifyUrl: PODCAST_SPOTIFY_URL,
      episodes,
      updatedAt: getFeedText(channel.lastBuildDate)
    };
    podcastCache = { data, fetchedAt: Date.now() };
    await fs.writeFile(podcastSnapshotFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8').catch(() => {});
    return data;
  } catch (error) {
    if (podcastCache) return podcastCache.data;
    const snapshot = await fs.readFile(podcastSnapshotFile, 'utf8').then(JSON.parse).catch(() => null);
    if (snapshot?.title && Array.isArray(snapshot.episodes)) return snapshot;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const getPodcastFeed = async () => {
  if (!podcastCache) {
    const snapshot = await fs.readFile(podcastSnapshotFile, 'utf8').then(JSON.parse).catch(() => null);
    if (snapshot?.title && Array.isArray(snapshot.episodes)) {
      podcastCache = { data: snapshot, fetchedAt: 0 };
    }
  }
  if (podcastCache && Date.now() - podcastCache.fetchedAt < PODCAST_CACHE_TTL) return podcastCache.data;
  if (!podcastRefresh) {
    podcastRefresh = refreshPodcastFeed().catch(() => null).finally(() => { podcastRefresh = null; });
  }
  return podcastCache?.data || await podcastRefresh;
};

const cleanSeoText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const limitSeoDescription = (value, maximum = 160) => {
  const text = cleanSeoText(value);
  if (text.length <= maximum) return text;
  const shortened = text.slice(0, maximum - 3);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > 60 ? lastSpace : maximum - 3).trimEnd()}...`;
};

const escapeHtml = (value) => cleanSeoText(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const serializeJsonLd = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const getSiteOrigin = (req) => {
  const configuredUrl = cleanSeoText(process.env.SITE_URL);
  if (configuredUrl) {
    try {
      const origin = new URL(configuredUrl).origin;
      if (origin !== 'null') return origin;
    } catch (_error) {}
  }

  const requestedHost = cleanSeoText(req.get('host'));
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(requestedHost)
    ? requestedHost
    : `localhost:${port}`;
  const forwardedProtocol = cleanSeoText(req.get('x-forwarded-proto')).split(',')[0].toLowerCase();
  const protocol = forwardedProtocol === 'https' || req.protocol === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
};

const getAbsoluteUrl = (origin, value) => {
  const pathOrUrl = cleanSeoText(value);
  if (!pathOrUrl) return '';
  try {
    const resolved = new URL(pathOrUrl, origin);
    return ['http:', 'https:'].includes(resolved.protocol) ? resolved.href : '';
  } catch (_error) {
    return '';
  }
};

const getImageMimeType = (value) => {
  const pathname = (() => {
    try {
      return new URL(value).pathname;
    } catch (_error) {
      return String(value || '').split(/[?#]/)[0];
    }
  })();
  const extension = path.extname(pathname).toLowerCase();
  return ({
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  })[extension] || '';
};

const getWorkIdFromPath = (pathname) => {
  const match = pathname.match(/^\/work\/([^/]+)\/?$/);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1]).trim().toLowerCase();
  } catch (_error) {
    return '';
  }
};

const getHomeDescription = (podcast) => {
  const podcastSummary = podcast?.title
    ? ` and the ${cleanSeoText(podcast.title)} podcast`
    : ' and production services';
  return limitSeoDescription(
    `Anchev Films is an Athens production company for commercials, brand films and culture-led work. Explore selected projects${podcastSummary}.`
  );
};

const getProjectDescription = (project) => {
  const narrative = cleanSeoText(project.brief || project.approach || project.production || project.note);
  if (narrative) return limitSeoDescription(narrative);

  const projectType = cleanSeoText(project.category) || 'film project';
  const client = cleanSeoText(project.client);
  const year = cleanSeoText(project.year);
  const director = cleanSeoText(project.director);
  return limitSeoDescription(
    `${project.name} is a ${projectType}${client ? ` for ${client}` : ''} by Anchev Films in Athens.${director ? ` Directed by ${director}.` : ''}${year ? ` Produced in ${year}.` : ''}`
  );
};

const getIsoDuration = (value) => {
  const parts = String(value || '').split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return '';
  const [hours, minutes, seconds] = parts.length === 3
    ? parts
    : [0, parts.length === 2 ? parts[0] : 0, parts.at(-1)];
  if (minutes > 59 || seconds > 59) return '';
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${seconds || (!hours && !minutes) ? `${seconds}S` : ''}`;
};

const getSocialProfileUrl = (origin, value) => {
  const profile = getAbsoluteUrl(origin, value);
  if (!profile) return '';
  try {
    const url = new URL(profile);
    const genericSocialHosts = new Set([
      'instagram.com',
      'www.instagram.com',
      'linkedin.com',
      'www.linkedin.com',
      'vimeo.com',
      'www.vimeo.com'
    ]);
    if (genericSocialHosts.has(url.hostname.toLowerCase()) && url.pathname.replace(/\/+$/, '') === '') {
      return '';
    }
    return url.href;
  } catch (_error) {
    return '';
  }
};

const getOrganizationNode = ({ origin, description, image, logo, settings }) => {
  const socialProfiles = Array.isArray(settings.social)
    ? settings.social.map((entry) => getSocialProfileUrl(origin, entry.href)).filter(Boolean)
    : [];
  const organization = {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: SITE_NAME,
    url: origin,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 500,
      height: 500
    },
    image,
    description,
    founder: { '@type': 'Person', name: 'Boris Anchev' },
    areaServed: ['Athens', 'Worldwide'],
    knowsAbout: SERVICE_CATALOG,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Film production services',
      itemListElement: SERVICE_CATALOG.map((name) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name }
      }))
    }
  };
  if (settings.contact?.email) organization.email = settings.contact.email;
  if (settings.contact?.phone) organization.telephone = settings.contact.phone;
  if (settings.contact?.location) {
    organization.location = { '@type': 'Place', name: settings.contact.location };
  }
  if (socialProfiles.length) organization.sameAs = socialProfiles;
  return organization;
};

const getPodcastSchemaNodes = ({ origin, podcast }) => {
  if (!podcast?.title) return [];

  const seriesId = `${origin}/#podcast-series`;
  const episodes = Array.isArray(podcast.episodes) ? podcast.episodes.slice(0, 25) : [];
  const episodeNodes = episodes.map((episode, index) => {
    const episodeId = `${origin}/#podcast-episode-${encodeURIComponent(episode.id || index + 1)}`;
    const duration = getIsoDuration(episode.duration);
    const episodeNode = {
      '@type': 'PodcastEpisode',
      '@id': episodeId,
      name: episode.title,
      description: limitSeoDescription(episode.description || episode.title, 300),
      url: getAbsoluteUrl(origin, getPodcastEpisodePath(episode)),
      partOfSeries: { '@id': seriesId },
      publisher: { '@id': `${origin}/#organization` },
      inLanguage: 'el-GR'
    };
    if (episode.publishedAt) episodeNode.datePublished = episode.publishedAt;
    if (episode.episodeNumber) episodeNode.episodeNumber = episode.episodeNumber;
    if (duration) episodeNode.duration = duration;
    if (episode.image) episodeNode.image = episode.image;
    if (episode.audioUrl) {
      episodeNode.associatedMedia = {
        '@type': 'AudioObject',
        contentUrl: episode.audioUrl,
        encodingFormat: 'audio/mp4'
      };
    }
    return episodeNode;
  });

  return [
    {
      '@type': 'PodcastSeries',
      '@id': seriesId,
      name: podcast.title,
      description: podcast.description,
      url: `${origin}/#podcast-page`,
      webFeed: PODCAST_FEED_URL,
      sameAs: podcast.spotifyUrl,
      image: podcast.cover,
      publisher: { '@id': `${origin}/#organization` },
      inLanguage: 'el-GR',
      hasPart: episodeNodes.map((episode) => ({ '@id': episode['@id'] }))
    },
    ...episodeNodes
  ];
};

const getHomeSchema = ({ origin, description, image, logo, settings, clients, articles, podcast }) => {
  const organization = getOrganizationNode({ origin, description, image, logo, settings });
  const graph = [
    organization,
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: SITE_NAME,
      url: origin,
      publisher: { '@id': `${origin}/#organization` },
      inLanguage: 'en'
    },
    {
      '@type': 'WebPage',
      '@id': `${origin}/#webpage`,
      name: `${SITE_NAME} | Film Production Company in Athens`,
      description,
      url: origin,
      isPartOf: { '@id': `${origin}/#website` },
      about: { '@id': `${origin}/#organization` },
      primaryImageOfPage: { '@type': 'ImageObject', url: image },
      inLanguage: 'en'
    }
  ];

  if (clients.length) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${origin}/#selected-clients`,
      name: 'Selected clients of Anchev Films',
      numberOfItems: clients.length,
      itemListElement: clients.map((name, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name
      }))
    });
  }
  if (articles.length) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${origin}/#articles`,
      name: 'Anchev Films in the press',
      numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Article',
          headline: article.title,
          url: article.url,
          ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
          ...(article.summary ? { description: article.summary } : {}),
          ...(article.language ? { inLanguage: article.language } : {}),
          ...(article.publisher ? {
            publisher: { '@type': 'Organization', name: article.publisher }
          } : {})
        }
      }))
    });
  }
  graph.push(...getPodcastSchemaNodes({ origin, podcast }));
  return { '@context': 'https://schema.org', '@graph': graph };
};

const getProjectSchema = ({ origin, canonical, image, siteImage, logo, project, description, settings }) => {
  const organization = getOrganizationNode({
    origin,
    description: getHomeDescription(null),
    image: siteImage,
    logo,
    settings
  });
  const organizationReference = { '@id': `${origin}/#organization` };
  const creativeWork = {
    '@type': 'CreativeWork',
    '@id': `${canonical}#work`,
    name: project.name,
    description,
    url: canonical,
    mainEntityOfPage: { '@id': `${canonical}#webpage` },
    creator: organizationReference,
    producer: organizationReference,
    publisher: organizationReference
  };
  const video = getAbsoluteUrl(origin, project.video);
  if (image) creativeWork.image = image;
  if (video) {
    const videoUrl = new URL(video);
    const youtubeId = ['youtube.com', 'www.youtube.com'].includes(videoUrl.hostname)
      ? videoUrl.searchParams.get('v')
      : (videoUrl.hostname === 'youtu.be' ? videoUrl.pathname.slice(1) : '');
    const uploadDate = { lINECZrijtg: '2026-03-01' }[youtubeId];
    const isDirectVideo = /\.(mp4|webm|mov)$/i.test(videoUrl.pathname);
    if (isDirectVideo || uploadDate) creativeWork.associatedMedia = {
      '@type': uploadDate ? 'VideoObject' : 'MediaObject',
      '@id': `${canonical}#video`,
      name: project.name,
      description,
      ...(uploadDate ? { uploadDate, embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}` } : {}),
      ...(isDirectVideo ? { contentUrl: video } : {}),
      ...(getIsoDuration(project.duration) ? { duration: getIsoDuration(project.duration) } : {}),
      ...(image ? { thumbnailUrl: image } : {})
    };
  }
  if (project.client) creativeWork.about = { '@type': 'Organization', name: project.client };
  if (project.id === 'anti-bullying') creativeWork.alternateName = 'Ψήσου να μιλήσεις - να δράσεις';
  if (project.category) creativeWork.genre = project.category;
  if (/^\d{4}$/.test(project.year)) creativeWork.copyrightYear = Number(project.year);
  if (project.location) creativeWork.locationCreated = { '@type': 'Place', name: project.location };
  if (project.director) creativeWork.director = { '@type': 'Person', name: project.director };
  if (Array.isArray(project.services) && project.services.length) creativeWork.keywords = project.services.join(', ');
  const duration = getIsoDuration(project.duration);
  if (duration) creativeWork.duration = duration;
  const projectLink = getAbsoluteUrl(origin, project.link);
  if (projectLink) creativeWork.sameAs = projectLink;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: SITE_NAME,
        url: origin,
        publisher: organizationReference,
        inLanguage: 'en'
      },
      creativeWork,
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        name: `${project.name} | ${SITE_NAME}`,
        description,
        url: canonical,
        isPartOf: { '@id': `${origin}/#website` },
        primaryImageOfPage: { '@type': 'ImageObject', url: image },
        breadcrumb: { '@id': `${canonical}#breadcrumb` },
        inLanguage: 'en'
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: origin },
          { '@type': 'ListItem', position: 2, name: 'Work', item: `${origin}/#work-page` },
          { '@type': 'ListItem', position: 3, name: project.name, item: canonical }
        ]
      }
    ]
  };
};

const getSeoPage = async (req) => {
  const [settings, clients, articles, rawProjects, podcast] = await Promise.all([
    readSettings(),
    readClients(),
    readArticles(),
    readProjects().catch(() => []),
    getPodcastFeed().catch(() => null)
  ]);
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const origin = getSiteOrigin(req);
  const workId = getWorkIdFromPath(req.path);
  const project = workId ? projects.find((entry) => entry.id === workId) : null;
  const isHomeRoute = req.path === '/' || req.path === '/index.html';
  const isAdminRoute = req.path === '/studio/anchev' || req.path.startsWith('/studio/');
  const logo = getAbsoluteUrl(origin, '/assets/anchevlogo.png');
  const defaultImage = getAbsoluteUrl(origin, '/assets/anchev-films-social.jpg');
  const episode = podcast?.episodes?.find((entry) => getPodcastEpisodePath(entry) === req.path);
  if (episode) {
    const canonical = getAbsoluteUrl(origin, getPodcastEpisodePath(episode));
    const description = limitSeoDescription(episode.description || `${episode.title} / ${podcast.title}`);
    const image = episode.image || podcast.cover || defaultImage;
    const episodeNode = getPodcastSchemaNodes({ origin, podcast }).find((node) => node['@type'] === 'PodcastEpisode' && node.url === canonical);
    return {
      status: 200, title: `${episode.title} | ${podcast.title} | ${SITE_NAME}`, description,
      canonical, image, imageAlt: podcast.title, imageType: getImageMimeType(image), language: 'el', ogType: 'article',
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      schema: { '@context': 'https://schema.org', '@graph': [
        getOrganizationNode({ origin, description: getHomeDescription(null), image: defaultImage, logo, settings }),
        ...getPodcastSchemaNodes({ origin, podcast }),
        { '@type': 'WebPage', '@id': `${canonical}#webpage`, name: episode.title, description, url: canonical,
          inLanguage: 'el', mainEntity: { '@id': episodeNode['@id'] } }
      ] },
      renderData: { episode, podcast }
    };
  }
  const servicePage = getServicePage(req.path);
  const language = req.path.startsWith('/el/') ? 'el' : 'en';
  const alternates = servicePage ? getLanguageAlternates(servicePage).map((entry) => ({
    language: entry.language,
    url: getAbsoluteUrl(origin, entry.path)
  })) : [];

  if (servicePage && req.path !== '/studio') {
    const copy = servicePage[language];
    const canonical = getAbsoluteUrl(origin, getServicePath(servicePage, language));
    const image = getAbsoluteUrl(origin, '/media/studio/studio-frame-01.jpg');
    const mainEntity = servicePage.isStudio ? {
      '@type': 'Place', '@id': `${canonical}#place`, name: 'Anchev Studio', url: canonical,
      description: copy.description, image,
      hasMap: 'https://share.google/YTRzVZun1CXa0FyNx',
      address: { '@type': 'PostalAddress', streetAddress: 'Apostolou Rapti 5', addressLocality: 'Melissia', postalCode: '15127', addressCountry: 'GR' }
    } : {
      '@type': 'Service', '@id': `${canonical}#service`, name: copy.title,
      description: copy.description, url: canonical,
      provider: { '@id': `${origin}/#organization` }, areaServed: { '@type': 'Country', name: 'Greece' }
    };
    return {
      status: 200, title: `${copy.title} | ${SITE_NAME}`, description: copy.description,
      canonical, image, imageAlt: 'Inside Anchev Studio in Melissia', imageType: 'image/jpeg',
      ogType: 'website', language, alternates,
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      schema: { '@context': 'https://schema.org', '@graph': [
        getOrganizationNode({ origin, description: getHomeDescription(null), image: defaultImage, logo, settings }),
        { '@type': 'WebPage', '@id': `${canonical}#webpage`, name: copy.title, description: copy.description,
          url: canonical, inLanguage: language, mainEntity: { '@id': mainEntity['@id'] }, breadcrumb: { '@id': `${canonical}#breadcrumb` } },
        mainEntity,
        { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: origin },
          { '@type': 'ListItem', position: 2, name: copy.title, item: canonical }
        ] }
      ] },
      renderData: { servicePage, language, projects, settings }
    };
  }

  if (req.path === '/studio') {
    const canonical = getAbsoluteUrl(origin, '/studio');
    const image = getAbsoluteUrl(origin, '/media/experience/studio-poster.jpg');
    const title = `Anchev Studio | Production Space & Live Streaming | ${SITE_NAME}`;
    const description = 'Anchev Studio in Melissia: 12 m wide, 16 m deep and 5 m high, with car access, truck load-in, fast internet and three-phase power.';
    const files = await fs.readdir(path.join(publicDir, 'media', 'studio')).catch(() => []);
    const visuals = files.filter((file) => /^studio-visual-0[1-6]\.(webp|jpg|png)$/.test(file))
      .sort().map((file) => `/media/studio/${file}`);
    return {
      status: 200,
      title,
      description,
      canonical,
      image,
      imageAlt: 'Inside Anchev Studio',
      imageType: 'image/jpeg',
      imageWidth: 1920,
      imageHeight: 1080,
      ogType: 'website',
      language,
      alternates,
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      schema: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': `${canonical}#webpage`,
            name: title,
            description,
            url: canonical,
            inLanguage: 'en',
            primaryImageOfPage: { '@type': 'ImageObject', url: image },
            mainEntity: { '@id': `${canonical}#place` }
          },
          {
            '@type': 'Place',
            '@id': `${canonical}#place`,
            name: 'Anchev Studio',
            description,
            url: canonical,
            image,
            hasMap: 'https://share.google/YTRzVZun1CXa0FyNx',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Apostolou Rapti 5',
              addressLocality: 'Melissia',
              postalCode: '15127',
              addressCountry: 'GR'
            },
            amenityFeature: [
              { '@type': 'LocationFeatureSpecification', name: 'Studio width', value: 12, unitText: 'm' },
              { '@type': 'LocationFeatureSpecification', name: 'Studio depth', value: 16, unitText: 'm' },
              { '@type': 'LocationFeatureSpecification', name: 'Studio height', value: 5, unitText: 'm' },
              { '@type': 'LocationFeatureSpecification', name: 'Space for a car inside', value: true },
              { '@type': 'LocationFeatureSpecification', name: 'Truck access to the entrance', value: true },
              { '@type': 'LocationFeatureSpecification', name: 'Fast internet for live streaming', value: true },
              { '@type': 'LocationFeatureSpecification', name: 'Three-phase power', value: true }
            ]
          }
        ]
      },
      renderData: { studio: true, visuals }
    };
  }

  if (project) {
    const canonical = getAbsoluteUrl(origin, `/work/${encodeURIComponent(project.id)}`);
    const projectImage = getAbsoluteUrl(origin, project.thumbnail);
    const image = projectImage || defaultImage;
    const description = getProjectDescription(project);
    return {
      status: 200,
      title: `${project.name}${project.client ? ` | ${project.client}` : ''} | ${SITE_NAME}`,
      description,
      canonical,
      image,
      imageAlt: projectImage
        ? `${project.name} by ${SITE_NAME}`
        : `${SITE_NAME}, film production in Athens`,
      imageType: getImageMimeType(image),
      imageWidth: projectImage ? null : 1200,
      imageHeight: projectImage ? null : 630,
      ogType: project.video ? 'video.other' : 'article',
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
      schema: getProjectSchema({
        origin,
        canonical,
        image,
        siteImage: defaultImage,
        logo,
        project,
        description,
        settings
      }),
      renderData: { settings, clients, articles, projects, podcast, project }
    };
  }

  const description = getHomeDescription(podcast);
  return {
    status: isHomeRoute || isAdminRoute ? 200 : 404,
    title: `${SITE_NAME} | Film Production Company in Athens`,
    description,
    canonical: origin,
    image: defaultImage,
    imageAlt: `${SITE_NAME}, film production in Athens`,
    imageType: 'image/jpeg',
    imageWidth: 1200,
    imageHeight: 630,
    ogType: 'website',
    robots: isAdminRoute || !isHomeRoute
      ? 'noindex,nofollow,noarchive'
      : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    schema: getHomeSchema({
      origin,
      description,
      image: defaultImage,
      logo,
      settings,
      clients,
      articles,
      podcast
    }),
    renderData: { settings, clients, articles, projects, podcast }
  };
};

const getSeoTags = ({
  title,
  description,
  canonical,
  image,
  imageAlt,
  imageType,
  imageWidth,
  imageHeight,
  ogType,
  robots,
  schema,
  language = 'en',
  alternates = []
}) => [
  `<title>${escapeHtml(title)}</title>`,
  `<meta name="description" content="${escapeHtml(description)}" />`,
  `<meta name="robots" content="${escapeHtml(robots)}" />`,
  '<meta name="theme-color" content="#080808" />',
  `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  ...alternates.map((entry) => `<link rel="alternate" hreflang="${entry.language}" href="${escapeHtml(entry.url)}" />`),
  `<link rel="alternate" type="application/rss+xml" title="${SITE_NAME} podcast" href="${escapeHtml(PODCAST_FEED_URL)}" />`,
  `<meta property="og:site_name" content="${SITE_NAME}" />`,
  `<meta property="og:title" content="${escapeHtml(title)}" />`,
  `<meta property="og:description" content="${escapeHtml(description)}" />`,
  `<meta property="og:type" content="${escapeHtml(ogType || 'website')}" />`,
  `<meta property="og:locale" content="${language === 'el' ? 'el_GR' : 'en_US'}" />`,
  `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
  `<meta property="og:image" content="${escapeHtml(image)}" />`,
  `<meta property="og:image:secure_url" content="${escapeHtml(image)}" />`,
  imageType ? `<meta property="og:image:type" content="${escapeHtml(imageType)}" />` : '',
  imageWidth ? `<meta property="og:image:width" content="${imageWidth}" />` : '',
  imageHeight ? `<meta property="og:image:height" content="${imageHeight}" />` : '',
  `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
  '<meta name="twitter:card" content="summary_large_image" />',
  `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
  `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
  `<script type="application/ld+json">${serializeJsonLd(schema)}</script>`
].filter(Boolean).join('\n    ');

const getLatestTimestamp = async (files) => {
  const stats = await Promise.all(files.map((file) => fs.stat(file).catch(() => null)));
  return Math.max(...stats.map((entry) => entry?.mtimeMs || 0));
};

const getSitemapDates = async (podcast) => {
  const [homeTimestamp, projectsTimestamp] = await Promise.all([
    getLatestTimestamp([
      indexFile,
      projectsFile,
      clientsFile,
      articlesFile,
      settingsFile,
      contentMarkupFile,
      __filename,
      projectTemplateFile,
      path.join(publicDir, 'scripts', 'modules', 'service-pages.js'),
      socialImageFile
    ]),
    getLatestTimestamp([projectsFile])
  ]);
  const podcastTimestamp = Date.parse(podcast?.updatedAt || '') || 0;
  const latestHomeTimestamp = Math.max(homeTimestamp, podcastTimestamp);
  return {
    home: new Date(latestHomeTimestamp || Date.now()).toISOString().slice(0, 10),
    projects: new Date(projectsTimestamp || homeTimestamp || Date.now()).toISOString().slice(0, 10)
  };
};

const getSitemapUrl = ({ location, lastModified, priority, changeFrequency, image, imageTitle }) => [
  '  <url>',
  `    <loc>${escapeHtml(location)}</loc>`,
  `    <lastmod>${lastModified}</lastmod>`,
  `    <changefreq>${changeFrequency}</changefreq>`,
  `    <priority>${priority}</priority>`,
  ...(image ? [
    '    <image:image>',
    `      <image:loc>${escapeHtml(image)}</image:loc>`,
    ...(imageTitle ? [`      <image:title>${escapeHtml(imageTitle)}</image:title>`] : []),
    '    </image:image>'
  ] : []),
  '  </url>'
].join('\n');

const injectRootMarkup = (template, id, markup) => {
  const pattern = new RegExp(`(<div\\b[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(<\\/div>)`);
  return template.replace(pattern, (_match, opening, closing) => (
    `${opening.replace('aria-busy="true"', 'aria-busy="false"')}${markup}${closing}`
  ));
};

const renderDynamicContent = (template, data) => {
  if (!data) return template;
  const contact = {
    ...(data.settings?.contact || {}),
    social: Array.isArray(data.settings?.social) ? data.settings.social : []
  };
  let html = injectRootMarkup(template, 'work-browser', renderProjectBrowserMarkup(data.projects));
  html = injectRootMarkup(html, 'clients-field', renderClientsMarkup(data.clients));
  html = injectRootMarkup(html, 'articles-list', renderArticlesMarkup(data.articles));
  html = injectRootMarkup(html, 'about-page-content', renderAboutPageMarkup());
  html = injectRootMarkup(html, 'contact-page-content', renderContactPageMarkup(contact));
  if (data.podcast) {
    html = injectRootMarkup(html, 'podcast-episodes-list', renderPodcastEpisodesMarkup(data.podcast));
    if (data.podcast.cover) {
      html = html.replace(
        /(<img\s+[^>]*id="podcast-cover"[^>]*\ssrc=")[^"]*(")/,
        (_match, opening, closing) => `${opening}${escapeHtml(data.podcast.cover)}${closing}`
      );
    }
  }
  return html;
};

const renderSeoPage = async (req, res) => {
  try {
    const seo = await getSeoPage(req);
    const template = await fs.readFile(seo.renderData.project || seo.renderData.studio || seo.renderData.servicePage || seo.renderData.episode ? projectTemplateFile : indexFile, 'utf8');
    const seoMarkup = `<!-- SEO:START -->\n    ${getSeoTags(seo)}\n    <!-- SEO:END -->`;
    const renderedTemplate = seo.renderData.episode
      ? injectRootMarkup(template, 'project-page-root', renderPodcastPageMarkup(seo.renderData.episode, seo.renderData.podcast))
      : seo.renderData.servicePage
      ? injectRootMarkup(template, 'project-page-root', renderServicePageMarkup(seo.renderData.servicePage, seo.renderData.language, seo.renderData.projects, seo.renderData.settings.contact || {}))
      : seo.renderData.studio
      ? injectRootMarkup(template, 'project-page-root', renderStudioPageMarkup(seo.renderData.visuals))
      : seo.renderData.project
      ? injectRootMarkup(template, 'project-page-root', renderProjectPageMarkup(seo.renderData.project, seo.renderData.projects, seo.description))
      : renderDynamicContent(template, seo.renderData);
    res.setHeader('Cache-Control', 'no-store');
    res.status(seo.status || 200).type('html').send(renderedTemplate.replace(SEO_BLOCK, seoMarkup).replace('<html lang="en">', `<html lang="${seo.language || 'en'}">`).replace(/<script\b/g, `<script nonce="${res.locals.nonce}"`));
  } catch (_error) {
    res.status(500).send('Unable to render this page.');
  }
};

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.locals.nonce = crypto.randomBytes(18).toString('base64');
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (_req, res) => `'nonce-${res.locals.nonce}'`, 'https://www.googletagmanager.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'https:', 'data:'],
      mediaSrc: ["'self'", 'https:'],
      connectSrc: ["'self'", 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.google.com', 'https://*.doubleclick.net'],
      frameSrc: ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://player.vimeo.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use('/api/admin', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api/admin', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json({ limit: '256kb' }));
installAuthentication(app, store);
installAdminApi(app, store);
media.install(app);
if (process.env.MEDIA_WORKER !== '0') media.start();
const servePublicFiles = express.static(publicDir, {
  extensions: ['html'],
  index: false,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    } else if (/\.(?:css|js)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
});

app.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: Boolean(store.db.prepare('SELECT 1 AS ok').get().ok), release: process.env.RELEASE_VERSION || 'development' });
});

app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await readProjects();
    res.json({ projects });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

app.get('/api/clients', async (_req, res) => {
  try {
    const clients = await readClients();
    res.json({ clients });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to load clients' });
  }
});

app.get('/api/articles', async (_req, res) => {
  try {
    const articles = await readArticles();
    res.json({ articles });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to load articles' });
  }
});

app.get('/api/podcast', async (_req, res) => {
  try {
    const podcast = await getPodcastFeed();
    res.setHeader('Cache-Control', 'public, max-age=300, stale-if-error=86400');
    res.json(podcast);
  } catch (_error) {
    res.status(502).json({ error: 'Failed to load podcast episodes' });
  }
});

app.get('/api/settings', async (_req, res) => {
  try {
    res.json(await readSettings());
  } catch (_error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120), email: z.email().max(254), company: z.string().trim().max(200).default(''),
  message: z.string().trim().min(20).max(5000), locale: z.enum(['en', 'el']).default('en'), privacy: z.literal(true),
  website: z.string().max(100).default('')
});
app.post('/api/contact', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }), (req, res, next) => {
  try {
    const inquiry = inquirySchema.parse(req.body);
    if (inquiry.website) return res.status(202).json({ ok: true });
    const id = crypto.randomUUID();
    store.db.prepare('INSERT INTO inquiries(id,name,email,company,message,locale,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(id, inquiry.name, inquiry.email, inquiry.company, inquiry.message, inquiry.locale, new Date().toISOString());
    res.status(201).json({ ok: true, reference: id });
  } catch (error) { next(error); }
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.get('/robots.txt', (req, res) => {
  const origin = getSiteOrigin(req);
  res.setHeader('Cache-Control', 'no-store');
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /studio/',
    'Disallow: /admin',
    'Disallow: /api/',
    `Sitemap: ${origin}/sitemap.xml`
  ].join('\n'));
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const [rawProjects, podcast] = await Promise.all([
      readProjects().catch(() => []),
      getPodcastFeed().catch(() => null)
    ]);
    const projects = Array.isArray(rawProjects) ? rawProjects : [];
    const origin = getSiteOrigin(req);
    const dates = await getSitemapDates(podcast);
    const entries = [
      getSitemapUrl({
        location: origin,
        lastModified: dates.home,
        priority: '1.0',
        changeFrequency: 'weekly',
        image: getAbsoluteUrl(origin, '/assets/anchev-films-social.jpg'),
        imageTitle: `${SITE_NAME} film production in Athens`
      }),
      getSitemapUrl({
        location: getAbsoluteUrl(origin, '/studio'),
        lastModified: dates.home,
        priority: '0.8',
        changeFrequency: 'monthly',
        image: getAbsoluteUrl(origin, '/media/experience/studio-poster.jpg'),
        imageTitle: 'Anchev Studio production space'
      }),
      ...[...servicePages.flatMap((page) => ['en', 'el'].map((language) => getServicePath(page, language))), '/el/studio']
        .map((pathname) => getSitemapUrl({ location: getAbsoluteUrl(origin, pathname), lastModified: dates.home, priority: '0.8', changeFrequency: 'monthly' })),
      ...(podcast?.episodes || []).map((episode) => getSitemapUrl({
        location: getAbsoluteUrl(origin, getPodcastEpisodePath(episode)),
        lastModified: dates.home, priority: '0.6', changeFrequency: 'monthly',
        image: episode.image || podcast.cover, imageTitle: episode.title
      })),
      ...projects
        .filter((project) => project.id)
        .map((project) => getSitemapUrl({
          location: getAbsoluteUrl(origin, `/work/${encodeURIComponent(project.id)}`),
          lastModified: dates.projects,
          priority: '0.8',
          changeFrequency: 'monthly',
          image: getAbsoluteUrl(origin, project.thumbnail),
          imageTitle: project.name
        }))
    ];
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/xml').send([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...entries,
      '</urlset>'
    ].join('\n'));
  } catch (_error) {
    res.status(500).type('text/plain').send('Unable to render sitemap.');
  }
});

app.get(/^\/work\/[^/]+\/$/, (req, res) => res.redirect(301, `${req.path.slice(0, -1)}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
app.get(/^\/podcast\/[^/]+\/$/, (req, res) => res.redirect(301, `${req.path.slice(0, -1)}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
app.get(/^\/(?:el\/)?(?:services\/[^/]+|studio)\/$/, (req, res) => res.redirect(301, `${req.path.slice(0, -1)}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
app.get(['/', '/index.html', '/work/:id', '/studio', '/services/:slug', '/el/services/:slug', '/el/studio'], renderSeoPage);
app.get(['/project', '/project.html'], (_req, res) => res.redirect(301, '/'));
app.use('/uploads', express.static(uploadsDir, { dotfiles: 'deny', fallthrough: false, maxAge: 0 }));
app.use(servePublicFiles);

app.get('*', renderSeoPage);

app.use((error, _req, res, _next) => {
  if (res.headersSent) return _next(error);
  const status = error instanceof ZodError ? 400 : error.code === 'LIMIT_FILE_SIZE' ? 413 : error.code?.startsWith('SQLITE_CONSTRAINT') ? 409 : error.status || 500;
  const requestId = crypto.randomUUID();
  if (status >= 500) console.error(JSON.stringify({ event: 'request.error', requestId, code: error.code || error.name }));
  const message = error instanceof ZodError ? error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') : status === 413 ? 'File or request is too large.' : status === 409 ? error.code ? 'This record conflicts with an existing entry.' : error.message : status < 500 ? error.message : 'The request could not be completed.';
  res.status(status).json({ error: message, requestId });
});

const listener = app.listen(port, process.env.HOST || '127.0.0.1', () => {
  const actualPort = listener.address().port;
  console.log(`Anchev Films is running at http://localhost:${actualPort}`);
  process.send?.({ port: actualPort });
});
const shutdown = async () => {
  await media.stop();
  listener.close(() => { store.close(); process.exit(0); });
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
