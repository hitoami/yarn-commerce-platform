/* #85 毛线目录：筛选抽屉、排序与「显示更多」。没有 JS 时，表单与链接按原生 GET 直接跳转。
   #243 手感地图：粗细胶囊、全部分类面板与地图都在这里，对已载入的全部商品做；状态记在网址 ycb_* 参数上。 */
(() => {
  const PRICE_KEYS = ['filter.v.price.gte', 'filter.v.price.lte'];

  // A price band replaces both bounds; "any price" clears them. Other filters stay as submitted.
  function applyBand(params, band) {
    const next = new URLSearchParams(params);
    PRICE_KEYS.forEach((key) => next.delete(key));
    new URLSearchParams(band || '').forEach((value, key) => { if (PRICE_KEYS.includes(key)) next.set(key, value); });
    next.delete('ycb_price');
    next.delete('page');
    return next;
  }

  // The band matching the current URL, comparing numbers because Shopify rewrites 500 as 500.0.
  function activeBand(params, bands) {
    const same = (band) => PRICE_KEYS.every((key) => {
      const a = params.get(key);
      const b = new URLSearchParams(band).get(key);
      return a === null || b === null ? a === b : Number(a) === Number(b);
    });
    return bands.find(same) ?? null;
  }

  // Only same-origin pages of this collection may be appended.
  function nextPageUrl(href, currentHref) {
    const url = new URL(href, currentHref);
    const current = new URL(currentHref);
    if (url.origin !== current.origin || url.pathname !== current.pathname) throw new Error('Invalid collection page URL');
    const preview = current.searchParams.get('preview_theme_id');
    if (preview) url.searchParams.set('preview_theme_id', preview);
    return url;
  }

  // Grams per 100 g → metres, read from the localized spec line (50g · 約75m / 约75m / Approx. 75m / 约1750米).
  function metresPer100g(spec) {
    const grams = /(\d+)\s*g/i.exec(spec || '');
    const metres = /(?:约|約|approx\.?)\s*([\d,]+)(?:\s*±\s*\d+)?\s*(?:m(?![a-z])|米)/i.exec(spec || '');
    if (!grams || !metres || Number(grams[1]) <= 0) return null;
    return Math.round((Number(metres[1].replace(/,/g, '')) * 100) / Number(grams[1]));
  }

  // Five weight bands, thickest first: ≤100m, ≤200m, ≤350m, ≤800m, >800m per 100 g.
  const BAND_LIMITS = [100, 200, 350, 800];
  function weightBand(per) {
    if (per == null) return null;
    const index = BAND_LIMITS.findIndex((limit) => per <= limit);
    return index === -1 ? BAND_LIMITS.length : index;
  }

  const STATE_KEYS = ['ycb_view', 'ycb_weight', 'ycb_beginner', 'ycb_cmp', 'ycb_here'];
  function readState(params) {
    const weight = Number(params.get('ycb_weight'));
    return {
      view: params.get('ycb_view') === 'map' ? 'map' : 'list',
      weight: params.get('ycb_weight') !== null && Number.isInteger(weight) && weight >= 0 && weight <= BAND_LIMITS.length ? weight : null,
      beginner: params.get('ycb_beginner') === '1',
      cmp: (params.get('ycb_cmp') || '').split(',').filter(Boolean).slice(0, 3),
      here: params.get('ycb_here') || '',
    };
  }
  // Category links keep the view and weight; compare and "you are here" belong to one visit only.
  function writeState(params, state, { keepVisit = true } = {}) {
    const next = new URLSearchParams(params);
    STATE_KEYS.forEach((key) => next.delete(key));
    if (state.view === 'map') next.set('ycb_view', 'map');
    if (state.weight !== null) next.set('ycb_weight', String(state.weight));
    if (state.beginner) next.set('ycb_beginner', '1');
    if (keepVisit && state.cmp.length > 1) next.set('ycb_cmp', state.cmp.join(','));
    if (keepVisit && state.here) next.set('ycb_here', state.here);
    return next;
  }

  if (typeof module !== 'undefined') module.exports = { applyBand, activeBand, nextPageUrl, metresPer100g, weightBand, readState, writeState };
  if (typeof document === 'undefined') return;

  function connect(root) {
    root.querySelectorAll('[data-ycb]').forEach((section) => {
      if (section.dataset.connected) return;
      section.dataset.connected = 'true';
      const drawer = section.querySelector('[data-ycb-drawer]');
      const filterForm = section.querySelector('[data-ycb-filter-form]');
      const current = new URLSearchParams(window.location.search);

      section.querySelector('[data-ycb-open]')?.addEventListener('click', () => drawer?.showModal());
      section.querySelector('[data-ycb-close]')?.addEventListener('click', () => drawer?.close());
      drawer?.addEventListener('click', (event) => { if (event.target === drawer) drawer.close(); });

      const bands = Array.from(section.querySelectorAll('[data-ycb-band]'));
      const active = activeBand(current, bands.map((input) => input.value).filter(Boolean));
      bands.forEach((input) => { input.checked = active ? input.value === active : !input.value; });

      filterForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const params = new URLSearchParams(new FormData(filterForm));
        const band = filterForm.querySelector('[data-ycb-band]:checked')?.value || '';
        const next = writeState(applyBand(params, band), { ...readState(new URLSearchParams(window.location.search)), cmp: [], here: '' });
        if (current.has('preview_theme_id')) next.set('preview_theme_id', current.get('preview_theme_id'));
        window.location.assign(`${filterForm.getAttribute('action')}${next.size ? `?${next}` : ''}`);
      });

      const sort = section.querySelector('[data-ycb-sort]');
      sort?.addEventListener('change', () => sort.form.requestSubmit());
      sort?.form.addEventListener('submit', () => {
        const state = readState(new URLSearchParams(window.location.search));
        writeState(new URLSearchParams(), state, { keepVisit: false }).forEach((value, key) => {
          const input = Object.assign(document.createElement('input'), { type: 'hidden', name: key, value });
          sort.form.append(input);
        });
      });

      const grid = section.querySelector('[data-ycb-grid]');
      const status = section.querySelector('[data-ycb-status]');
      section.querySelector('[data-ycb-more]')?.addEventListener('click', async (event) => {
        const link = event.target.closest('[data-ycb-next]');
        if (!link || !grid) return;
        event.preventDefault();
        link.setAttribute('aria-busy', 'true');
        try {
          const url = nextPageUrl(link.getAttribute('href'), window.location.href);
          url.searchParams.set('section_id', section.dataset.sectionId);
          const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
          if (!response.ok) throw new Error('Collection page failed');
          const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
          const items = doc.querySelectorAll('[data-ycb-grid] > li');
          if (!items.length) throw new Error('Collection page is empty');
          const added = Array.from(items, (item) => document.importNode(item, true));
          grid.append(...added);
          const nextStatus = doc.querySelector('[data-ycb-status]');
          if (status && nextStatus) status.textContent = nextStatus.textContent;
          const nextLink = doc.querySelector('[data-ycb-next]');
          if (nextLink) link.setAttribute('href', nextLink.getAttribute('href'));
          else link.remove();
          added[0].querySelector('a')?.focus({ preventScroll: true });
        } catch (error) {
          // Fall back to a normal page load so the shopper still reaches the next products.
          window.location.assign(link.href);
        } finally {
          link.removeAttribute('aria-busy');
        }
      });

      const map = section.querySelector('[data-ycb-map]');
      if (map && grid) setupMap(section, map, grid);
    });
  }

  const STRAND = [7, 5, 3.5, 2, 1];
  const strandSvg = (band) => `<svg class="yarn-strand" width="34" height="14" viewBox="0 0 34 14" aria-hidden="true" focusable="false"><path d="M2 7 C 10 1, 24 13, 32 7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="${STRAND[band]}"/></svg>`;
  const el = (tag, className, text) => Object.assign(document.createElement(tag), className ? { className } : {}, text != null ? { textContent: text } : {});

  function setupMap(section, map, grid) {
    const T = map.dataset;
    const fill = (template, n) => template.replace('__N__', n);
    const board = map.querySelector('[data-ycb-board]');
    const pop = map.querySelector('[data-ycb-pop]');
    const more = section.querySelector('[data-ycb-more]');
    const count = section.querySelector('[data-ycb-count]');
    const countText = count?.textContent;
    const sortForm = section.querySelector('[data-ycb-sort-form]');
    const active = section.querySelector('[data-ycb-active]');
    const weightSheet = section.querySelector('[data-ycb-weight-sheet]');
    const bands = Array.from(weightSheet.querySelectorAll('[data-ycb-weight]:not([data-ycb-weight=""])'), (button) => ({
      name: button.querySelector('.ycb-weight__name').textContent.trim(),
      range: button.querySelector('small').textContent.trim(),
    }));
    const catsSheet = section.querySelector('[data-ycb-cats-sheet]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let state = readState(new URLSearchParams(window.location.search));
    let items = null;
    let loading = null;

    section.querySelectorAll('[data-ycb-js]').forEach((node) => { if (node !== map) node.hidden = false; });
    section.querySelectorAll('a.ycb-chip').forEach((link) => { link.dataset.base = link.getAttribute('href'); });

    const readItem = (li) => {
      const title = li.querySelector('.yx-product-card__title');
      const band = weightBand(metresPer100g(li.dataset.ycbSpec));
      return {
        li, band, handle: li.dataset.ycbItem, beginner: li.hasAttribute('data-ycb-beginner-item'), cats: (li.dataset.ycbCats || '').split(' ').filter(Boolean),
        img: li.dataset.ycbImg || '', spec: li.dataset.ycbSpec || '', name: title?.textContent.trim() || '', url: title?.getAttribute('href') || '#',
        price: li.querySelector('.yx-product-card__price')?.textContent.replace(/\s+/g, ' ').trim() || '',
      };
    };

    // The map, weight and compare need every product, not just the first page.
    function loadAll() {
      if (items) return Promise.resolve(items);
      if (loading) return loading;
      const pages = Number(T.pages) || 1;
      const done = (lis) => { items = lis.map(readItem); if (more) more.hidden = true; return items; };
      if (pages <= 1) return Promise.resolve(done(Array.from(grid.children)));
      map.querySelector('[data-ycb-map-status]').textContent = T.tLoading;
      loading = Promise.all(Array.from({ length: pages }, async (_, index) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(index + 1));
        url.searchParams.set('section_id', section.dataset.sectionId);
        const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error('Collection page failed');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        return Array.from(doc.querySelectorAll('[data-ycb-grid] > li'), (li) => document.importNode(li, true));
      })).then((pagesOfItems) => {
        const lis = pagesOfItems.flat();
        grid.replaceChildren(...lis);
        return done(lis);
      }).catch(() => done(Array.from(grid.children)));
      return loading;
    }

    const catName = (handle) => section.querySelector(`[data-ycb-cat="${CSS.escape(handle)}"] .ycb-chip__name`)?.textContent.trim() || handle;
    const categoryActive = () => Boolean(section.querySelector('[data-ycb-cat] .ycb-chip--active'));

    function ball(item, named) {
      const button = el('button', `ycb-ball${named ? ' ycb-ball--named' : ''}${item.handle === state.here ? ' is-here' : ''}`);
      button.type = 'button';
      button.setAttribute('aria-label', item.name);
      if (item.img) {
        const img = el('img');
        Object.assign(img, { src: item.img, alt: '', width: 56, height: 56 });
        button.append(img);
      } else button.append(el('span', 'ycb-ball__blank'));
      if (item.handle === state.here) button.append(el('span', 'ycb-ball__here', T.tHere));
      else if (named) button.append(el('span', 'ycb-ball__name', item.name));
      button.addEventListener('click', () => openPop(item, button.closest('.ycb-map__row')));
      return button;
    }

    function gutter(index) {
      const gut = el('div', 'ycb-map__gut');
      gut.innerHTML = strandSvg(index);
      gut.append(el('b', '', bands[index].name), el('small', '', bands[index].range));
      return gut;
    }

    function renderBoard() {
      pop.hidden = true;
      map.append(pop);
      board.replaceChildren();
      const placed = items.filter((item) => item.band !== null && (!state.beginner || item.beginner));
      const rows = bands.map((_, index) => index).filter((index) => state.weight === null || state.weight === index);
      const compare = state.cmp.length > 1;
      board.classList.toggle('ycb-map__board--compare', compare);
      if (compare) {
        const head = el('div', 'ycb-map__row ycb-map__head');
        head.append(el('div', 'ycb-map__gut'), ...state.cmp.map((handle) => el('div', 'ycb-map__col', catName(handle))));
        board.append(head);
      }
      const named = compare ? false : categoryActive() || state.weight !== null || state.beginner;
      rows.forEach((index) => {
        const row = el('div', 'ycb-map__row');
        row.append(gutter(index));
        if (compare) {
          state.cmp.forEach((handle) => {
            const col = el('div', 'ycb-map__col');
            const inCol = placed.filter((item) => item.band === index && item.cats.includes(handle));
            if (inCol.length) col.append(...inCol.map((item) => ball(item, false)));
            else col.append(el('span', 'ycb-map__none', '—'));
            row.append(col);
          });
        } else {
          const inRow = placed.filter((item) => item.band === index);
          const balls = el('div', 'ycb-map__balls');
          if (inRow.length) balls.append(...inRow.map((item) => ball(item, named)));
          else balls.append(el('span', 'ycb-map__none', T.tEmpty));
          row.append(balls);
          if (inRow.length) {
            const toList = el('button', 'ycb-map__tolist', `${fill(T.tCount, inRow.length)} ›`);
            toList.type = 'button';
            toList.addEventListener('click', () => update({ view: 'list', weight: index }));
            row.append(toList);
          }
        }
        board.append(row);
      });
      const missing = items.filter((item) => !state.beginner || item.beginner).length - placed.length;
      map.querySelector('[data-ycb-map-status]').textContent = missing > 0 ? fill(T.tMissing, missing) : '';
      const here = board.querySelector('.is-here');
      if (here) here.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function openPop(item, row) {
      pop.querySelector('[data-ycb-pop-image]').src = item.img;
      pop.querySelector('[data-ycb-pop-name]').textContent = item.name;
      pop.querySelector('[data-ycb-pop-spec]').textContent = item.spec;
      pop.querySelector('[data-ycb-pop-price]').textContent = item.price;
      pop.querySelector('[data-ycb-pop-go]').href = item.url;
      row.after(pop);
      pop.hidden = false;
      pop.querySelector('[data-ycb-pop-go]').focus({ preventScroll: true });
    }
    pop.querySelector('[data-ycb-pop-close]').addEventListener('click', () => { pop.hidden = true; });

    function renderList() {
      if (!items) return;
      let shown = 0;
      items.forEach((item) => {
        const visible = (state.weight === null || item.band === state.weight) && (!state.beginner || item.beginner);
        item.li.hidden = !visible;
        if (visible) shown += 1;
      });
      if (count) count.textContent = state.weight === null && !state.beginner ? countText : fill(T.tCount, shown);
    }

    function renderChrome() {
      section.querySelectorAll('[data-ycb-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ycbView === state.view)));
      const isMap = state.view === 'map';
      map.hidden = !isMap;
      grid.hidden = isMap;
      if (sortForm) sortForm.hidden = isMap;
      const beginnerButton = section.querySelector('[data-ycb-beginner]');
      beginnerButton?.classList.toggle('ycb-chip--active', state.beginner);
      beginnerButton?.setAttribute('aria-pressed', String(state.beginner));
      section.toggleAttribute('data-ycb-beginner-on', state.beginner);
      const weightButton = section.querySelector('[data-ycb-weight-open]');
      weightButton?.classList.toggle('ycb-chip--active', state.weight !== null);
      const weightValue = section.querySelector('[data-ycb-weight-value]');
      if (weightValue) weightValue.textContent = state.weight === null ? '' : bands[state.weight].name;
      weightSheet?.querySelectorAll('[data-ycb-weight]').forEach((button) => {
        const value = button.dataset.ycbWeight === '' ? null : Number(button.dataset.ycbWeight);
        button.setAttribute('aria-pressed', String(value === state.weight));
        const counter = button.querySelector('[data-ycb-weight-count]');
        if (counter && items) counter.textContent = items.filter((item) => item.band === value).length;
      });
      active.replaceChildren();
      const chip = (label, clear) => {
        const button = el('button', 'ycb-active__chip', `${label} ✕`);
        button.type = 'button';
        button.setAttribute('aria-label', `${label} · ${T.tClear}`);
        button.addEventListener('click', clear);
        active.append(button);
      };
      if (state.beginner && beginnerButton) chip(beginnerButton.querySelector('.ycb-chip__name').textContent.trim(), () => update({ beginner: false }));
      if (state.weight !== null) chip(`${bands[state.weight].name}`, () => update({ weight: null }));
      if (state.cmp.length > 1) chip(`${T.tCompareOn} ${state.cmp.map(catName).join(' × ')}`, () => update({ cmp: [] }));
      active.hidden = !active.children.length;
      const params = writeState(new URLSearchParams(window.location.search), state);
      window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
      section.querySelectorAll('a.ycb-chip[data-base]').forEach((link) => {
        const url = new URL(link.dataset.base, window.location.href);
        const preview = new URLSearchParams(window.location.search).get('preview_theme_id');
        const next = writeState(url.searchParams, state, { keepVisit: false });
        if (preview) next.set('preview_theme_id', preview);
        link.href = `${url.pathname}${next.size ? `?${next}` : ''}`;
      });
    }

    async function update(change) {
      state = { ...state, ...change };
      renderChrome();
      // 要全部商品时先标「载入中」，列表变淡，载完筛好再恢复，避免先闪出全部商品。
      if (state.view === 'map' || state.weight !== null || state.beginner || state.cmp.length > 1) {
        if (!items) grid.setAttribute('aria-busy', 'true');
        await loadAll();
      }
      renderChrome();
      renderList();
      grid.removeAttribute('aria-busy');
      if (state.view === 'map') renderBoard();
    }

    section.querySelectorAll('[data-ycb-view]').forEach((button) => button.addEventListener('click', () => update({ view: button.dataset.ycbView })));
    section.querySelector('[data-ycb-beginner]')?.addEventListener('click', () => update({ beginner: !state.beginner }));

    section.querySelectorAll('[data-ycb-sheet-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
    [weightSheet, catsSheet].forEach((sheet) => sheet?.addEventListener('click', (event) => { if (event.target === sheet) sheet.close(); }));

    section.querySelector('[data-ycb-weight-open]')?.addEventListener('click', () => {
      weightSheet.showModal();
      loadAll().then(renderChrome);
    });
    weightSheet?.querySelectorAll('[data-ycb-weight]').forEach((button) => button.addEventListener('click', () => {
      weightSheet.close();
      update({ weight: button.dataset.ycbWeight === '' ? null : Number(button.dataset.ycbWeight) });
    }));

    // All categories: the same chips grouped by texture / use; tick 2–3 to compare them side by side on the map.
    const catsBody = catsSheet?.querySelector('[data-ycb-cats-body]');
    const goButton = catsSheet?.querySelector('[data-ycb-cmp-go]');
    const ticked = () => Array.from(catsBody.querySelectorAll('input:checked'), (input) => input.value);
    const syncGo = () => {
      const n = ticked().length;
      goButton.textContent = fill(T.tCompare, Math.max(n, 2));
      goButton.disabled = n < 2;
    };
    function buildCats() {
      if (catsBody.children.length) return;
      const groups = new Map();
      section.querySelectorAll('[data-ycb-cat]').forEach((li) => {
        if (!groups.has(li.dataset.ycbGroup)) groups.set(li.dataset.ycbGroup, []);
        groups.get(li.dataset.ycbGroup).push(li);
      });
      groups.forEach((lis, group) => {
        const title = { texture: T.tGroupTexture, use: T.tGroupUse }[group];
        if (title) catsBody.append(el('h3', 'ycb-cats__group', title));
        const list = el('ul', 'ycb-cats');
        list.setAttribute('role', 'list');
        lis.forEach((li) => {
          const entry = el('li', 'ycb-cats__item');
          const link = li.querySelector('a').cloneNode(true);
          link.classList.add('ycb-cats__link');
          const label = el('label', 'ycb-cats__tick');
          const input = Object.assign(el('input'), { type: 'checkbox', value: li.dataset.ycbCat, checked: state.cmp.includes(li.dataset.ycbCat) });
          input.setAttribute('aria-label', `${T.tCompareOn} ${catName(li.dataset.ycbCat)}`);
          input.addEventListener('change', () => {
            if (ticked().length > 3) input.checked = false;
            syncGo();
          });
          label.append(input, el('span', '', T.tCompareOn));
          entry.append(link, label);
          list.append(entry);
        });
        catsBody.append(list);
      });
      syncGo();
    }
    section.querySelector('[data-ycb-cats-open]')?.addEventListener('click', () => { buildCats(); catsSheet.showModal(); });
    catsSheet?.querySelector('[data-ycb-cmp-clear]').addEventListener('click', () => {
      catsBody.querySelectorAll('input:checked').forEach((input) => { input.checked = false; });
      syncGo();
      if (state.cmp.length) update({ cmp: [] });
    });
    goButton?.addEventListener('click', () => {
      const cmp = ticked();
      catsSheet.close();
      // Compare needs the whole catalogue: leave any category filter behind.
      const current = new URLSearchParams(window.location.search);
      if (Array.from(current.keys()).some((key) => key.startsWith('filter.'))) {
        const next = writeState(new URLSearchParams(), { ...state, view: 'map', cmp, here: '' });
        if (current.has('preview_theme_id')) next.set('preview_theme_id', current.get('preview_theme_id'));
        window.location.assign(`${window.location.pathname}?${next}`);
      } else update({ view: 'map', cmp });
    });

    update({});
  }

  connect(document);
  document.addEventListener('shopify:section:load', (event) => connect(event.target));
})();
