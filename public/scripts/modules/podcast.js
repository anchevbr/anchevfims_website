import {
  renderPodcastEpisodesMarkup,
  safeExternalUrl
} from '/scripts/modules/content-markup.js';

const SPOTIFY_SHOW_URL = 'https://open.spotify.com/show/2f9bhw76eO5EWttGU6IVuV';

const updatePlayButton = (button, isPlaying) => {
  if (!button) return;
  button.classList.toggle('is-playing', isPlaying);
  button.setAttribute('aria-label', `${isPlaying ? 'Pause' : 'Play'} ${button.dataset.episodeTitle}`);
};

const bindEpisodePlayback = (root) => {
  const player = new Audio();
  let activeButton = null;

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-podcast-play]');
    if (!button) return;

    if (button === activeButton && !player.paused) {
      player.pause();
      return;
    }

    if (activeButton !== button) {
      updatePlayButton(activeButton, false);
      activeButton = button;
      player.src = button.dataset.audioUrl;
    }

    try {
      await player.play();
      updatePlayButton(activeButton, true);
    } catch (_error) {
      updatePlayButton(activeButton, false);
    }
  });

  player.addEventListener('pause', () => updatePlayButton(activeButton, false));
  player.addEventListener('ended', () => updatePlayButton(activeButton, false));
};

export const renderPodcast = async () => {
  const root = document.getElementById('podcast-episodes-list');
  if (!root) return;

  try {
    const response = await fetch('/api/podcast');
    if (!response.ok) throw new Error('Unable to load podcast episodes.');

    const podcast = await response.json();
    const episodes = Array.isArray(podcast.episodes) ? podcast.episodes : [];
    const spotifyUrl = safeExternalUrl(podcast.spotifyUrl) || SPOTIFY_SHOW_URL;
    const cover = document.getElementById('podcast-cover');
    const coverUrl = safeExternalUrl(podcast.cover);
    if (cover && coverUrl) {
      cover.loading = 'eager';
      cover.src = coverUrl;
    }

    root.innerHTML = renderPodcastEpisodesMarkup({ ...podcast, episodes, spotifyUrl });
    bindEpisodePlayback(root);
  } catch (_error) {
    root.innerHTML = `<p class="podcast-episodes__status">Episodes are available on <a href="${SPOTIFY_SHOW_URL}" target="_blank" rel="noreferrer">Spotify</a>.</p>`;
  } finally {
    root.setAttribute('aria-busy', 'false');
  }
};