/* Drawer add-ons use explicit Variant IDs. A rejected request can be retried;
 * an uncertain transport result must be checked in Cart before adding again. */
(() => {
  if (window.yarnCartQuickAdd) return;
  window.yarnCartQuickAdd = true;
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cart-quick-add]');
    if (!button || button.disabled) return;
    const drawer = document.querySelector('cart-drawer');
    const status = document.querySelector('[data-cart-quick-status]');
    const cartLink = document.querySelector('[data-cart-quick-review]');
    const cartUrl = cartLink?.href || window.routes?.cart_url || '/cart';
    const body = { items: [{ id: Number(button.dataset.cartQuickAdd), quantity: 1 }] };
    if (drawer) {
      body.sections = drawer.getSectionsToRender().map((section) => section.id);
      body.sections_url = window.location.pathname;
      drawer.setActiveElement?.(button);
    }
    if (status) { status.hidden = true; status.textContent = ''; }
    if (cartLink) cartLink.hidden = true;
    button.disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let confirmed = false;
    let rejected = false;
    let description = '';
    try {
      const root = window.routes?.cart_add_url || '/cart/add';
      const response = await fetch(`${root}.js`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      confirmed = response.ok;
      rejected = response.status >= 400 && response.status < 500;
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        description = typeof result.description === 'string' ? result.description : '';
        throw new Error('Cart request failed');
      }
      if (drawer && drawer.getSectionsToRender().every(section => result.sections?.[section.id])) {
        drawer.classList.remove('is-empty');
        drawer.renderContents({ ...result, id: body.items[0].id });
      } else window.location.assign(cartUrl);
    } catch {
      if (confirmed) { window.location.assign(cartUrl); return; }
      button.disabled = !rejected;
      if (status) {
        status.textContent = rejected ? `${status.dataset.error} ${description}`.trim() : status.dataset.uncertain;
        status.hidden = false;
      }
      if (cartLink) cartLink.hidden = rejected;
    } finally { clearTimeout(timeout); }
  });
})();
