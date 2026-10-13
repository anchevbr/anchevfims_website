import { siteContent } from '/scripts/content.js';

export const renderLegalPanel = (key) => {
  const legal = siteContent.legal[key];
  const root = document.getElementById(`panel-content-${key}`);
  root.innerHTML = `
    <div class="ctp-header">
      <span class="ctp-eyebrow">${legal.kicker}</span>
      <span class="ctp-rule"></span>
    </div>
    <div class="ctp-hero">
      <h2 class="ctp-title">${legal.title}</h2>
    </div>
    <div class="ctp-divider"></div>
    <div class="legal-stack">
      ${legal.sections
        .map(
          (section) => `
            <section class="legal-section">
              <h3>${section.heading}</h3>
              <p>${section.body}</p>
            </section>
          `
        )
        .join('')}
    </div>
  `;
};
