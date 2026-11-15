/* #85 毛线目录：筛选抽屉、排序与「显示更多」。没有 JS 时，表单与链接按原生 GET 直接跳转，列表显示这一页的全部商品。
   #366 只留一套筛选，与页头导航同源：每张卡带 yarn-facets 标记（" thick:fine fiber:wool works:hat "），
   粗细、花色、材质、织什么、克重、新手友好都在这里按标记筛；胶囊与抽屉的款数、选中状态、计数和「显示更多」都按当前筛选算。
   价格带与现货是 Search & Discovery，提交抽屉后刷新页面。#243 手感地图的三行与粗细胶囊同一套分档。状态记在网址 ycb_* 参数上。 */
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

  // Navigation filters: one value per group. "beginner" is the 新手友好 chip (token beginner:yes, URL ycb_beginner=1).
  const FACET_GROUPS = ['thick', 'color', 'fiber', 'works', 'grams'];
  const THICK_ROWS = ['chunky', 'medium', 'fine'];
  const STATE_KEYS = ['ycb_view', 'ycb_beginner', 'ycb_here', ...FACET_GROUPS.map((group) => `ycb_${group}`)];
  function readFacets(params) {
    return Object.fromEntries(FACET_GROUPS.map((group) => {
      const value = params.get(`ycb_${group}`) || '';
      return [group, /^[a-z_]{1,24}$/.test(value) ? value : ''];
    }));
  }
  const facetsActive = (facets) => FACET_GROUPS.filter((group) => facets[group]);
  const hasToken = (tokens, token) => ` ${tokens} `.includes(` ${token} `);
  function readState(params) {
    return {
      facets: readFacets(params),
      view: params.get('ycb_view') === 'map' ? 'map' : 'list',
      beginner: params.get('ycb_beginner') === '1',
      here: params.get('ycb_here') || '',
    };
  }
  const isFiltered = (state) => state.beginner || facetsActive(state.facets).length > 0;

  // Whether an item's tokens pass every active filter; `skip` leaves one group out so its options can be counted.
  function matches(tokens, state, skip = null) {
    if (skip !== 'beginner' && state.beginner && !hasToken(tokens, 'beginner:yes')) return false;
    return facetsActive(state.facets).every((group) => group === skip || hasToken(tokens, `${group}:${state.facets[group]}`));
  }

  // How many items each option would show, given the other active filters (faceted counts).
  function countOptions(tokenList, state) {
    const counts = { all: 0, 'beginner:yes': 0 };
    tokenList.forEach((tokens) => {
      if (matches(tokens, state)) counts.all += 1;
      if (matches(tokens, state, 'beginner') && hasToken(tokens, 'beginner:yes')) counts['beginner:yes'] += 1;
      FACET_GROUPS.forEach((group) => {
        if (!matches(tokens, state, group)) return;
        ` ${tokens} `.split(' ').filter((token) => token.startsWith(`${group}:`)).forEach((token) => { counts[token] = (counts[token] || 0) + 1; });
      });
    });
    return counts;
  }

  // "You are here" belongs to one visit only; links and form submits drop it.
  function writeState(params, state, { keepVisit = true } = {}) {
    const next = new URLSearchParams(params);
    STATE_KEYS.forEach((key) => next.delete(key));
    ['ycb_weight', 'ycb_cmp'].forEach((key) => next.delete(key));
    if (state.view === 'map') next.set('ycb_view', 'map');
    if (state.beginner) next.set('ycb_beginner', '1');
    FACET_GROUPS.forEach((group) => { if (state.facets?.[group]) next.set(`ycb_${group}`, state.facets[group]); });
    if (keepVisit && state.here) next.set('ycb_here', state.here);
    return next;
  }

  if (typeof module !== 'undefined') module.exports = { applyBand, activeBand, readState, writeState, matches, countOptions, isFiltered };
  if (typeof document === 'undefined') return;

  const NO_FACETS = Object.fromEntries(FACET_GROUPS.map((group) => [group, '']));
  const el = (tag, className, text) => Object.assign(document.createElement(tag), className ? { className } : {}, text != null ? { textContent: text } : {});
  const fill = (template, values) => Object.entries(values).reduce((text, [key, value]) => text.replace(`__${key}__`, value), template || '');

  function connect(root) {
    root.querySelectorAll('[data-ycb]').forEach((section) => {
      if (section.dataset.connected) return;
      section.dataset.connected = 'true';
      setup(section);
    });
  }

  function setup(section) {
    const drawer = section.querySelector('[data-ycb-drawer]');
    const filterForm = section.querySelector('[data-ycb-filter-form]');
    const grid = section.querySelector('[data-ycb-grid]');
    const map = section.querySelector('[data-ycb-map]');
    const more = section.querySelector('[data-ycb-more]');
    const reveal = section.querySelector('[data-ycb-reveal]');
    const status = section.querySelector('[data-ycb-status]');
    const count = section.querySelector('[data-ycb-count]');
    const total = section.querySelector('[data-ycb-total]');
    const none = section.querySelector('[data-ycb-none]');
    const active = section.querySelector('[data-ycb-active]');
    const sortForm = section.querySelector('[data-ycb-sort-form]');
    const countTemplate = map?.dataset.tCount || '';
    const step = Number(grid?.dataset.ycbStep) || 12;
    const label = (token) => section.querySelector(`[data-ycb-facet="${token}"]`)?.textContent.trim() || '';
    const preview = new URLSearchParams(window.location.search).get('preview_theme_id');
    const shopFiltered = Array.from(new URLSearchParams(window.location.search).keys()).some((key) => key.startsWith('filter.'));
    let state = readState(new URLSearchParams(window.location.search));
    let items = [];
    let limit = step;

    section.querySelectorAll('[data-ycb-js]').forEach((node) => { if (node !== map && node !== reveal) node.hidden = false; });
    section.querySelector('[data-ycb-next]')?.remove();
    section.querySelectorAll('.ycb-grid__item--later').forEach((li) => li.classList.remove('ycb-grid__item--later'));

    section.querySelector('[data-ycb-open]')?.addEventListener('click', () => { syncDrawer(); drawer?.showModal(); });
    section.querySelector('[data-ycb-close]')?.addEventListener('click', () => drawer?.close());
    drawer?.addEventListener('click', (event) => { if (event.target === drawer) drawer.close(); });

    const bands = Array.from(section.querySelectorAll('[data-ycb-band]'));
    const band = activeBand(new URLSearchParams(window.location.search), bands.map((input) => input.value).filter(Boolean));
    bands.forEach((input) => { input.checked = band ? input.value === band : !input.value; });

    // Price and stock need the server; when only navigation filters changed, apply them here without reloading.
    filterForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const params = new URLSearchParams(new FormData(filterForm));
      const facets = readFacets(params);
      const chosenBand = filterForm.querySelector('[data-ycb-band]:checked')?.value || '';
      const next = writeState(applyBand(params, chosenBand), { ...state, facets, here: '' });
      const shopKeys = (search) => Array.from(new URLSearchParams(search)).filter(([key]) => key.startsWith('filter.')).map((pair) => pair.join('=')).sort().join('&');
      drawer.close();
      if (shopKeys(next) === shopKeys(window.location.search)) {
        update({ facets, here: '' });
        return;
      }
      if (preview) next.set('preview_theme_id', preview);
      window.location.assign(`${filterForm.getAttribute('action')}${next.size ? `?${next}` : ''}`);
    });

    const sort = section.querySelector('[data-ycb-sort]');
    sort?.addEventListener('change', () => sort.form.requestSubmit());
    sort?.form.addEventListener('submit', () => {
      writeState(new URLSearchParams(), state, { keepVisit: false }).forEach((value, key) => {
        sort.form.append(Object.assign(document.createElement('input'), { type: 'hidden', name: key, value }));
      });
    });

    if (!grid) return;

    const readItem = (li) => {
      const title = li.querySelector('.yx-product-card__title');
      return {
        li, tokens: li.dataset.ycbFacets || '', handle: li.dataset.ycbItem,
        img: li.dataset.ycbImg || '', spec: li.dataset.ycbSpec || '', name: title?.textContent.trim() || '', url: title?.getAttribute('href') || '#',
        price: li.querySelector('.yx-product-card__price')?.textContent.replace(/\s+/g, ' ').trim() || '',
      };
    };
    items = Array.from(grid.children, readItem);

    // More than one server page (over 48 products): fetch the rest once so filters and counts see every product.
    async function loadRest() {
      const pages = Number(grid.dataset.ycbPages) || 1;
      if (pages <= 1) return;
      grid.setAttribute('aria-busy', 'true');
      try {
        const rest = await Promise.all(Array.from({ length: pages - 1 }, async (_, index) => {
          const url = new URL(window.location.href);
          url.searchParams.set('page', String(index + 2));
          url.searchParams.set('section_id', section.dataset.sectionId);
          const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
          if (!response.ok) throw new Error('Collection page failed');
          const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
          return Array.from(doc.querySelectorAll('[data-ycb-grid] > li'), (li) => document.importNode(li, true));
        }));
        const lis = rest.flat();
        lis.forEach((li) => li.classList.remove('ycb-grid__item--later'));
        grid.append(...lis);
        items = items.concat(lis.map(readItem));
      } catch (error) {
        // Keep the first page; the counts then cover only what is loaded.
      } finally {
        grid.removeAttribute('aria-busy');
      }
    }

    function syncDrawer() {
      const counts = countOptions(items.map((item) => item.tokens), state);
      section.querySelectorAll('[data-ycb-facet-input]').forEach((input) => {
        const group = input.name.replace('ycb_', '');
        input.checked = input.value === (state.facets[group] || '');
        const counter = input.parentElement.querySelector('[data-ycb-option-count]');
        if (!counter) return;
        const n = counts[`${group}:${input.value}`] || 0;
        counter.textContent = n;
        input.disabled = n === 0 && !input.checked;
      });
    }

    function renderChips(counts) {
      const allLink = section.querySelector('[data-ycb-all]');
      const allOn = !isFiltered(state) && !shopFiltered;
      allLink?.classList.toggle('ycb-chip--active', allOn);
      if (allOn) allLink?.setAttribute('aria-current', 'true'); else allLink?.removeAttribute('aria-current');
      // 筛选按钮上的数字 = 价格 / 现货（服务器算好）+ 抽屉里选中的导航筛选组数。
      const pillCount = section.querySelector('[data-ycb-filter-count]');
      if (pillCount) {
        const n = Number(pillCount.dataset.ycbShopN || 0) + facetsActive(state.facets).length;
        pillCount.querySelector('[data-ycb-filter-n]').textContent = n;
        pillCount.hidden = n === 0;
      }
      section.querySelectorAll('[data-ycb-chip]').forEach((chip) => {
        const [group, value] = chip.dataset.ycbChip.split(':');
        const on = group === 'beginner' ? state.beginner : state.facets[group] === value;
        chip.classList.toggle('ycb-chip--active', on);
        chip.setAttribute('aria-pressed', String(on));
        const n = counts[chip.dataset.ycbChip] || 0;
        chip.querySelector('[data-ycb-chip-count]').textContent = n;
        chip.toggleAttribute('data-ycb-zero', n === 0 && !on);
        const next = group === 'beginner' ? { ...state, beginner: !on } : { ...state, facets: { ...state.facets, [group]: on ? '' : value } };
        const params = writeState(new URLSearchParams(window.location.search), next, { keepVisit: false });
        chip.href = `${window.location.pathname}${params.size ? `?${params}` : ''}`;
      });
    }

    function renderActive() {
      active.querySelectorAll('[data-ycb-tag]').forEach((tag) => tag.remove());
      const tag = (text, clear) => {
        const button = el('button', 'ycb-active__chip', `${text} ✕`);
        button.type = 'button';
        button.dataset.ycbTag = '';
        button.setAttribute('aria-label', `${text} · ${map?.dataset.tClear || ''}`);
        button.addEventListener('click', clear);
        active.append(button);
      };
      if (state.beginner) tag(label('beginner:yes'), () => update({ beginner: false }));
      facetsActive(state.facets).forEach((group) => {
        const text = label(`${group}:${state.facets[group]}`);
        if (text) tag(text, () => update({ facets: { ...state.facets, [group]: '' } }));
      });
      active.hidden = !active.children.length;
    }

    function renderList() {
      const matched = items.filter((item) => matches(item.tokens, state));
      items.forEach((item) => { item.li.hidden = true; });
      matched.slice(0, limit).forEach((item) => { item.li.hidden = false; });
      const shown = Math.min(limit, matched.length);
      const isMap = state.view === 'map';
      if (none) none.hidden = matched.length > 0 || isMap;
      if (more) more.hidden = matched.length === 0 || isMap;
      if (status) status.textContent = fill(more?.dataset.tShown, { S: shown, T: matched.length });
      if (reveal) reveal.hidden = shown >= matched.length;
      if (count && countTemplate) count.textContent = fill(countTemplate, { N: matched.length });
      if (total) total.textContent = fill(total.dataset.t, { N: matched.length });
      return matched;
    }

    function renderChrome() {
      section.querySelectorAll('[data-ycb-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ycbView === state.view)));
      const isMap = state.view === 'map';
      if (map) map.hidden = !isMap;
      grid.hidden = isMap;
      if (sortForm) sortForm.hidden = isMap;
      section.toggleAttribute('data-ycb-beginner-on', state.beginner);
      const params = writeState(new URLSearchParams(window.location.search), state);
      window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    }

    function render() {
      renderChrome();
      renderChips(countOptions(items.map((item) => item.tokens), state));
      renderActive();
      const matched = renderList();
      if (map && state.view === 'map') renderMap(matched);
    }

    function update(change) {
      state = { ...state, ...change };
      limit = step;
      render();
    }

    reveal?.addEventListener('click', () => {
      const before = limit;
      limit += step;
      renderList();
      const first = items.filter((item) => matches(item.tokens, state))[before];
      first?.li.querySelector('a')?.focus({ preventScroll: true });
    });

    // Chips filter in place; the 全部 chip clears navigation filters, and also price / stock / category when those are set.
    section.querySelectorAll('[data-ycb-chip]').forEach((chip) => chip.addEventListener('click', (event) => {
      event.preventDefault();
      const [group, value] = chip.dataset.ycbChip.split(':');
      if (group === 'beginner') update({ beginner: !state.beginner, here: '' });
      else update({ facets: { ...state.facets, [group]: state.facets[group] === value ? '' : value }, here: '' });
    }));
    section.querySelector('[data-ycb-all]')?.addEventListener('click', (event) => {
      if (shopFiltered) return;
      event.preventDefault();
      update({ facets: { ...NO_FACETS }, beginner: false, here: '' });
    });
    section.querySelectorAll('[data-ycb-view]').forEach((button) => button.addEventListener('click', () => update({ view: button.dataset.ycbView })));

    // Hand-feel map: three rows, the same thickness bands as the chips.
    const board = map?.querySelector('[data-ycb-board]');
    const pop = map?.querySelector('[data-ycb-pop]');
    const gutters = map ? Object.fromEntries(Array.from(map.querySelector('[data-ycb-gutters]').content.children, (gut) => [gut.dataset.ycbGutter, gut])) : {};
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const thickOf = (item) => THICK_ROWS.find((row) => hasToken(item.tokens, `thick:${row}`)) || null;

    function ball(item, named) {
      const button = el('button', `ycb-ball${named ? ' ycb-ball--named' : ''}${item.handle === state.here ? ' is-here' : ''}`);
      button.type = 'button';
      button.setAttribute('aria-label', item.name);
      if (item.img) button.append(Object.assign(el('img'), { src: item.img, alt: '', width: 56, height: 56 }));
      else button.append(el('span', 'ycb-ball__blank'));
      if (item.handle === state.here) button.append(el('span', 'ycb-ball__here', map.dataset.tHere));
      else if (named) button.append(el('span', 'ycb-ball__name', item.name));
      button.addEventListener('click', () => openPop(item, button.closest('.ycb-map__row')));
      return button;
    }

    function renderMap(matched) {
      pop.hidden = true;
      map.append(pop);
      board.replaceChildren();
      const named = isFiltered(state);
      const rows = THICK_ROWS.filter((row) => !state.facets.thick || state.facets.thick === row);
      rows.forEach((row) => {
        const line = el('div', 'ycb-map__row');
        line.append(gutters[row].cloneNode(true));
        const inRow = matched.filter((item) => thickOf(item) === row);
        const balls = el('div', 'ycb-map__balls');
        if (inRow.length) balls.append(...inRow.map((item) => ball(item, named)));
        else balls.append(el('span', 'ycb-map__none', map.dataset.tEmpty));
        line.append(balls);
        if (inRow.length) {
          const toList = el('button', 'ycb-map__tolist', `${fill(countTemplate, { N: inRow.length })} ›`);
          toList.type = 'button';
          toList.addEventListener('click', () => update({ view: 'list', facets: { ...state.facets, thick: row } }));
          line.append(toList);
        }
        board.append(line);
      });
      const missing = matched.filter((item) => !thickOf(item)).length;
      map.querySelector('[data-ycb-map-status]').textContent = missing > 0 ? fill(map.dataset.tMissing, { N: missing }) : '';
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
    pop?.querySelector('[data-ycb-pop-close]').addEventListener('click', () => { pop.hidden = true; });

    render();
    if (Number(grid.dataset.ycbPages) > 1) loadRest().then(render);
  }

  connect(document);
  document.addEventListener('shopify:section:load', (event) => connect(event.target));
})();
