// Home fiber / weight switch: accessible tabs (arrow keys move between tabs, only the selected tab is tabbable).
(() => {
  const init = (root) => {
    if (root.dataset.fswitchReady) return;
    root.dataset.fswitchReady = 'true';
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    if (tabs.length < 2) return;
    const select = (tab) => {
      tabs.forEach((other) => {
        const on = other === tab;
        other.setAttribute('aria-selected', String(on));
        other.tabIndex = on ? 0 : -1;
        root.querySelector(`#${other.getAttribute('aria-controls')}`).hidden = !on;
      });
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(next);
        next.focus();
      });
    });
  };
  const initAll = () => document.querySelectorAll('[data-yarn-fswitch]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
  document.addEventListener('shopify:section:load', initAll);
})();
