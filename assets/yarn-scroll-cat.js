// Homepage desktop scroll progress. The ball's position is the page's scroll progress; the thread runs from a loose end at
// the left edge to the ball, and the cat walks behind it, nudging it along. When scrolling stops the cat stands, lies down,
// then sleeps; scrolling back turns it round to draw the ball back. With reduced motion it simply stands at the progress point.
(() => {
  const EDGE = 20; // the thread's loose end and the right-hand stop sit this far from the screen edges
  const CAT_W = 72;
  const BALL = 24;
  const NOSE = 6; // the ball overlaps the cat's nose by this much
  const THREAD_Y = 14; // thread height inside the 20px-tall svg, measured from its top
  // Frames: 0 sleep, 1 lying awake, 2 stand, 3-7 walk cycle, 8 stand.
  const STRIDE = 9; // px walked per walk frame
  const desktop = window.matchMedia('(min-width: 990px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  class YarnScrollCat extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const { signal } = this.controller;
      this.cat = this.querySelector('.yarn-scroll-cat__cat');
      this.thread = this.querySelector('.yarn-scroll-cat__thread');
      Object.assign(this, { x: null, facing: 1, stride: 0, idle: 0, wake: 0, frame: 0, raf: 0, last: 0 });
      const kick = () => this.kick();
      window.addEventListener('scroll', kick, { passive: true, signal });
      window.addEventListener('resize', () => this.measure(), { passive: true, signal });
      desktop.addEventListener('change', () => this.measure(), { signal });
      reduceMotion.addEventListener('change', kick, { signal });
      this.measure();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.raf);
      this.controller?.abort();
      this.controller = null;
    }

    measure() {
      if (!desktop.matches) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.classList.remove('is-ready');
        return;
      }
      const width = document.documentElement.clientWidth;
      this.minX = EDGE;
      this.maxX = width - EDGE - BALL - CAT_W + NOSE;
      // A loosely lying thread: a shallow wave across the whole width, revealed up to the ball by a clip.
      let d = `M${EDGE} ${THREAD_Y}`;
      for (let x = EDGE, up = true; x < width; x += 46, up = !up) {
        d += ` Q${x + 23} ${THREAD_Y + (up ? -1.6 : 1.6)} ${x + 46} ${THREAD_Y}`;
      }
      this.thread.setAttribute('viewBox', `0 0 ${width} 20`);
      this.thread.querySelector('path').setAttribute('d', d);
      this.kick();
    }

    target() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollable = max > 0;
      const progress = this.scrollable ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      return this.minX + progress * (this.maxX - this.minX);
    }

    kick() {
      if (!desktop.matches || this.raf) return;
      this.last = performance.now();
      this.raf = requestAnimationFrame((now) => this.tick(now));
    }

    tick(now) {
      const dt = Math.min(48, now - this.last);
      this.last = now;
      const target = this.target();
      this.classList.toggle('is-ready', this.scrollable);
      let moving = false;
      if (this.x === null) {
        this.x = target; // first paint: already asleep at the current progress
      } else if (reduceMotion.matches) {
        if (Math.abs(target - this.x) > 0.5) this.facing = Math.sign(target - this.x);
        this.x = target;
        this.frame = 2;
      } else {
        const gap = target - this.x;
        moving = Math.abs(gap) > 0.4;
        if (moving) {
          if (this.idle > 650) this.wake = 160; // was lying down: get up before walking
          this.idle = 0;
          const step = gap * (1 - Math.exp(-dt / 140));
          this.x += step;
          if (Math.abs(step) > 0.05) this.facing = Math.sign(step);
          this.stride += Math.abs(step);
          if (this.wake > 0) {
            this.wake -= dt;
            this.frame = 2;
          } else {
            this.frame = 3 + (Math.floor(this.stride / STRIDE) % 5);
          }
        } else {
          this.x = target;
          this.idle += dt;
          this.frame = this.idle < 600 ? 8 : this.idle < 1400 ? 1 : 0;
        }
      }
      this.paint();
      this.raf = moving || (this.idle > 0 && this.idle < 1400 && !reduceMotion.matches)
        ? requestAnimationFrame((t) => this.tick(t))
        : 0;
    }

    paint() {
      // The ball stays at the cat's front; walking back the cat just turns round and draws it along.
      const ballX = this.x + CAT_W - NOSE;
      this.style.setProperty('--ysc-cat-x', `${this.x.toFixed(1)}px`);
      this.style.setProperty('--ysc-dir', this.facing < 0 ? -1 : 1);
      this.style.setProperty('--ysc-frame', this.frame);
      this.style.setProperty('--ysc-ball-x', `${ballX.toFixed(1)}px`);
      this.style.setProperty('--ysc-spin', `${((ballX / (BALL / 2)) * (180 / Math.PI)).toFixed(1)}deg`);
      this.style.setProperty('--ysc-reach', `${(ballX + BALL / 2).toFixed(1)}px`);
    }
  }

  if (!customElements.get('yarn-scroll-cat')) customElements.define('yarn-scroll-cat', YarnScrollCat);
})();
