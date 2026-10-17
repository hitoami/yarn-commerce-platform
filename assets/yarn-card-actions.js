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

  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2s-7.6-4.5-9.3-9.3C1.5 7.5 3.7 4.3 7.1 4.3c2.1 0 3.7 1.2 4.9 3 1.2-1.8 2.8-3 4.9-3 3.4 0 5.6 3.2 4.4 6.6-1.7 4.8-9.3 9.3-9.3 9.3z"/></svg>';

  // A yarn-coloured dot drops from the card button into the header cart icon (#175: a heart for favorites).
  function fly(from, to, kind = 'cart') {
    const target = to?.querySelector('.svg-wrapper') || to;
    if (reduceMotion() || !from || !target || !target.getClientRects().length) return Promise.resolve();
    const a = from.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (b.bottom < 0 || b.top > window.innerHeight) return Promise.resolve();
    const x0 = a.left + a.width / 2; const y0 = a.top + a.height / 2;
    const x1 = b.left + b.width / 2; const y1 = b.top + b.height / 2;
    const peak = Math.min(y0, y1) - 80;
    const dot = document.createElement('span');
    dot.className = kind === 'heart' ? 'yx-cart-dot yx-cart-dot--heart' : 'yx-cart-dot';
    if (kind === 'heart') dot.innerHTML = HEART;
    document.body.appendChild(dot);
    const animation = dot.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
      { transform: `translate(${(x0 + x1) / 2}px, ${peak}px) scale(1.1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.4)`, opacity: 0.6 },
    ], { duration: 720, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' });
    return animation.finished.catch(() => {}).finally(() => dot.remove());
  }

  // #175: the favorites page pairs the add button with a quantity stepper.
  function quantityFor(button) {
    const input = button.closest('[data-card-buy]')?.querySelector('[data-card-qty]');
    const value = Math.floor(Number(input?.value));
    return Number.isFinite(value) && value >= 1 ? Math.min(value, 99) : 1;
  }

  function step(control) {
    const input = control.closest('[data-card-buy]')?.querySelector('[data-card-qty]');
    if (!input) return;
    const next = Math.min(99, Math.max(1, (Math.floor(Number(input.value)) || 1) + Number(control.dataset.qtyStep)));
    input.value = String(next);
    syncSteppers(input);
  }

  function syncSteppers(input) {
    const value = Math.floor(Number(input.value)) || 1;
    input.closest('[data-card-buy]')?.querySelectorAll('[data-qty-step]').forEach((control) => {
      control.disabled = Number(control.dataset.qtyStep) < 0 ? value <= 1 : value >= 99;
    });
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
          items: [{ id: Number(button.dataset.cardAdd), quantity: quantityFor(button) }],
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
    const stepper = event.target.closest?.('[data-qty-step]');
    if (stepper) { event.preventDefault(); step(stepper); return; }
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

  document.addEventListener('change', (event) => {
    const input = event.target.closest?.('[data-card-qty]');
    if (!input) return;
    input.value = String(Math.min(99, Math.max(1, Math.floor(Number(input.value)) || 1)));
    syncSteppers(input);
  });

  // #175: a saved favorite flies into the header heart; any change makes the header heart bump.
  document.addEventListener('yarn:favorite-toggled', (event) => {
    const header = Array.from(document.querySelectorAll('[data-favorites-header]')).find((link) => link.getClientRects().length);
    if (!header) return;
    const landing = event.detail?.saved ? fly(event.detail.button, header, 'heart') : Promise.resolve();
    landing.then(() => bump(header));
  });
})();
