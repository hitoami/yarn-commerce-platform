/* Yarn set page (#131): add one yarn row, or the complete list, to the Shopify cart.
 * One request per click (Cart AJAX /cart/add.js with items[]); the cart drawer refreshes from the same response.
 * 4xx means Shopify rejected the add. 5xx or a network error is ambiguous, so the buttons lock and we ask
 * the customer to check the cart instead of retrying a request that may already have been accepted. */
class YarnKitBuy extends HTMLElement {
  connectedCallback() {
    if (this.dataset.enhanced) return;
    this.dataset.enhanced = 'true';
    this.status = this.querySelector('[data-kit-status]');
    this.cartLink = this.querySelector('[data-kit-cart]');
    this.addEventListener('change', (event) => {
      const row = event.target.closest('[data-kit-row]');
      if (!row || this.busy || this.uncertain) return;
      this.refreshRow(row);
      this.refreshTotals();
    });
    this.addEventListener('click', (event) => {
      const button = event.target.closest('[data-kit-add]');
      if (!button || button.disabled) return;
      const rows = button.dataset.kitAdd === 'row' ? [button.closest('[data-kit-row]')] : [...this.querySelectorAll('[data-kit-row]')];
      this.add(rows, button);
    });
  }

  money(cents) {
    return new Intl.NumberFormat(this.dataset.locale, { style: 'currency', currency: this.dataset.currency }).format(cents / 100);
  }

  refreshRow(row) {
    const option = row.querySelector('[data-kit-colour]')?.selectedOptions[0];
    if (option) {
      row.dataset.variant = option.value;
      row.dataset.price = option.dataset.price;
      row.dataset.available = option.dataset.available;
      row.querySelectorAll('a').forEach((link) => { link.href = option.dataset.url; });
    }
    const price = Number(row.dataset.price);
    const ready = price > 0 && row.dataset.available === 'true';
    const label = row.querySelector('[data-kit-price]');
    if (label) label.textContent = price > 0 ? this.money(price) : this.dataset.notOnSale;
    const stock = row.querySelector('[data-kit-stock]');
    if (stock) stock.hidden = row.dataset.available === 'true' || !(price > 0);
    const button = row.querySelector('[data-kit-add="row"]');
    if (button) button.disabled = !ready;
  }

  refreshTotals() {
    const rows = [...this.querySelectorAll('[data-kit-row]')];
    const ready = this.items(rows).length === rows.length;
    const button = this.querySelector('[data-kit-add="all"]');
    if (button) {
      button.disabled = !ready;
      button.textContent = ready ? this.dataset.allLabel : this.dataset.incomplete;
    }
    const note = this.querySelector('[data-kit-incomplete]');
    if (note) note.hidden = ready;
    const total = this.querySelector('[data-kit-total]');
    if (total) {
      total.hidden = rows.some((row) => !(Number(row.dataset.price) > 0));
      const quantities = rows.map((row) => Math.max(1, Math.round(Number(row.querySelector('[data-kit-qty]').value) || 1)));
      total.querySelector('[data-kit-total-label]').textContent = this.dataset.totalLabel.replace('[count]', quantities.reduce((a, b) => a + b, 0));
      total.querySelector('[data-kit-total-price]').textContent = this.money(rows.reduce((sum, row, index) => sum + Number(row.dataset.price) * quantities[index], 0));
    }
  }

  items(rows) {
    // Never silently omit a missing material or purchase an unconfirmed zero-price variant.
    if (!rows.length || rows.some((row) => !row || row.dataset.available !== 'true' || !(Number(row.dataset.price) > 0))) return [];
    return rows
      .map((row) => ({
        id: Number(row.dataset.variant),
        quantity: Math.max(1, Math.round(Number(row.querySelector('[data-kit-qty]')?.value) || 1)),
        properties: { _Kit: this.dataset.kit, '_Kit handle': this.dataset.kitHandle },
      }));
  }

  async add(rows, button) {
    if (this.busy || this.uncertain) return;
    const items = this.items(rows);
    if (!items.length) {
      this.status.textContent = this.dataset.incomplete;
      this.status.hidden = false;
      return;
    }
    const drawer = document.querySelector('cart-drawer');
    const label = button.textContent;
    this.busy = true;
    const inputs = [...this.querySelectorAll('[data-kit-colour], [data-kit-qty]')];
    inputs.forEach((input) => { input.disabled = true; });
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
      const result = await response.json().catch((error) => { if (response.ok) throw error; return {}; });
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
      inputs.forEach((input) => { input.disabled = Boolean(this.uncertain); });
      button.disabled = Boolean(this.uncertain);
      button.textContent = label;
      this.status.hidden = false;
      this.cartLink.hidden = false;
    }
  }
}

if (!customElements.get('yarn-kit-buy')) customElements.define('yarn-kit-buy', YarnKitBuy);
