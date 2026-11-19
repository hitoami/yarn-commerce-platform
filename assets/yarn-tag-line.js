// Home clothesline tags. Redraws the line so it sags a little between the wooden pins, and walks the sprite cat (shared with
// the guide strip and scroll cat) along it: on first view it walks from the loose end to the first tag; hovering or focusing a
// tag sends it there, nudging the logo yarn ball ahead of it; when it stops it stands, lies down, then sleeps.
// Turning round rolls the ball to the other side instead of jumping. With reduced motion the cat simply appears at the target.
(() => {
  const SAG = 6; // px the line dips between two pins
  const END_SAG = 5;
  const SPEED = 150; // px/s walking
  const BALL_SPEED = 420; // px/s the ball rolls round to the cat's new front after a turn
  const STRIDE = 11; // px walked per walk frame
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function init(rail) {
    if (rail.dataset.taglineReady) return;
    rail.dataset.taglineReady = '1';
    const svg = rail.querySelector('.yarn-tagline__line');
    const path = svg.querySelector('path');
    const knots = svg.querySelectorAll('circle');
    const cat = rail.querySelector('.yarn-tagline__cat');
    const ball = rail.querySelector('.yarn-tagline__ball');
    const tags = [...rail.querySelectorAll('[data-tagline-tag]')];
    if (!tags.length) return;

    let width = 0, points = [], x = 8, target = 8, facing = 1, stride = 0, idle = 2000, frame = 0;
    let ballX = null, spin = 0, raf = 0, last = 0, seen = false;
    const lineY = () => parseFloat(getComputedStyle(rail).getPropertyValue('--tl-line')) || 70;
    const catW = () => cat.offsetWidth;
    const catH = () => cat.offsetHeight;
    const ballW = () => parseFloat(getComputedStyle(ball).width) || 18;

    function measure() {
      const box = rail.getBoundingClientRect();
      const y = lineY();
      width = box.width;
      const pins = tags.map((tag) => {
        const pin = tag.querySelector('.yarn-tagline__pin').getBoundingClientRect();
        return [pin.left + pin.width / 2 - box.left, y];
      });
      points = [[6, y - 6], ...pins, [width - 6, y - 6]];
      let d = `M${points[0][0]} ${points[0][1]}`;
      for (let i = 1; i < points.length; i += 1) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        d += ` Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + 2 * sagAt(i)} ${x1} ${y1}`;
      }
      svg.setAttribute('viewBox', `0 0 ${width} 120`);
      path.setAttribute('d', d);
      knots.forEach((knot, i) => {
        knot.setAttribute('cx', points[i ? points.length - 1 : 0][0]);
        knot.setAttribute('cy', y - 6);
      });
    }
    const sagAt = (i) => (i === 1 || i === points.length - 1 ? END_SAG : SAG);
    // Height of the line at px, matching the quadratic segments drawn above.
    function yAt(px) {
      for (let i = 1; i < points.length; i += 1) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        if (px <= x1 || i === points.length - 1) {
          const u = Math.max(0, Math.min(1, (px - x0) / (x1 - x0 || 1)));
          return y0 + (y1 - y0) * u + 4 * sagAt(i) * u * (1 - u);
        }
      }
      return lineY();
    }
    const clamp = (v) => Math.max(8, Math.min(width - catW() - ballW() - 8, v));
    const tagTarget = (i) => clamp(points[i + 1][0] - catW() / 2);
    const ballGoal = () => (facing > 0 ? x + catW() - 4 : x + 4 - ballW());

    function moveBall(dt) {
      const goal = ballGoal();
      if (ballX === null || dt === null || reduceMotion.matches) { ballX = goal; return; }
      const gap = goal - ballX;
      const max = (BALL_SPEED * dt) / 1000;
      const step = Math.abs(gap) <= max ? gap : Math.sign(gap) * max;
      ballX += step;
      spin += (step / (Math.PI * ballW())) * 360;
    }

    function paint(dt = null) {
      moveBall(dt);
      const b = ballW();
      rail.style.setProperty('--tl-cat-x', `${x.toFixed(1)}px`);
      rail.style.setProperty('--tl-cat-y', `${(yAt(x + catW() / 2) - catH() + 4).toFixed(1)}px`);
      rail.style.setProperty('--tl-dir', facing);
      rail.style.setProperty('--tl-frame', frame);
      rail.style.setProperty('--tl-ball-x', `${ballX.toFixed(1)}px`);
      rail.style.setProperty('--tl-ball-y', `${(yAt(ballX + b / 2) - b + 2).toFixed(1)}px`);
      rail.style.setProperty('--tl-spin', `${spin.toFixed(1)}deg`);
    }

    function tick(now) {
      const dt = Math.min(48, now - last);
      last = now;
      const gap = target - x;
      if (reduceMotion.matches) {
        if (Math.abs(gap) > 0.5) facing = Math.sign(gap);
        x = target;
        frame = 2;
        paint();
        raf = 0;
        return;
      }
      if (Math.abs(gap) > 0.5) {
        if (idle > 650) {
          frame = 2; // was lying down: get up before walking
          idle = 0;
        } else {
          const step = Math.sign(gap) * Math.min(Math.abs(gap), (SPEED * dt) / 1000);
          x += step;
          facing = Math.sign(step) || facing;
          stride += Math.abs(step);
          frame = 3 + (Math.floor(stride / STRIDE) % 5);
          idle = 0;
        }
      } else {
        x = target;
        idle += dt;
        frame = idle < 700 ? 8 : idle < 1600 ? 1 : 0;
      }
      paint(dt);
      raf = Math.abs(target - x) > 0.5 || Math.abs(ballGoal() - ballX) > 0.5 || idle < 1600 ? requestAnimationFrame(tick) : 0;
    }

    function walkTo(next) {
      target = next;
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    measure();
    paint();
    requestAnimationFrame(() => rail.classList.add('is-ready'));
    new IntersectionObserver((entries, observer) => {
      if (!entries[0].isIntersecting || seen) return;
      seen = true;
      observer.disconnect();
      setTimeout(() => walkTo(tagTarget(0)), 400);
    }, { threshold: 0.4 }).observe(rail);
    tags.forEach((tag, i) => {
      tag.addEventListener('mouseenter', () => walkTo(tagTarget(i)));
      tag.addEventListener('focus', () => walkTo(tagTarget(i)));
    });
    new ResizeObserver(() => {
      measure();
      x = target = clamp(x);
      ballX = null;
      paint();
    }).observe(rail);
  }

  const start = (root = document) => root.querySelectorAll('[data-tagline]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start());
  else start();
  document.addEventListener('shopify:section:load', (event) => start(event.target));
})();
