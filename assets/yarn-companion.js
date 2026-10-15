class YarnCompanion extends HTMLElement {
  connectedCallback() {
    if (this.controller) return;
    this.controller = new AbortController();
    this.button = this.querySelector('button');
    this.cat = this.querySelector('.yarn-companion__cat');
    this.ball = this.querySelector('.yarn-companion__ball');
    this.x = 0;
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.button.addEventListener('click', () => this.walk(this.x < -40 ? 0 : -Math.max(0, this.clientWidth - 110)), { signal: this.controller.signal });
    this.motion.addEventListener('change', () => this.rest(), { signal: this.controller.signal });
    this.closest('[data-yarn-entries]')?.addEventListener('pointerover', (event) => {
      const link = event.target.closest('.yarn-entries__card');
      if (!link || link.contains(event.relatedTarget)) return;
      const bounds = link.getBoundingClientRect();
      this.walk(Math.min(0, Math.max(110 - this.clientWidth, bounds.left - this.getBoundingClientRect().right + 70)));
    }, { signal: this.controller.signal });
  }
  rest() {
    cancelAnimationFrame(this.frame);
    this.cat.style.backgroundPosition = '0 0';
    this.dataset.state = 'sleep';
  }
  walk(target) {
    this.rest();
    if (this.motion.matches) return;
    const origin = this.x;
    const start = performance.now();
    this.cat.style.setProperty('--cat-direction', target < origin ? -1 : 1);
    const step = (now) => {
      const elapsed = now - start;
      this.dataset.state = 'awake';
      if (elapsed < 280) this.cat.style.backgroundPosition = `${elapsed < 140 ? 12.5 : 25}% 0`;
      else if (elapsed < 1200) {
        const t = (elapsed - 280) / 920;
        this.x = origin + (target - origin) * (1 - (1 - t) ** 2);
        this.button.style.transform = `translateX(${this.x}px)`;
        this.cat.style.backgroundPosition = `${(3 + Math.floor((elapsed - 280) / 100) % 5) * 12.5}% 0`;
        this.ball.style.transform = `rotate(${this.x * 4}deg)`;
      } else if (elapsed < 1700) this.cat.style.backgroundPosition = '100% 0';
      else return this.rest();
      this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }
  disconnectedCallback() { this.rest(); this.controller.abort(); this.controller = null; }
}
if (!customElements.get('yarn-companion')) customElements.define('yarn-companion', YarnCompanion);
