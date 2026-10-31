// Home hero: scene carousel with named capsule tabs (Issue 274), swipe and arrow keys. Independent of the guide strip.
(() => {
  if (customElements.get('hitoami-hero')) return;
  const wrap = (value, length) => ((value % length) + length) % length;

  class HitoamiHero extends HTMLElement {
    connectedCallback() {
      this.abort = new AbortController();
      const on = (element, name, fn) => element?.addEventListener(name, fn, { signal: this.abort.signal });
      this.slides = [...this.querySelectorAll('[data-slide]')];
      this.pages = [...this.querySelectorAll('[data-page]')];
      this.number = this.querySelector('[data-slide-number]');
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
        this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0 };
      });
      // The current slide follows a horizontal finger (damped) so phones feel the swipe before it lands.
      on(window, 'pointermove', (event) => {
        if (!this.drag || event.pointerId !== this.drag.id || this.reduce.matches) return;
        const dx = event.clientX - this.drag.x;
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(event.clientY - this.drag.y)) return;
        this.drag.dx = dx;
        this.slides[this.index].style.transform = `translateX(${dx * 0.4}px)`;
      });
      on(window, 'pointerup', (event) => {
        if (!this.drag || event.pointerId !== this.drag.id) return;
        const dx = event.clientX - this.drag.x;
        const dy = event.clientY - this.drag.y;
        this.drag = null;
        const current = this.slides[this.index];
        const offset = current.style.transform;
        current.style.transform = '';
        if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          this.show(this.index + (dx < 0 ? 1 : -1), true, dx < 0 ? 1 : -1);
        } else if (offset) {
          current.animate([{ transform: offset }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
        }
      });
      on(window, 'pointercancel', () => {
        this.drag = null;
        this.slides[this.index].style.transform = '';
      });
      on(document, 'shopify:block:select', (event) => {
        const index = this.slides.findIndex((slide) => slide.dataset.blockId === event.detail.blockId);
        if (index >= 0) this.show(index, false);
      });
    }

    disconnectedCallback() {
      this.abort?.abort();
    }

    show(index, animate = true, direction = Math.sign(index - this.index)) {
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
      if (this.number) this.number.textContent = String(next + 1).padStart(2, '0');
      const status = this.querySelector('[data-slide-status]');
      if (status) status.textContent = this.slides[next].querySelector('.hitoami-heading')?.textContent || '';
      if (animate && !this.reduce.matches) {
        const from = direction ? `translateX(${direction * 8}%)` : 'none';
        this.slides[next].animate([{ opacity: 0.45, transform: from }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'ease-out' });
      }
    }
  }

  customElements.define('hitoami-hero', HitoamiHero);
})();
