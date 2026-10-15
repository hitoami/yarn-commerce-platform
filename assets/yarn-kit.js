/* Yarn set page (#131): add one yarn row, or every available row at once, to the Shopify cart.
 * One request per click (Cart AJAX /cart/add.js with items[]); the cart drawer refreshes from the same response.
 * 4xx means Shopify rejected the add. 5xx or a network error is ambiguous, so the buttons lock and we ask
 * the customer to check the cart instead of retrying a request that may already have been accepted. */
class YarnKitBuy extends HTMLElement {
  connectedCallback() {
    if (this.dataset.enhanced) return;
    this.dataset.enhanced = 'true';
    this.status = this.querySelector('[data-kit-status]');
    this.cartLink = this.querySelector('[data-kit-cart]');
    this.addEventListener('click', (event) => {
      const button = event.target.closest('[data-kit-add]');
      if (!button || button.disabled) return;
      const rows = button.dataset.kitAdd === 'row' ? [button.closest('[data-kit-row]')] : [...this.querySelectorAll('[data-kit-row]')];
      this.add(rows, button);
    });
  }

  items(rows) {
    return rows
      .filter((row) => row && row.dataset.available === 'true')
      .map((row) => ({
        id: Number(row.dataset.variant),
        quantity: Math.max(1, Math.round(Number(row.querySelector('[data-kit-qty]')?.value) || 1)),
        properties: { _Kit: this.dataset.kit, '_Kit handle': this.dataset.kitHandle },
      }));
  }

  async add(rows, button) {
    if (this.busy || this.uncertain) return;
    const items = this.items(rows);
    if (!items.length) return;
    const drawer = document.querySelector('cart-drawer');
    const label = button.textContent;
    this.busy = true;
    button.disabled = true;
    button.textContent = this.dataset.pending;
    this.status.hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const body = { items };
    if (drawer) {
      body.sections = drawer.getSectionsToRender().map((section) => section.id);
      body.sections_url = window.location.pathname;
      drawer.setActiveElement(button);
    }
    let confirmed = false;
    try {
      const response = await fetch(`${this.dataset.addUrl}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok && response.status >= 500) throw new Error('uncertain');
      const result = await response.json();
      if (!response.ok) {
        this.status.textContent = `${this.dataset.error} ${typeof result.description === 'string' ? result.description : ''}`;
      } else {
        confirmed = true;
        this.status.textContent = this.dataset.success;
        if (drawer && drawer.getSectionsToRender().every((section) => result.sections?.[section.id])) {
          drawer.renderContents(result);
        } else if (drawer) {
          window.location.assign(this.cartLink.href);
        }
      }
    } catch {
      if (confirmed) {
        window.location.assign(this.cartLink.href);
      } else {
        this.uncertain = true;
        this.status.textContent = this.dataset.uncertain;
        this.querySelectorAll('[data-kit-add]').forEach((other) => { other.disabled = true; });
      }
    } finally {
      clearTimeout(timeout);
      this.busy = false;
      button.disabled = Boolean(this.uncertain);
      button.textContent = label;
      this.status.hidden = false;
      this.cartLink.hidden = false;
    }
  }
}

if (!customElements.get('yarn-kit-buy')) customElements.define('yarn-kit-buy', YarnKitBuy);
