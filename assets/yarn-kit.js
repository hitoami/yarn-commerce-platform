/* Yarn set page (#131): add one yarn row, or the complete list, to the Shopify cart.
 * #177: one main button. "all" adds every row and refuses if any is missing; "available" (partly out of stock)
 * adds only the rows that can be bought and never substitutes another yarn or colour. Steppers edit the row quantity.
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
    this.addEventListener('input', (event) => {
      if (!event.target.matches('[data-kit-qty]') || this.busy || this.uncertain) return;
      this.refreshTotals();
    });
    this.addEventListener('click', (event) => {
      const step = event.target.closest('[data-kit-step]');
      if (step) {
        const input = step.closest('[data-kit-row]')?.querySelector('[data-kit-qty]');
        if (!input || input.disabled) return;
        input.value = Math.max(1, (Math.round(Number(input.value)) || 1) + Number(step.dataset.kitStep));
        this.refreshTotals();
        return;
      }
      const button = event.target.closest('[data-kit-add]');
      if (!button || button.disabled) return;
      const mode = button.dataset.kitAdd;
      const rows = mode === 'row' ? [button.closest('[data-kit-row]')] : [...this.querySelectorAll('[data-kit-row]')];
      this.add(mode === 'available' ? rows.filter((row) => this.ready(row)) : rows, button);
    });
  }

  // Prefer the shop's money_format (e.g. ¥{{amount_no_decimals}}) so JS totals match Liquid's | money; same rules as yarn-pdp.js.
  money(cents) {
    const format = this.dataset.moneyFormat;
    if (!format) return new Intl.NumberFormat(this.dataset.locale, { style: 'currency', currency: this.dataset.currency }).format(cents / 100);
    const value = Number(cents) / 100;
    const group = (precision, thousands, decimal) => {
      const [whole, fraction] = value.toFixed(precision).split('.');
      return whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (fraction ? decimal + fraction : '');
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      if (key === 'amount_no_decimals') return group(0, ',', '.');
      if (key === 'amount_with_comma_separator') return group(2, '.', ',');
      if (key === 'amount_no_decimals_with_comma_separator') return group(0, '.', ',');
      if (key === 'amount_with_apostrophe_separator') return group(2, "'", '.');
      return group(2, ',', '.');
    });
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
    const stepper = row.querySelector('[data-kit-stepper]');
    if (stepper) stepper.hidden = !ready;
    row.classList.toggle('yk-row--out', !ready);
  }

  ready(row) {
    return Boolean(row) && row.dataset.available === 'true' && Number(row.dataset.price) > 0;
  }

  quantity(row) {
    return Math.max(1, Math.round(Number(row.querySelector('[data-kit-qty]')?.value) || 1));
  }

  refreshTotals() {
    const rows = [...this.querySelectorAll('[data-kit-row]')];
    const ready = rows.filter((row) => this.ready(row));
    const button = this.querySelector('[data-kit-add="all"], [data-kit-add="available"]');
    const balls = ready.reduce((sum, row) => sum + this.quantity(row), 0);
    if (button) {
      const all = ready.length === rows.length;
      button.dataset.kitAdd = all ? 'all' : 'available';
      button.disabled = ready.length === 0;
      button.textContent = all ? this.dataset.allLabel : ready.length ? this.dataset.availableLabel.replace('[count]', balls) : this.dataset.incomplete;
    }
    const total = this.querySelector('[data-kit-total]');
    if (total) {
      total.hidden = ready.length === 0;
      total.querySelector('[data-kit-total-label]').textContent = this.dataset.totalLabel.replace('[count]', balls);
      total.querySelector('[data-kit-total-price]').textContent = this.money(ready.reduce((sum, row) => sum + Number(row.dataset.price) * this.quantity(row), 0));
    }
  }

  items(rows) {
    // Never silently omit a missing material or purchase an unconfirmed zero-price variant.
    if (!rows.length || rows.some((row) => !this.ready(row))) return [];
    return rows
      .map((row) => ({
        id: Number(row.dataset.variant),
        quantity: this.quantity(row),
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
    const inputs = [...this.querySelectorAll('[data-kit-colour], [data-kit-qty], [data-kit-step]')];
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
          // Like Rise's product form: the drawer keeps is-empty from page load, which hides the new items.
          drawer.classList?.remove('is-empty');
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

/* #182 v2: the quick button under the title and the phone sticky bar only forward clicks to the buy box's
 * single main button, and mirror its label, disabled state and total. Cart logic stays in YarnKitBuy. */
class YarnKitProxy extends HTMLElement {
  connectedCallback() {
    this.buy = document.querySelector('yarn-kit-buy');
    this.target = this.buy?.querySelector('[data-kit-add="all"], [data-kit-add="available"]');
    if (!this.target) return;
    this.addEventListener('click', (event) => {
      const button = event.target.closest('[data-kit-proxy]');
      if (!button || button.disabled || this.target.disabled) return;
      this.target.click();
    });
    this.sync = () => {
      const totalPrice = this.buy.querySelector('[data-kit-total-price]')?.textContent?.trim();
      const totalLabel = this.buy.querySelector('[data-kit-total-label]')?.textContent?.trim();
      this.querySelectorAll('[data-kit-proxy]').forEach((button) => {
        button.disabled = this.target.disabled;
        if (!('kitProxyShort' in button.dataset)) {
          button.textContent = totalPrice && !this.target.disabled ? `${this.target.textContent.trim()} · ${totalPrice}` : this.target.textContent.trim();
        }
      });
      const count = this.querySelector('[data-kit-proxy-count]');
      const total = this.querySelector('[data-kit-proxy-total]');
      if (count && totalLabel) count.textContent = totalLabel;
      if (total && totalPrice) total.textContent = totalPrice;
    };
    this.observer = new MutationObserver(this.sync);
    this.observer.observe(this.buy, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled'] });
    if ('kitSticky' in this.dataset && 'IntersectionObserver' in window) {
      const watched = [this.target, document.querySelector('.yk-quick')].filter(Boolean);
      const visible = new Set();
      this.io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
        const show = visible.size === 0;
        this.dataset.visible = String(show);
        this.inert = !show;
      });
      watched.forEach((node) => this.io.observe(node));
    }
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.io?.disconnect();
  }
}

if (!customElements.get('yarn-kit-proxy')) customElements.define('yarn-kit-proxy', YarnKitProxy);
