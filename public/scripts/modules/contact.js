import { siteContent } from '/scripts/content.js';
import { safeSocialProfileUrl, renderContactPageMarkup } from '/scripts/modules/content-markup.js';
import { copy, locale } from '/scripts/modules/localization.js';

const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#039;',
  '"': '&quot;'
}[character]));

export const renderContact = () => {
  const words = copy();
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
      <span class="ctp-eyebrow">${words.startProject}</span>
      <span class="ctp-rule"></span>
    </div>
    <div class="ctp-hero">
      <h2 class="ctp-title">${words.contactTitle}</h2>
    </div>
    <div class="ctp-divider"></div>
    <div class="contact-grid">
      <a class="contact-card" href="mailto:${escapeHtml(email)}">
        <span>${words.email}</span>
        <strong>${escapeHtml(email)}</strong>
      </a>
      <a class="contact-card" href="tel:${escapeHtml(phone.replace(/\s+/g, ''))}">
        <span>${words.phone}</span>
        <strong>${escapeHtml(phone)}</strong>
      </a>
      <div class="contact-card">
        <span>${words.base}</span>
        <strong>${escapeHtml(location)}</strong>
      </div>
    </div>
    <div class="ctp-social">
      ${socialLinks}
    </div>
  `;

  if (contactRoot && !contactRoot.childElementCount) contactRoot.innerHTML = renderContactPageMarkup({ ...siteContent.contact, social }, locale());
  const form = document.getElementById('inquiry-form');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (document.documentElement.hasAttribute('data-settings-preview')) return;
    const words = copy();
    const submit = form.querySelector('[type="submit"]');
    const status = document.getElementById('inquiry-status');
    submit.disabled = true;
    submit.textContent = words.sending;
    status.textContent = '';
    try {
      const values = Object.fromEntries(new FormData(form));
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...values, privacy: form.elements.privacy.checked, locale: locale() }) });
      if (!response.ok) throw new Error(words.error);
      status.textContent = words.success;
      form.reset();
      window.dispatchEvent(new CustomEvent('anchev:inquiry-received'));
    } catch {
      status.textContent = words.error;
    } finally { submit.disabled = false; submit.textContent = words.send; }
  });
};
