// Issue 332 首页首屏「小猫波浪圆角框」（用户 2026-11-05 由 F6 椭圆改选 F7）：按 .yarn-cat-hero__ring 的实际尺寸画一圈带柔和波浪的毛线，
// 入场时线从第一只猫出发绕一圈，经过谁谁就跳出来，标题逐字出现。每次打开首页都播（用户 2026-11-05 决定）；减少动态效果时直接画完。
(() => {
  const SVG = 'http://www.w3.org/2000/svg';
  // 节奏（用户要求不快不慢）：线 2.6 秒绕完一圈，开头不拖；标题约 1.3 秒逐字出完；说明与按钮在线快画完时淡入。
  const DURATION = 2600;
  // 超椭圆指数：2 是椭圆，越大越接近圆角方框；5 对应原型 F7。
  const EX = 5;

  // 闭合 Catmull-Rom 曲线转三次贝塞尔：线经过每个采样点且很顺。
  const smooth = (pts) => {
    const n = pts.length;
    const p = (i) => pts[(i + n) % n];
    let d = `M${p(0)[0].toFixed(1)},${p(0)[1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}`
        + ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}`
        + ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };

  // 圆角框上位置 t（0 = 正下方，顺时针一圈到 1）。CSS 只能按椭圆摆猫（脚本没加载时的兜底），脚本会改用这里的位置。
  const at = (ring, t) => {
    const a = Math.PI / 2 + t * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [ring.cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / EX) * ring.rx, ring.cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / EX) * ring.ry];
  };

  // 波长按长度定（桌面约 72px、手机约 56px 一个波），框变窄时波浪不会挤成锯齿；采样足够密，曲线才圆滑。
  const wavePath = (ring, start, phone) => {
    const samples = 480;
    const amp = phone ? 4.5 : 6;
    const base = [];
    for (let i = 0; i <= samples; i++) base.push(at(ring, start + i / samples));
    let perimeter = 0;
    for (let i = 1; i <= samples; i++) perimeter += Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]);
    const waves = Math.max(12, Math.round(perimeter / (phone ? 56 : 72)));
    const pts = [];
    let walked = 0;
    for (let i = 0; i < samples; i++) {
      const [x, y] = base[i];
      const [x2, y2] = base[i + 1];
      const len = Math.hypot(x2 - x, y2 - y) || 1;
      const offset = amp * Math.sin((walked / perimeter) * Math.PI * 2 * waves);
      walked += len;
      if (i % 2) continue;
      pts.push([x - ((y2 - y) / len) * offset, y + ((x2 - x) / len) * offset]);
    }
    return smooth(pts);
  };

  // 正弦缓入缓出：起步和收尾都柔，中段匀速，不会像之前那样开头一秒多看不到线。
  const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

  const splitHeading = (heading) => {
    let index = 0;
    // 先拷一份再遍历：边遍历边替换会跳过后面的文字（第二行标题就不逐字出现）。
    [...heading.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach((ch) => {
        if (!ch.trim()) { frag.append(ch); return; }
        const span = document.createElement('span');
        span.className = 'yarn-cat-hero__char';
        span.style.animationDelay = `${0.25 + index++ * 0.09}s`;
        span.textContent = ch;
        frag.append(span);
      });
      node.replaceWith(frag);
    });
  };

  const init = (hero) => {
    const stage = hero.querySelector('.yarn-cat-hero__stage');
    const ringEl = hero.querySelector('.yarn-cat-hero__ring');
    const svg = hero.querySelector('.yarn-cat-hero__thread');
    const cats = [...hero.querySelectorAll('.yarn-cat-hero__cats li')];
    const tOf = (li) => parseFloat(getComputedStyle(li).getPropertyValue('--t')) || 0;
    const start = cats.length ? tOf(cats[0]) : 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = !reduce;

    const draw = () => {
      const box = stage.getBoundingClientRect();
      const r = ringEl.getBoundingClientRect();
      const ring = { cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2, rx: r.width / 2, ry: r.height / 2 };
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const d = wavePath(ring, start, box.width < 750);
      cats.forEach((li) => {
        const [x, y] = at(ring, tOf(li));
        li.style.left = `${x}px`;
        li.style.top = `${y}px`;
      });
      svg.innerHTML = '';
      const line = document.createElementNS(SVG, 'path');
      line.setAttribute('class', 'yarn-cat-hero__line');
      line.setAttribute('d', d);
      svg.append(line);
      return line;
    };

    const line = draw();
    if (!animate) {
      cats.forEach((li) => li.classList.add('is-in'));
      hero.classList.add('is-copy', 'is-done');
    } else {
      splitHeading(hero.querySelector('.yarn-cat-hero__heading'));
      const len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      // 猫在圈上离起点的比例：线画到这里时让它跳出来。
      const pending = cats.map((li) => ({ li, along: (((tOf(li) - start) % 1) + 1) % 1 })).sort((x, y) => x.along - y.along);
      let copyShown = false;
      const begin = performance.now();
      const step = (now) => {
        const progress = Math.min(1, (now - begin) / DURATION);
        const drawn = ease(progress);
        line.style.strokeDashoffset = len * (1 - drawn);
        while (pending.length && pending[0].along <= drawn + 0.01) pending.shift().li.classList.add('is-in');
        if (!copyShown && progress >= 0.75) { copyShown = true; hero.classList.add('is-copy'); }
        if (progress < 1) { requestAnimationFrame(step); return; }
        pending.forEach(({ li }) => li.classList.add('is-in'));
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
        setTimeout(() => hero.classList.add('is-done'), 700);
      };
      requestAnimationFrame(step);
    }

    // E：有鼠标的设备上，背景小圆点被鼠标轻轻推开，移开后慢慢回来（回弹由 CSS transition 负责）；触屏与减少动态效果时不启用。
    if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const dots = [...hero.querySelectorAll('.yarn-cat-hero__dot')];
      let pending = null;
      hero.addEventListener('pointermove', (event) => {
        if (pending) return;
        pending = requestAnimationFrame(() => {
          pending = null;
          dots.forEach((dot) => {
            const r = dot.getBoundingClientRect();
            const dx = r.left + r.width / 2 - event.clientX;
            const dy = r.top + r.height / 2 - event.clientY;
            const dist = Math.hypot(dx, dy) || 1;
            const push = dist < 140 ? ((140 - dist) / 140) * 36 : 0;
            dot.style.transform = push ? `translate(${(dx / dist) * push}px, ${(dy / dist) * push}px)` : '';
          });
        });
      });
      hero.addEventListener('pointerleave', () => dots.forEach((dot) => { dot.style.transform = ''; }));
    }

    let frame;
    new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (hero.classList.contains('is-done')) draw(); });
    }).observe(stage);
  };

  document.querySelectorAll('.yarn-cat-hero').forEach(init);
})();
