// Home "pick yarn" band: accessible tabs (arrow keys move between tabs) and desktop page arrows for the visible strip.
(() => {
  const init = (root) => {
    if (root.dataset.entriesReady) return;
    root.dataset.entriesReady = 'true';
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const arrows = root.querySelector('[data-entries-arrows]');
    const prev = root.querySelector('[data-entries-prev]');
    const next = root.querySelector('[data-entries-next]');
    const totals = root.querySelectorAll('[data-entries-total]');
    const scroller = () => root.querySelector('.yarn-entries__panel:not([hidden]) [data-entries-scroller]');

    const sync = () => {
      const el = scroller();
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      arrows.hidden = max <= 1;
      prev.disabled = el.scrollLeft <= 1;
      next.disabled = el.scrollLeft >= max - 1;
    };

    const select = (tab) => {
      tabs.forEach((other) => {
        const on = other === tab;
        other.setAttribute('aria-selected', String(on));
        other.tabIndex = on ? 0 : -1;
        const panel = root.querySelector(`#${other.getAttribute('aria-controls')}`);
        panel.hidden = !on;
        if (on) totals.forEach((total) => { total.textContent = panel.dataset.total; });
      });
      sync();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const target = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(target);
        target.focus();
      });
    });

    // One page is the visible width minus one card, so the last card of a page leads the next one.
    const page = (dir) => {
      const el = scroller();
      const card = el?.querySelector('li');
      if (!el || !card) return;
      el.scrollBy({ left: dir * Math.max(card.offsetWidth, el.clientWidth - card.offsetWidth) });
    };
    prev.addEventListener('click', () => page(-1));
    next.addEventListener('click', () => page(1));
    root.querySelectorAll('[data-entries-scroller]').forEach((el) => el.addEventListener('scroll', sync, { passive: true }));
    new ResizeObserver(sync).observe(root);
    sync();
  };
  const initAll = () => document.querySelectorAll('[data-yarn-entries]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
  document.addEventListener('shopify:section:load', initAll);
})();
