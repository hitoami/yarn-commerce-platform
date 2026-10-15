// Guide strip: draws the hanging line on first view. On desktop a sprite cat sleeps with a yarn ball at the thread's
// start; hovering or focusing a node wakes it and it walks along the line to that node, the ball rolling ahead of it,
// then settles and sleeps there. Without the cat (mobile) the ball simply rolls to the active node.
(() => {
  const BESIDE = 20; // ball stops this far before the node's hang point
  const CAT_W = 100;
  const CAT_H = 70;
  const HOME_X = -40; // fallback cat centre at rest; the left dip of the line replaces it once measured
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Frames: 0 sleep, 1 wake, 2 stand, 3-7 walk cycle, 8 settle. Timings follow the live cat.
  class CatMotion {
    constructor(x) {
      Object.assign(this, { x, target: x, dir: 1, frame: 0, state: 'sleep', elapsed: 0, stride: 0, speed: 150 });
    }
    goTo(target, immediate) {
      this.target = target;
      if (Math.abs(target - this.x) > 0.6) this.dir = Math.sign(target - this.x);
      this.speed = Math.max(150, Math.abs(target - this.x) / 0.9);
      if (immediate) {
        Object.assign(this, { x: target, state: 'sleep', frame: 0, elapsed: 0 });
        return;
      }
      if (Math.abs(target - this.x) <= 0.6) return;
      if (this.state === 'sleep') Object.assign(this, { state: 'wake', elapsed: 0 });
      else if (this.state !== 'wake') this.state = 'walk';
    }
    step(delta) {
      const dt = clamp(delta, 0, 40);
      this.elapsed += dt;
      if (this.state === 'wake') {
        this.frame = this.elapsed < 170 ? 1 : 2;
        if (this.elapsed >= 350) Object.assign(this, { state: 'walk', elapsed: 0 });
      } else if (this.state === 'walk') {
        const distance = this.target - this.x;
        if (Math.abs(distance) < 0.6) {
          Object.assign(this, { x: this.target, state: 'settle', elapsed: 0, frame: 8 });
        } else {
          this.stride += dt / 550;
          const cadence = 0.86 + 0.14 * Math.sin(this.stride * Math.PI * 2);
          const pace = Math.min(this.speed, Math.max(45, Math.abs(distance) * 5));
          this.x += Math.sign(distance) * Math.min(Math.abs(distance), (pace * cadence * dt) / 1000);
          this.frame = 3 + Math.floor((this.stride % 1) * 5);
        }
      } else if (this.state === 'settle' && this.elapsed > 650) {
        Object.assign(this, { state: 'sleep', frame: 0 });
      }
      return this.state !== 'sleep';
    }
  }

  const init = (root) => {
    if (root.dataset.guideReady) return;
    root.dataset.guideReady = 'true';
    const rail = root.querySelector('.yarn-guide__rail');
    const svg = root.querySelector('.yarn-guide__thread');
    const path = svg?.querySelector('.yarn-guide__ply-core');
    const ball = root.querySelector('.yarn-guide__ball');
    const cat = root.querySelector('[data-cat]');
    const items = [...root.querySelectorAll('.yarn-guide__item')];
    if (!rail || !path || !ball || !items.length) return;

    // Hide the line only at the moment it comes into view, so a missed observer never leaves it hidden.
    if (!reduceMotion && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        root.classList.add('is-armed');
        root.getBoundingClientRect();
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-drawn')));
      }, { threshold: 0.4 });
      observer.observe(root);
    }

    // The line is rebuilt in rail pixels (1 SVG unit = 1px). Hang points sit over each node. With the cat (desktop)
    // both ends are pinned to the top edge of the strip, i.e. the bottom of whatever section sits above, and the rope
    // dips once near each end like a clothesline; the cat sleeps in the left dip. Without it the ends stay on the rail.
    const inner = root.querySelector('.yarn-guide__inner');
    const paths = [...svg.querySelectorAll('path')];
    const knots = [...svg.querySelectorAll('.yarn-guide__knot')];
    const HANG_Y = 8;
    const SAG_Y = 30;
    const DIP_Y = 22;
    const PIN_OVERLAP = 20;
    const MIN_REACH = 110;
    const EDGE_GAP = 24;
    const PIN_OUTSET = 96;
    const hasCat = () => Boolean(cat) && getComputedStyle(cat).display !== 'none';
    const nodeX = (item) => {
      const box = item.querySelector('.yarn-guide__dot').getBoundingClientRect();
      return box.left + box.width / 2 - rail.getBoundingClientRect().left;
    };
    let total = 0;
    let startX = 0;
    let endX = 0;
    let homeX = HOME_X;
    const buildLine = () => {
      const railBox = rail.getBoundingClientRect();
      const hangs = items.map(nodeX);
      const first = hangs[0];
      const lastHang = hangs[hangs.length - 1];
      const f = (n) => n.toFixed(1);
      const middle = hangs.slice(1).map((x, i) => ` Q${f((hangs[i] + x) / 2)} ${SAG_Y} ${f(x)} ${HANG_Y}`).join('');
      let d;
      const pinned = hasCat() && inner;
      if (pinned) {
        const innerBox = inner.getBoundingClientRect();
        const rootBox = root.getBoundingClientRect();
        // Pins reach a little into the section above so the rope reads as tied onto it (and onto a wavy edge).
        const pinY = rootBox.top - railBox.top - PIN_OVERLAP;
        // The pins sit symmetrically about the page centre, a little outside the content column (never closer
        // than EDGE_GAP to the screen edge). Both end swoops share one shape; the extra length on the left, where
        // the heading column sits, becomes a gentle run the cat sleeps on.
        const reachOut = Math.max(0, Math.min(PIN_OUTSET, innerBox.left - rootBox.left - EDGE_GAP));
        const ax = innerBox.left - railBox.left - reachOut;
        const bx = innerBox.right - railBox.left + reachOut;
        const swoop = Math.max(MIN_REACH * 0.5, 0.55 * Math.min(first - ax, bx - lastHang));
        const dipL = ax + swoop;
        const dipR = bx - swoop;
        d = `M${f(ax)} ${f(pinY)} Q${f(ax + swoop * 0.35)} ${DIP_Y} ${f(dipL)} ${DIP_Y} Q${f((dipL + first) / 2)} 26 ${f(first)} ${HANG_Y}`
          + middle
          + ` Q${f((lastHang + dipR) / 2)} 26 ${f(dipR)} ${DIP_Y} Q${f(bx - swoop * 0.35)} ${DIP_Y} ${f(bx)} ${f(pinY)}`;
        homeX = Math.min(dipL + 40, first - 80);
        [[ax, pinY], [bx, pinY]].forEach(([x, y], i) => {
          knots[i]?.setAttribute('cx', f(x));
          knots[i]?.setAttribute('cy', f(y));
        });
      } else {
        d = `M0 18 Q${f(first / 2)} 26 ${f(first)} ${HANG_Y}${middle} Q${f((lastHang + railBox.width) / 2)} 26 ${f(railBox.width)} 18`;
      }
      root.classList.toggle('has-pins', Boolean(pinned));
      svg.setAttribute('viewBox', `0 0 ${f(railBox.width)} 40`);
      paths.forEach((p) => p.setAttribute('d', d));
      total = path.getTotalLength();
      startX = path.getPointAtLength(0).x;
      endX = path.getPointAtLength(total).x;
    };
    buildLine();

    // Path x grows monotonically, so a binary search finds the length at a given x.
    const lengthAtX = (x) => {
      let lo = 0;
      let hi = total;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).x < x) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };
    // Line height (px, rail coordinates) under x (px); beyond the ends the end height holds.
    const lineY = (px) => path.getPointAtLength(lengthAtX(clamp(px, startX, endX))).y;
    const ballSize = () => parseFloat(getComputedStyle(ball).width) || 16;

    let spin = 0;
    let ballX = null;
    const placeBall = (x) => {
      const size = ballSize();
      const clamped = clamp(x, startX + size / 2 + 1, endX - size / 2);
      if (ballX !== null) spin += ((clamped - ballX) / (Math.PI * size)) * 360;
      ballX = clamped;
      ball.style.setProperty('--ball-x', `${clamped - size / 2}px`);
      ball.style.setProperty('--ball-y', `${lineY(clamped) - size + 2}px`);
      ball.style.setProperty('--ball-spin', `${spin}deg`);
    };

    // Cat mode: the ball sits just ahead of the cat's nose in its walking direction.
    const motion = new CatMotion(homeX);
    const paintCat = () => {
      cat.style.setProperty('--cat-x', `${motion.x - CAT_W / 2}px`);
      cat.style.setProperty('--cat-y', `${lineY(motion.x) - CAT_H + 3}px`);
      cat.style.setProperty('--cat-dir', String(motion.dir));
      cat.style.backgroundPosition = `${motion.frame * 12.5}% 0`;
      placeBall(motion.x + motion.dir * (CAT_W / 2 - 4 + ballSize() / 2));
    };
    // Stop so the ball lands just before the hang point on the side the cat arrives from;
    // the side is kept so a resize re-places the cat without flipping it around the node.
    let arriveSide = -1;
    const catTarget = (item) => nodeX(item) + arriveSide * (BESIDE + CAT_W / 2 - 4);
    let catFrame = null;
    let last = null;
    const tick = (now) => {
      const moving = motion.step(last === null ? 16 : now - last);
      last = now;
      paintCat();
      catFrame = moving ? requestAnimationFrame(tick) : null;
      if (!moving) last = null;
    };

    // Ball-only mode (no cat): roll along the line to a node with a slight overshoot.
    const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
    let rollFrame = null;
    const rollTo = (item, immediate) => {
      const to = nodeX(item) - BESIDE;
      cancelAnimationFrame(rollFrame);
      if (ballX === null || immediate || reduceMotion) {
        placeBall(to);
        return;
      }
      const from = ballX;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 900);
        placeBall(from + (to - from) * easeOutBack(t));
        if (t < 1) rollFrame = requestAnimationFrame(step);
      };
      rollFrame = requestAnimationFrame(step);
    };

    let active = null;
    const activate = (item) => {
      if (item === active) return;
      active = item;
      if (!hasCat()) {
        rollTo(item);
        return;
      }
      arriveSide = nodeX(item) >= motion.x ? -1 : 1;
      motion.goTo(catTarget(item), reduceMotion);
      if (reduceMotion) paintCat();
      else if (catFrame === null) catFrame = requestAnimationFrame(tick);
    };
    // Place everything without animation: at load and after a resize changes the geometry.
    const settle = () => {
      buildLine();
      cancelAnimationFrame(catFrame);
      cancelAnimationFrame(rollFrame);
      catFrame = null;
      last = null;
      if (hasCat()) {
        const dir = motion.dir;
        motion.goTo(active ? catTarget(active) : homeX, true);
        motion.dir = dir;
        paintCat();
      } else {
        rollTo(active || items[0], true);
      }
    };

    settle();
    requestAnimationFrame(() => root.classList.add('has-ball'));
    items.forEach((item) => {
      item.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch') activate(item); });
      item.addEventListener('focusin', () => activate(item));
    });
    window.addEventListener('resize', settle);
  };

  const initAll = () => document.querySelectorAll('[data-yarn-guide]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
  document.addEventListener('shopify:section:load', initAll);
})();
