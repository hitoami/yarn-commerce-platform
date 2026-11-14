// Home hero: scene carousel that advances on its own every few seconds (2026-11-14, replacing the capsule tabs), plus swipe and arrow keys.
// Autoplay holds while the pointer or focus is on the hero, while the tab is hidden, in the theme editor, and never runs under reduced motion.
// Independent of the guide strip.
(() => {
  if (customElements.get('hitoami-hero')) return;
  const wrap = (value, length) => ((value % length) + length) % length;

  class HitoamiHero extends HTMLElement {
    connectedCallback() {
      this.abort = new AbortController();
      const on = (element, name, fn) => element?.addEventListener(name, fn, { signal: this.abort.signal });
      this.slides = [...this.querySelectorAll('[data-slide]')];
      this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
      this.index = 0;
      this.delay = 6000;
      this.holds = new Set();
      if (this.slides.length < 2) return;
      const hero = this.querySelector('.hitoami-hero');
      const hold = (reason, active) => { active ? this.holds.add(reason) : this.holds.delete(reason); this.play(); };
      on(hero, 'pointerenter', (event) => event.pointerType === 'mouse' && hold('hover', true));
      on(hero, 'pointerleave', (event) => event.pointerType === 'mouse' && hold('hover', false));
      on(hero, 'focusin', () => hold('focus', true));
      on(hero, 'focusout', (event) => !hero.contains(event.relatedTarget) && hold('focus', false));
      on(document, 'visibilitychange', () => hold('hidden', document.hidden));
      on(this.reduce, 'change', () => this.play());
      on(hero, 'keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.target.matches('input, textarea, select')) return;
        event.preventDefault();
        this.show(this.index + (event.key === 'ArrowRight' ? 1 : -1));
      });
      const scene = this.querySelector('.hitoami-slides');
      on(scene, 'pointerdown', (event) => {
        if (!event.isPrimary || event.button !== 0 || event.target.closest('a, button')) return;
        this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0 };
        hold('drag', true);
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
        hold('drag', false);
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
        if (this.drag) hold('drag', false);
        this.drag = null;
        this.slides[this.index].style.transform = '';
      });
      on(document, 'shopify:block:select', (event) => {
        const index = this.slides.findIndex((slide) => slide.dataset.blockId === event.detail.blockId);
        if (index >= 0) this.show(index, false);
      });
      this.play();
    }

    play() {
      clearTimeout(this.timer);
      if (this.slides.length < 2 || this.holds.size || this.reduce.matches || window.Shopify?.designMode) return;
      this.timer = setTimeout(() => this.show(this.index + 1, true, 0, true), this.delay);
    }

    disconnectedCallback() {
      this.abort?.abort();
      clearTimeout(this.timer);
    }

    show(index, animate = true, direction = Math.sign(index - this.index), auto = false) {
      const next = wrap(index, this.slides.length);
      this.play();
      if (next === this.index) return;
      const hadFocus = this.slides[this.index].contains(document.activeElement);
      const previous = this.slides[this.index];
      const fade = auto && animate && !this.reduce.matches;
      this.index = next;
      this.slides.forEach((slide, position) => {
        const inactive = position !== next;
        // During an autoplay cross-fade the previous scene stays painted underneath until the new one is opaque.
        slide.hidden = inactive && !(fade && slide === previous);
        slide.inert = inactive;
      });
      if (hadFocus) this.slides[next].querySelector('a')?.focus();
      // Announce only slides the visitor chose, so autoplay does not talk over a screen reader every few seconds.
      const status = auto ? null : this.querySelector('[data-slide-status]');
      if (status) status.textContent = this.slides[next].querySelector('.hitoami-heading')?.textContent || '';
      if (animate && !this.reduce.matches) {
        // Swipes and arrow keys slide in from the side; autoplay is a slower cross-fade.
        const from = direction ? `translateX(${direction * 8}%)` : 'none';
        const incoming = this.slides[next];
        if (fade) incoming.style.zIndex = '1';
        const animation = incoming.animate([{ opacity: fade ? 0 : 0.45, transform: from }, { opacity: 1, transform: 'none' }], { duration: fade ? 900 : 340, easing: 'ease-out' });
        // Clear the underlay on a timer rather than animation.finished, which never settles while the page is not rendering.
        if (fade) setTimeout(() => {
          animation.finish();
          incoming.style.zIndex = '';
          if (this.slides[this.index] !== previous) previous.hidden = true;
        }, 950);
      }
    }
  }

  customElements.define('hitoami-hero', HitoamiHero);
})();
