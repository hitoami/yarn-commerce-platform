// Keep shopper state when choosing a language; request-only pagination/section
// parameters must not turn the destination into a partial HTML response.
(() => {
  const KEYS = new Set(['q', 'group', 'browse', 'sort_by', 'variant', 'preview_theme_id',
    'ycb_view', 'ycb_weight', 'ycb_beginner', 'ycb_cmp', 'ycb_here']);
  function languageUrl(href, currentHref) {
    const current = new URL(currentHref);
    const target = new URL(href, current);
    if (target.origin !== current.origin) return href;
    target.search = '';
    for (const [key, value] of current.searchParams) {
      if (KEYS.has(key) || key.startsWith('filter.')) target.searchParams.append(key, value);
    }
    return target.href;
  }
  if (typeof module !== 'undefined') module.exports = { languageUrl };
  if (typeof document === 'undefined') return;
  const selector = '.yarn-lang__option[hreflang], localization-form a[hreflang]';
  function refresh(link) {
    link.dataset.languagePath ||= link.getAttribute('href');
    link.href = languageUrl(link.dataset.languagePath, window.location.href);
  }
  function refreshAll() { document.querySelectorAll(selector).forEach(refresh); }
  refreshAll();
  // Read the URL at activation: filters and variant selection use history.replaceState.
  for (const type of ['click', 'auxclick', 'pointerdown', 'focusin']) {
    document.addEventListener(type, event => {
      const link = event.target.closest(selector);
      if (link) refresh(link);
    }, true);
  }
  window.addEventListener('popstate', refreshAll);
})();
