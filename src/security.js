import { fileTypeFromFile } from 'file-type';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

const mediaTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime'
]);

export const inspectUpload = async (filePath) => {
  const type = await fileTypeFromFile(filePath);
  if (!type || !mediaTypes.has(type.mime)) {
    throw Object.assign(new Error('Upload a supported image or video file.'), { status: 415 });
  }
  return type;
};

export const safeUrl = (value, local = true) => {
  const source = String(value || '').trim();
  if (!source) return '';
  if (local && source.startsWith('/') && !source.startsWith('//')) {
    try {
      const decoded = decodeURIComponent(source);
      if (/[\\\x00-\x1f]/.test(decoded) || decoded.split('/').includes('..')) return '';
      return source;
    } catch {
      return '';
    }
  }
  try {
    const url = new URL(source);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
};

export const text = z.string().trim().max(20000);
export const assetUrl = z.string().max(2048).refine((value) => !value || Boolean(safeUrl(value)), 'Invalid media URL');
export const externalUrl = z.string().max(2048).refine((value) => !value || Boolean(safeUrl(value, false)), 'Use an HTTP or HTTPS URL');
export const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/);

export const sanitizeNewsContent = (html) => sanitizeHtml(html, {
  allowedTags: ['p', 'h2', 'h3', 'strong', 'em', 'u', 's', 'blockquote', 'ol', 'ul', 'li', 'a', 'figure', 'figcaption', 'img', 'br'],
  allowedAttributes: { a: ['href', 'title', 'rel'], img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'] },
  allowedSchemes: ['https', 'http'],
  allowProtocolRelative: false,
  transformTags: {
    a: (_tag, attributes) => ({ tagName: 'a', attribs: { href: safeUrl(attributes.href), rel: 'noopener noreferrer' } }),
    img: (_tag, attributes) => ({ tagName: 'img', attribs: { src: safeUrl(attributes.src), alt: String(attributes.alt || '').slice(0, 250), loading: 'lazy', decoding: 'async' } })
  },
  exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src
});

export const permissions = {
  owner: new Set(['read', 'write', 'publish', 'media', 'inquiries', 'settings', 'users']),
  administrator: new Set(['read', 'write', 'publish', 'media', 'inquiries', 'settings']),
  editor: new Set(['read', 'write', 'media']),
  viewer: new Set(['read'])
};

export const can = (role, permission) => permissions[role]?.has(permission) || false;