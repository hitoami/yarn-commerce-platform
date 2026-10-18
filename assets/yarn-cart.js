/* #182 v2 cart drawer add-ons ("keep one spare ball", "top up to free shipping"): add one unit through the Cart AJAX API
 * and re-render the drawer from the same response, like Rise's product form. Prices and stock stay in Shopify. */
(() => {
  if (window.yarnCartQuickAdd) return;
  window.yarnCartQuickAdd = true;
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cart-quick-add]');
    if (!button || button.disabled) return;
    const drawer = document.querySelector('cart-drawer');
    const status = document.querySelector('[data-cart-quick-status]');
    const body = { items: [{ id: Number(button.dataset.cartQuickAdd), quantity: 1 }] };
    if (drawer) {
      body.sections = drawer.getSectionsToRender().map((section) => section.id);
      body.sections_url = window.location.pathname;
    }
    button.disabled = true;
    try {
      const root = window.routes?.cart_add_url || '/cart/add';
      const response = await fetch(`${root}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.description === 'string' ? result.description : '');
      if (drawer && result.sections) {
        drawer.classList.remove('is-empty');
        drawer.renderContents({ ...result, id: body.items[0].id });
      } else {
        window.location.reload();
      }
    } catch (error) {
      button.disabled = false;
      if (status) status.textContent = `${status.dataset.error} ${error.message}`.trim();
    }
  });
})();
