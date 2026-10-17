/* #85 毛线目录：筛选抽屉、排序与「显示更多」。没有 JS 时，表单与链接按原生 GET 直接跳转。 */
(() => {
  const PRICE_KEYS = ['filter.v.price.gte', 'filter.v.price.lte'];

  // A price band replaces both bounds; "any price" clears them. Other filters stay as submitted.
  function applyBand(params, band) {
    const next = new URLSearchParams(params);
    PRICE_KEYS.forEach((key) => next.delete(key));
    new URLSearchParams(band || '').forEach((value, key) => { if (PRICE_KEYS.includes(key)) next.set(key, value); });
    next.delete('ycb_price');
    next.delete('page');
    return next;
  }

  // The band matching the current URL, comparing numbers because Shopify rewrites 500 as 500.0.
  function activeBand(params, bands) {
    const same = (band) => PRICE_KEYS.every((key) => {
      const a = params.get(key);
      const b = new URLSearchParams(band).get(key);
      return a === null || b === null ? a === b : Number(a) === Number(b);
    });
    return bands.find(same) ?? null;
  }

  // Only same-origin pages of this collection may be appended.
  function nextPageUrl(href, currentHref) {
    const url = new URL(href, currentHref);
    const current = new URL(currentHref);
    if (url.origin !== current.origin || url.pathname !== current.pathname) throw new Error('Invalid collection page URL');
    const preview = current.searchParams.get('preview_theme_id');
    if (preview) url.searchParams.set('preview_theme_id', preview);
    return url;
  }

  if (typeof module !== 'undefined') module.exports = { applyBand, activeBand, nextPageUrl };
  if (typeof document === 'undefined') return;

  function connect(root) {
    root.querySelectorAll('[data-ycb]').forEach((section) => {
      if (section.dataset.connected) return;
      section.dataset.connected = 'true';
      const drawer = section.querySelector('[data-ycb-drawer]');
      const filterForm = section.querySelector('[data-ycb-filter-form]');
      const current = new URLSearchParams(window.location.search);

      section.querySelector('[data-ycb-open]')?.addEventListener('click', () => drawer?.showModal());
      section.querySelector('[data-ycb-close]')?.addEventListener('click', () => drawer?.close());
      drawer?.addEventListener('click', (event) => { if (event.target === drawer) drawer.close(); });

      const bands = Array.from(section.querySelectorAll('[data-ycb-band]'));
      const active = activeBand(current, bands.map((input) => input.value).filter(Boolean));
      bands.forEach((input) => { input.checked = active ? input.value === active : !input.value; });

      filterForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const params = new URLSearchParams(new FormData(filterForm));
        const band = filterForm.querySelector('[data-ycb-band]:checked')?.value || '';
        const next = applyBand(params, band);
        if (current.has('preview_theme_id')) next.set('preview_theme_id', current.get('preview_theme_id'));
        window.location.assign(`${filterForm.getAttribute('action')}${next.size ? `?${next}` : ''}`);
      });

      const sort = section.querySelector('[data-ycb-sort]');
      sort?.addEventListener('change', () => sort.form.requestSubmit());

      const grid = section.querySelector('[data-ycb-grid]');
      const status = section.querySelector('[data-ycb-status]');
      section.querySelector('[data-ycb-more]')?.addEventListener('click', async (event) => {
        const link = event.target.closest('[data-ycb-next]');
        if (!link || !grid) return;
        event.preventDefault();
        link.setAttribute('aria-busy', 'true');
        try {
          const url = nextPageUrl(link.getAttribute('href'), window.location.href);
          url.searchParams.set('section_id', section.dataset.sectionId);
          const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
          if (!response.ok) throw new Error('Collection page failed');
          const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
          const items = doc.querySelectorAll('[data-ycb-grid] > li');
          if (!items.length) throw new Error('Collection page is empty');
          const added = Array.from(items, (item) => document.importNode(item, true));
          grid.append(...added);
          const nextStatus = doc.querySelector('[data-ycb-status]');
          if (status && nextStatus) status.textContent = nextStatus.textContent;
          const nextLink = doc.querySelector('[data-ycb-next]');
          if (nextLink) link.setAttribute('href', nextLink.getAttribute('href'));
          else link.remove();
          added[0].querySelector('a')?.focus({ preventScroll: true });
        } catch (error) {
          // Fall back to a normal page load so the shopper still reaches the next products.
          window.location.assign(link.href);
        } finally {
          link.removeAttribute('aria-busy');
        }
      });
    });
  }

  connect(document);
  document.addEventListener('shopify:section:load', (event) => connect(event.target));
})();
