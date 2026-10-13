import { siteContent } from '/scripts/content.js';
import { renderClientsMarkup } from '/scripts/modules/content-markup.js?v=20261006-index';

export const renderClients = async () => {
  const root = document.getElementById('clients-field');
  if (!root) return;

  let clients = siteContent.clients;
  try {
    const res = await fetch('/api/clients');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.clients) && data.clients.length) clients = data.clients;
    }
  } catch (_err) {}

  root.innerHTML = renderClientsMarkup(clients);
};
