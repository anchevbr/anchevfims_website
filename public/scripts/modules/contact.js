import { siteContent } from '/scripts/content.js';
import { safeSocialProfileUrl } from '/scripts/modules/content-markup.js';

const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#039;',
  '"': '&quot;'
}[character]));

export const renderContact = () => {
  const email = String(siteContent.contact.email || '').trim();
  const phone = String(siteContent.contact.phone || '').trim();
  const location = String(siteContent.contact.location || '').trim();
  const social = Array.isArray(siteContent.contact.social) ? siteContent.contact.social : [];
  const panelRoot = document.getElementById('panel-content-contact');
  const contactRoot = document.getElementById('contact-page-content');
  const socialLinks = social
    .map((item) => {
      const href = safeSocialProfileUrl(item.href);
      return href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`
        : '';
    })
    .join('');

  if (panelRoot) panelRoot.innerHTML = `
    <div class="ctp-header">
      <span class="ctp-eyebrow">Start a Project</span>
      <span class="ctp-rule"></span>
    </div>
    <div class="ctp-hero">
      <h2 class="ctp-title">Bring us<br><em>the brief.</em></h2>
    </div>
    <div class="ctp-divider"></div>
    <div class="contact-grid">
      <a class="contact-card" href="mailto:${escapeHtml(email)}">
        <span>Email</span>
        <strong>${escapeHtml(email)}</strong>
      </a>
      <a class="contact-card" href="tel:${escapeHtml(phone.replace(/\s+/g, ''))}">
        <span>Phone</span>
        <strong>${escapeHtml(phone)}</strong>
      </a>
      <div class="contact-card">
        <span>Base</span>
        <strong>${escapeHtml(location)}</strong>
      </div>
    </div>
    <div class="ctp-social">
      ${socialLinks}
    </div>
  `;

  if (contactRoot) contactRoot.innerHTML = `
    <div class="contact-final">
      <div>
        <p class="contact-final__eyebrow">Start a project / Athens to worldwide</p>
        <h2 class="contact-final__title">Have something<br>in mind?<br><em>Let's make it.</em></h2>
      </div>
      <div class="contact-final__details">
        <div>
          <p class="contact-final__meta">Email</p>
          <a href="mailto:${escapeHtml(email)}" data-film-cursor data-cursor-kind="contact" data-cursor-label="Let's Talk">${escapeHtml(email)}</a>
        </div>
        <div>
          <p class="contact-final__meta">Telephone</p>
          <a href="tel:${escapeHtml(phone.replace(/\s+/g, ''))}">${escapeHtml(phone)}</a>
        </div>
        <div>
          <p class="contact-final__meta">Available worldwide</p>
          <strong>${escapeHtml(location)}</strong>
        </div>
        <div class="contact-final__socials">${socialLinks}</div>
      </div>
    </div>
  `;
};
