// 毛线详情页（Issue #120）：「要买几团？」估算与手机常驻购买栏。
// 两者都只改写或触发 Shopify 原生商品表单（Quantity-{section} 与原加购按钮），不自行加购、不保存价格。
(() => {
  // Rise 会按购物车已有数量改写输入框的 min / max，优先读实际属性，再退回 Variant 数量规则。
  const quantityBounds = (input) => ({
    min: Number(input.min || input.dataset.min) || 1,
    max: input.max ? Number(input.max) : input.dataset.max ? Number(input.dataset.max) : Infinity,
    step: Number(input.step) || 1,
  });

  const setQuantity = (input, wanted) => {
    const { min, max, step } = quantityBounds(input);
    let next = min + Math.max(0, Math.round((wanted - min) / step)) * step;
    while (next > max && next - step >= min) next -= step;
    input.value = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return next;
  };

  // Shopify money_format（如 ¥{{amount_no_decimals}}）；cents 为 Liquid / variant JSON 的最小单位金额。
  const formatMoney = (cents, format) => {
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
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setQuantity, formatMoney };
    return;
  }

  class YarnUsageEstimate extends HTMLElement {
    connectedCallback() {
      this.input = document.getElementById(this.dataset.quantityInput);
      this.options = [...this.querySelectorAll('[data-usage-option]')];
      this.results = [...this.querySelectorAll('[data-usage-result]')];
      this.status = this.querySelector('[data-usage-status]');
      const group = this.querySelector('[data-usage-options]');
      if (group && this.options.length > 1) group.hidden = false;
      this.options.forEach((button) =>
        button.addEventListener('click', () => this.select(button.dataset.usageOption))
      );
      if (!this.input) return;
      this.querySelectorAll('[data-usage-fill]').forEach((button) => {
        button.hidden = false;
        button.addEventListener('click', () => {
          const value = setQuantity(this.input, Number(button.dataset.usageFill));
          if (this.status) this.status.textContent = this.dataset.filled.replace('[quantity]', value);
        });
      });
    }

    select(index) {
      this.options.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.usageOption === index)));
      this.results.forEach((result) => (result.hidden = result.dataset.usageResult !== index));
    }
  }

  class YarnStickyBuy extends HTMLElement {
    connectedCallback() {
      this.sectionId = this.dataset.section;
      this.price = Number(this.dataset.price);
      this.addButton = this.querySelector('[data-sticky-add]');
      this.qtyValue = this.querySelector('[data-sticky-qty-value]');
      this.error = this.querySelector('[data-sticky-error]');
      this.stepButtons = [...this.querySelectorAll('[data-step]')];
      const main = this.mainButton();
      if (!main) return;

      this.stepButtons.forEach((button) =>
        button.addEventListener('click', () => {
          const input = this.quantityInput();
          if (!input) return;
          setQuantity(input, Number(input.value) + Number(button.dataset.step) * (Number(input.step) || 1));
        })
      );
      this.addButton.addEventListener('click', () => {
        const button = this.mainButton();
        if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
        this.showError('');
        button.click();
      });

      this.onChange = (event) => {
        if (event.target === this.quantityInput()) this.render();
      };
      document.addEventListener('change', this.onChange);
      document.addEventListener('input', this.onChange);

      this.buttonObserver = new MutationObserver(() => this.render());
      this.buttonObserver.observe(main, { attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });

      this.viewObserver = new IntersectionObserver(([entry]) => this.setVisible(!entry.isIntersecting));
      this.viewObserver.observe(main.closest('.product-form__buttons') || main);

      if (typeof subscribe === 'function') {
        this.unsubscribers = [
          subscribe(PUB_SUB_EVENTS.variantChange, ({ data }) => {
            if (data.sectionId !== this.sectionId) return;
            if (data.variant) this.price = data.variant.price;
            const chip = this.querySelector(`#YarnStickyChip-${this.sectionId}`);
            const nextChip = data.html.getElementById(`YarnStickyChip-${this.sectionId}`);
            if (chip && nextChip) chip.innerHTML = nextChip.innerHTML;
            this.showError('');
            this.render();
          }),
          subscribe(PUB_SUB_EVENTS.cartError, (event) => {
            if (event.source !== 'product-form' || !this.visible) return;
            const errors = typeof event.errors === 'string' ? event.errors : event.message;
            this.showError(errors || '');
          }),
          subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.showError('')),
        ];
      }
      this.render();
    }

    disconnectedCallback() {
      document.removeEventListener('change', this.onChange);
      document.removeEventListener('input', this.onChange);
      this.buttonObserver?.disconnect();
      this.viewObserver?.disconnect();
      this.unsubscribers?.forEach((unsubscribe) => unsubscribe());
    }

    mainButton() {
      return document.getElementById(`ProductSubmitButton-${this.sectionId}`);
    }

    quantityInput() {
      return document.getElementById(`Quantity-${this.sectionId}`);
    }

    setVisible(visible) {
      this.visible = visible;
      this.dataset.visible = String(visible);
      this.inert = !visible;
    }

    showError(message) {
      this.error.textContent = message;
      this.error.hidden = !message;
    }

    render() {
      const main = this.mainButton();
      const input = this.quantityInput();
      const qty = input ? Math.max(1, Number(input.value) || 1) : 1;
      this.qtyValue.textContent = qty;
      this.querySelector('[data-sticky-qty]').hidden = !input;
      if (input) {
        const { min, max, step } = quantityBounds(input);
        this.stepButtons[0].disabled = qty - step < min;
        this.stepButtons[1].disabled = qty + step > max;
      }
      const disabled = !main || main.disabled;
      this.addButton.disabled = disabled;
      this.addButton.textContent = disabled
        ? main?.querySelector('span')?.textContent.trim() || ''
        : this.dataset.label.replace('[price]', formatMoney(this.price * qty, this.dataset.moneyFormat));
    }
  }

  if (!customElements.get('yarn-usage-estimate')) customElements.define('yarn-usage-estimate', YarnUsageEstimate);
  if (!customElements.get('yarn-sticky-buy')) customElements.define('yarn-sticky-buy', YarnStickyBuy);
})();
