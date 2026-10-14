export const setupLanguagePreference = () => {
  document.querySelectorAll('.language-switch a').forEach((link) => {
    link.addEventListener('click', () => {
      try { localStorage.setItem('anchev-language', link.lang); } catch {}
    });
  });
};