// #153 Product card actions: add a single-variant product to the Shopify Cart without leaving the page,
// and give the favorite heart a tactile pop. Favorite state itself stays with yarn-favorites.js.
(function () {
  const ADDED_MS = 2400;
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let live;

  function announce(message) {
    if (!live) {
      live = document.createElement('p');
      live.className = 'visually-hidden';
      live.setAttribute('role', 'status');
      document.body.appendChild(live);
    }
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = message; });
  }

  function sectionInner(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector)?.innerHTML;
  }

  // Refresh the header bubble and the drawer contents the way Rise does, without opening the drawer.
  function renderCart(sections) {
    const bubble = document.getElementById('cart-icon-bubble');
    const bubbleHtml = sections?.['cart-icon-bubble'] && sectionInner(sections['cart-icon-bubble'], '.shopify-section');
    if (bubble && bubbleHtml) bubble.innerHTML = bubbleHtml;
    const drawer = document.querySelector('cart-drawer');
    const drawerHtml = sections?.['cart-drawer'] && sectionInner(sections['cart-drawer'], '#CartDrawer');
    const drawerTarget = document.getElementById('CartDrawer');
    if (drawer && drawerTarget && drawerHtml) {
      drawerTarget.innerHTML = drawerHtml;
      drawer.classList.remove('is-empty');
      drawer.querySelector('.drawer__inner')?.classList.remove('is-empty');
      drawer.querySelector('#CartDrawer-Overlay')?.addEventListener('click', () => drawer.close());
    }
    return bubble;
  }

  function bump(bubble) {
    if (!bubble) return;
    bubble.classList.remove('is-bumping');
    void bubble.offsetWidth;
    bubble.classList.add('is-bumping');
    setTimeout(() => bubble.classList.remove('is-bumping'), 600);
  }

  // A yarn-coloured dot drops from the card button into the header cart icon.
  function fly(from, to) {
    const target = to?.querySelector('.svg-wrapper') || to;
    if (reduceMotion() || !target || !target.getClientRects().length) return Promise.resolve();
    const a = from.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (b.bottom < 0 || b.top > window.innerHeight) return Promise.resolve();
    const x0 = a.left + a.width / 2; const y0 = a.top + a.height / 2;
    const x1 = b.left + b.width / 2; const y1 = b.top + b.height / 2;
    const peak = Math.min(y0, y1) - 80;
    const dot = document.createElement('span');
    dot.className = 'yx-cart-dot';
    document.body.appendChild(dot);
    const animation = dot.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
      { transform: `translate(${(x0 + x1) / 2}px, ${peak}px) scale(1.1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.4)`, opacity: 0.6 },
    ], { duration: 720, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' });
    return animation.finished.catch(() => {}).finally(() => dot.remove());
  }

  async function add(button) {
    if (button.dataset.state === 'loading') return;
    clearTimeout(button.yxTimer);
    button.dataset.state = 'loading';
    button.setAttribute('aria-busy', 'true');
    try {
      const root = window.Shopify?.routes?.root || '/';
      const response = await fetch(`${root}cart/add.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: [{ id: Number(button.dataset.cardAdd), quantity: 1 }],
          sections: 'cart-drawer,cart-icon-bubble',
          sections_url: window.location.pathname,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.description || data.message || '');
      button.dataset.state = 'added';
      announce(button.dataset.added);
      const bubble = document.getElementById('cart-icon-bubble');
      fly(button, bubble).then(() => bump(renderCart(data.sections)));
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'yarn-card', productVariantId: button.dataset.cardAdd });
      }
      button.yxTimer = setTimeout(() => { button.dataset.state = 'idle'; }, ADDED_MS);
    } catch (error) {
      button.dataset.state = 'error';
      announce(error.message || button.dataset.error);
      button.yxTimer = setTimeout(() => { button.dataset.state = 'idle'; }, 600);
    } finally {
      button.removeAttribute('aria-busy');
    }
  }

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest?.('[data-card-add]');
    if (addButton) { event.preventDefault(); add(addButton); return; }
    const heart = event.target.closest?.('.yx-card-fav');
    if (heart) {
      heart.classList.remove('is-popping');
      void heart.offsetWidth;
      heart.classList.add('is-popping');
      setTimeout(() => heart.classList.remove('is-popping'), 600);
    }
  });
})();
