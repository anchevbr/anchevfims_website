export const setupCinema = () => {
  if (document.body.dataset.cinemaBound) return;
  document.body.dataset.cinemaBound = 'true';
  const menu = document.getElementById('cinema-menu');
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
  document.querySelectorAll('[data-news-category]').forEach((button) => button.addEventListener('click', () => {
    const category = button.dataset.newsCategory;
    document.querySelectorAll('[data-news-category]').forEach((control) => control.setAttribute('aria-pressed', String(control === button)));
    let count = 0;
    document.querySelectorAll('[data-news-item]').forEach((article) => { article.hidden = Boolean(category && article.dataset.newsItem !== category); if (!article.hidden) count++; });
    document.getElementById('news-filter-status').textContent = `${count}`;
  }));
  if (!document.querySelector('.opening-sequence')) {
    const cards = [...document.querySelectorAll('.film-card')];
    const search = document.getElementById('work-search'); const category = document.getElementById('work-category');
    const filter = () => {
      let visible = 0;
      for (const card of cards) {
        card.hidden = !card.textContent.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()) || Boolean(category.value && card.dataset.category !== category.value);
        if (!card.hidden) visible++;
      }
      document.getElementById('work-filter-status').textContent = `${visible} / ${cards.length}`;
      document.getElementById('work-no-results').hidden = visible > 0;
    };
    if (search && category) { search.addEventListener('input', filter); category.addEventListener('change', filter); }
    document.querySelectorAll('[data-project-preview]').forEach((video) => {
      const link = video.closest('a');
      const play = () => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover)').matches) return;
        if (!video.src) video.src = video.dataset.src;
        video.play().catch(() => {});
      };
      const pause = () => video.pause();
      link.addEventListener('pointerenter', play); link.addEventListener('pointerleave', pause);
      link.addEventListener('focusin', play); link.addEventListener('focusout', pause);
      document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    });
  }
  const images = [...document.querySelectorAll('[data-gallery-image]')];
  if (!images.length) return;
  const greek = document.documentElement.lang === 'el';
  const viewer = document.createElement('dialog'); viewer.className = 'cinema-gallery'; viewer.setAttribute('aria-label', greek ? 'Συλλογή εικόνων' : 'Image gallery');
  viewer.innerHTML = `<button type="button" class="cinema-gallery__close" aria-label="${greek ? 'Κλείσιμο' : 'Close'}">&times;</button><figure><img alt="" /><figcaption></figcaption></figure><div class="cinema-gallery__controls"><button type="button" aria-label="${greek ? 'Προηγούμενη εικόνα' : 'Previous image'}">&larr;</button><span aria-live="polite"></span><button type="button" aria-label="${greek ? 'Επόμενη εικόνα' : 'Next image'}">&rarr;</button></div>`;
  document.body.append(viewer); let index = 0; let opener = null;
  const show = (next) => {
    index = (next + images.length) % images.length;
    const image = images[index].querySelector('img');
    viewer.querySelector('img').src = images[index].href; viewer.querySelector('img').alt = image.alt;
    viewer.querySelector('figcaption').textContent = image.alt;
    viewer.querySelector('[aria-live]').textContent = `${index + 1} / ${images.length}`;
    if (!viewer.open) viewer.showModal();
  };
  images.forEach((link, position) => link.addEventListener('click', (event) => { event.preventDefault(); opener = link; show(position); }));
  viewer.addEventListener('close', () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  viewer.querySelector('.cinema-gallery__close').addEventListener('click', () => viewer.close());
  const controls = viewer.querySelectorAll('.cinema-gallery__controls button');
  controls[0].addEventListener('click', () => show(index - 1)); controls[1].addEventListener('click', () => show(index + 1));
  viewer.addEventListener('keydown', (event) => { if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); } if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); } });
  viewer.addEventListener('click', (event) => { if (event.target === viewer) viewer.close(); });
};