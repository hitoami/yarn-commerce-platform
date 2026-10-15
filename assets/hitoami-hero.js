// Home hero: scene carousel with dots, swipe and arrow keys. Independent of the guide strip.
(() => {
  if (customElements.get('hitoami-hero')) return;
  const wrap = (value, length) => ((value % length) + length) % length;

  class HitoamiHero extends HTMLElement {
    connectedCallback() {
      this.abort = new AbortController();
      const on = (element, name, fn) => element?.addEventListener(name, fn, { signal: this.abort.signal });
      this.slides = [...this.querySelectorAll('[data-slide]')];
      this.pages = [...this.querySelectorAll('[data-page]')];
      this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
      this.index = 0;
      if (this.slides.length < 2) return;
      this.querySelector('.hitoami-controls')?.removeAttribute('hidden');
      this.pages.forEach((button, index) => on(button, 'click', () => this.show(index)));
      on(this.querySelector('.hitoami-hero'), 'keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.target.matches('input, textarea, select')) return;
        event.preventDefault();
        this.show(this.index + (event.key === 'ArrowRight' ? 1 : -1));
      });
      const scene = this.querySelector('.hitoami-slides');
      on(scene, 'pointerdown', (event) => {
        if (!event.isPrimary || event.button !== 0 || event.target.closest('a, button')) return;
        this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      });
      on(window, 'pointerup', (event) => {
        if (!this.drag || event.pointerId !== this.drag.id) return;
        const dx = event.clientX - this.drag.x;
        const dy = event.clientY - this.drag.y;
        this.drag = null;
        if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.4) this.show(this.index + (dx < 0 ? 1 : -1));
      });
      on(window, 'pointercancel', () => { this.drag = null; });
      on(document, 'shopify:block:select', (event) => {
        const index = this.slides.findIndex((slide) => slide.dataset.blockId === event.detail.blockId);
        if (index >= 0) this.show(index, false);
      });
    }

    disconnectedCallback() {
      this.abort?.abort();
    }

    show(index, animate = true) {
      const next = wrap(index, this.slides.length);
      if (next === this.index) return;
      if (this.slides[this.index].contains(document.activeElement)) this.pages[next]?.focus();
      this.index = next;
      this.slides.forEach((slide, position) => {
        const inactive = position !== next;
        slide.hidden = inactive;
        slide.inert = inactive;
      });
      this.pages.forEach((button, position) => {
        if (position === next) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      const status = this.querySelector('[data-slide-status]');
      if (status) status.textContent = this.slides[next].querySelector('.hitoami-heading')?.textContent || '';
      if (animate && !this.reduce.matches) {
        this.slides[next].animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 340, easing: 'ease-out' });
      }
    }
  }

  customElements.define('hitoami-hero', HitoamiHero);
})();
