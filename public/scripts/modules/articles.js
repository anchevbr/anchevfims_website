import { renderArticlesMarkup } from '/scripts/modules/content-markup.js';

export const renderArticles = async () => {
  const root = document.getElementById('articles-list');
  if (!root) return;
  if (root.querySelector('article')) return;

  try {
    const response = await fetch('/api/articles');
    if (!response.ok) throw new Error('Unable to load articles.');
    const data = await response.json();
    root.innerHTML = renderArticlesMarkup(data.articles);
  } catch (_error) {
    if (!root.children.length) {
      root.innerHTML = '<p class="articles-empty">Articles are temporarily unavailable.</p>';
    }
  } finally {
    root.setAttribute('aria-busy', 'false');
  }
};