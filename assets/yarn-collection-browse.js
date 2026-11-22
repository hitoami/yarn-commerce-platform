/* 毛线目录（2026-11-20 Woobles 轻下拉胶囊 + 暖色波浪页头）：
   与 Header 1:1 对齐的 6 个下拉胶囊（粗细 / 花色 / 材质 / 想织什么 / 特点与克重 / 价格与现货）；
   入口所在组自动隐去，同一组内多选取并集，不同组取交集；价格区间与「仅看现货」即时筛选并同步 URL 参数。 */
(() => {
  const PRICE_KEYS = ['filter.v.price.gte', 'filter.v.price.lte'];
  const STOCK_KEY = 'filter.v.availability';

  function applyBand(params, band) {
    const next = new URLSearchParams(params);
    PRICE_KEYS.forEach((key) => next.delete(key));
    new URLSearchParams(band || '').forEach((value, key) => { if (PRICE_KEYS.includes(key)) next.set(key, value); });
    next.delete('ycb_price');
    next.delete('page');
    return next;
  }

  function activeBand(params, bands) {
    const same = (band) => PRICE_KEYS.every((key) => {
      const a = params.get(key);
      const b = new URLSearchParams(band).get(key);
      return a === null || b === null ? a === b : Number(a) === Number(b);
    });
    return bands.find(same) ?? null;
  }

  function parseBand(band) {
    if (!band) return null;
    const p = new URLSearchParams(band);
    return {
      gte: p.has('filter.v.price.gte') ? Number(p.get('filter.v.price.gte')) : null,
      lte: p.has('filter.v.price.lte') ? Number(p.get('filter.v.price.lte')) : null,
    };
  }

  function matchesPrice(price, band) {
    const range = parseBand(band);
    if (!range) return true;
    if (price == null || Number.isNaN(price)) return false;
    if (range.gte !== null && price < range.gte) return false;
    if (range.lte !== null && price > range.lte) return false;
    return true;
  }

  const FACET_GROUPS = ['thick', 'color', 'fiber', 'works', 'grams', 'feature'];
  const STATE_KEYS = ['ycb_beginner', ...FACET_GROUPS.map((group) => `ycb_${group}`)];
  const RETIRED_KEYS = ['ycb_view', 'ycb_here', 'ycb_weight', 'ycb_cmp'];
  const VALUE = /^[a-z_]{1,24}$/;
  const noFacets = () => Object.fromEntries(FACET_GROUPS.map((group) => [group, []]));

  function readFacets(params) {
    return Object.fromEntries(FACET_GROUPS.map((group) => {
      const values = (params.get(`ycb_${group}`) || '').split(',').filter((value) => VALUE.test(value));
      return [group, [...new Set(values)]];
    }));
  }
  const facetsActive = (facets) => FACET_GROUPS.filter((group) => facets[group]?.length);
  const hasToken = (tokens, token) => ` ${tokens} `.includes(` ${token} `);

  function readEntry(params) {
    for (const [key, value] of params) {
      if (key === 'ycb_beginner') return value === '1' ? 'beginner:yes' : '';
      const group = key.startsWith('ycb_') ? key.slice(4) : '';
      if (FACET_GROUPS.includes(group)) return VALUE.test(value) ? `${group}:${value}` : '';
    }
    return '';
  }

  function readState(params) {
    return {
      facets: readFacets(params),
      beginner: params.get('ycb_beginner') === '1',
      entry: readEntry(params),
      inStock: params.get(STOCK_KEY) === '1',
      priceBand: '',
    };
  }
  const isFiltered = (state) => state.beginner || facetsActive(state.facets).length > 0 || Boolean(state.inStock) || Boolean(state.priceBand);

  function matches(tokens, state, skip = null) {
    if (skip !== 'beginner' && state.beginner && !hasToken(tokens, 'beginner:yes')) return false;
    return facetsActive(state.facets).every((group) => group === skip || state.facets[group].some((value) => hasToken(tokens, `${group}:${value}`)));
  }

  function matchesItem(item, state, skip = null) {
    if (!matches(item.tokens, state, skip)) return false;
    if (skip !== 'stock' && state.inStock && !item.available) return false;
    if (skip !== 'price' && state.priceBand && !matchesPrice(item.price, state.priceBand)) return false;
    return true;
  }

  function countOptions(tokenList, state) {
    const counts = { all: 0, 'beginner:yes': 0 };
    tokenList.forEach((entry) => {
      const isObj = entry && typeof entry === 'object';
      const tokens = isObj ? entry.tokens : entry;
      const ok = (skip) => (isObj ? matchesItem(entry, state, skip) : matches(tokens, state, skip));
      if (ok(null)) counts.all += 1;
      if (ok('beginner') && hasToken(tokens, 'beginner:yes')) counts['beginner:yes'] += 1;
      FACET_GROUPS.forEach((group) => {
        if (!ok(group)) return;
        ` ${tokens} `.split(' ').filter((token) => token.startsWith(`${group}:`)).forEach((token) => { counts[token] = (counts[token] || 0) + 1; });
      });
    });
    return counts;
  }

  function writeState(params, state) {
    const next = new URLSearchParams(params);
    [...STATE_KEYS, ...RETIRED_KEYS].forEach((key) => next.delete(key));
    const [entryGroup] = (state.entry || '').split(':');
    const order = entryGroup === 'beginner' ? ['beginner', ...FACET_GROUPS] : [entryGroup, 'beginner', ...FACET_GROUPS];
    [...new Set(order.filter(Boolean))].forEach((group) => {
      if (group === 'beginner') { if (state.beginner) next.set('ycb_beginner', '1'); return; }
      if (state.facets?.[group]?.length) next.set(`ycb_${group}`, state.facets[group].join(','));
    });
    return next;
  }

  if (typeof module !== 'undefined') module.exports = { applyBand, activeBand, parseBand, matchesPrice, readState, writeState, matches, matchesItem, countOptions, isFiltered, readEntry };
  if (typeof document === 'undefined') return;

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
    const grid = section.querySelector('[data-ycb-grid]');
    const more = section.querySelector('[data-ycb-more]');
    const reveal = section.querySelector('[data-ycb-reveal]');
    const status = section.querySelector('[data-ycb-status]');
    const count = section.querySelector('[data-ycb-count]');
    const none = section.querySelector('[data-ycb-none]');
    const active = section.querySelector('[data-ycb-active]');
    const near = section.querySelector('[data-ycb-near]');
    const nearGrid = section.querySelector('[data-ycb-near-grid]');
    const title = section.querySelector('[data-ycb-title]');
    const lead = section.querySelector('[data-ycb-lead]');
    const crumb = section.querySelector('[data-ycb-crumb-entry]');
    const step = Number(grid?.dataset.ycbStep) || 12;
    const label = (token) => section.querySelector(`[data-ycb-facet="${token}"]`)?.textContent.trim() || '';
    const groupLabel = (grp) => section.querySelector(`[data-ycb-group-label="${grp}"]`)?.textContent.trim() || '';
    const entries = Object.fromEntries(Array.from(section.querySelector('[data-ycb-entries]')?.content.children || [], (node) => [node.dataset.entry, node]));
    const defaults = { title: title?.dataset.default ?? title?.textContent ?? '', lead: lead?.dataset.default ?? lead?.innerHTML ?? '' };
    const menus = Array.from(section.querySelectorAll('[data-yfb-menu]'));
    const priceButtons = Array.from(section.querySelectorAll('[data-yfb-price]'));
    const stockButton = section.querySelector('[data-yfb-stock]');

    const initialParams = new URLSearchParams(window.location.search);
    let state = readState(initialParams);
    state.priceBand = activeBand(initialParams, priceButtons.map((b) => b.dataset.yfbPrice)) || '';
    let items = [];
    let limit = step;

    section.querySelectorAll('[data-ycb-js]').forEach((node) => { if (node !== reveal) node.hidden = false; });
    section.querySelector('[data-ycb-next]')?.remove();
    section.querySelectorAll('.ycb-grid__item--later').forEach((li) => li.classList.remove('ycb-grid__item--later'));

    function positionPopover(menu) {
      const pop = menu.querySelector('.yfb__popover');
      const trigger = menu.querySelector('.yfb__trigger');
      if (!pop || !trigger) return;
      if (window.innerWidth <= 749) { pop.style.top = ''; pop.style.left = ''; pop.style.right = ''; return; }
      const rect = trigger.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) { menu.open = false; return; }
      pop.style.top = `${Math.round(rect.bottom + 8)}px`;
      if (menu.dataset.yfbMenu === 'sort') {
        pop.style.left = 'auto';
        pop.style.right = `${Math.max(16, Math.round(window.innerWidth - rect.right))}px`;
      } else {
        pop.style.right = 'auto';
        const w = pop.offsetWidth || 264;
        pop.style.left = `${Math.max(16, Math.min(Math.round(rect.left), window.innerWidth - w - 16))}px`;
      }
    }
    const syncOpenPopover = () => { const open = menus.find((m) => m.open); if (open) positionPopover(open); };
    // One open popover at a time + click outside / Escape closes
    menus.forEach((menu) => menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      menus.forEach((other) => { if (other !== menu) other.open = false; });
      positionPopover(menu);
    }));
    window.addEventListener('scroll', syncOpenPopover, { passive: true });
    window.addEventListener('resize', syncOpenPopover, { passive: true });
    section.querySelector('[data-yfb-filters]')?.addEventListener('scroll', syncOpenPopover, { passive: true });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-yfb-menu]')) menus.forEach((m) => { m.open = false; });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') menus.forEach((m) => { m.open = false; });
    });

    section.querySelectorAll('[data-ycb-sort-opt]').forEach((link) => link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      let next = writeState(new URLSearchParams(window.location.search), state);
      if (state.inStock) next.set(STOCK_KEY, '1'); else next.delete(STOCK_KEY);
      if (state.priceBand) next = applyBand(next, state.priceBand);
      else PRICE_KEYS.forEach((k) => next.delete(k));
      next.set('sort_by', link.dataset.ycbSortOpt || 'manual');
      next.delete('page');
      window.location.assign(`${window.location.pathname}?${next}`);
    }));

    if (!grid) return;

    const readItem = (li) => ({
      li,
      tokens: li.dataset.ycbFacets || '',
      handle: li.dataset.ycbItem,
      price: li.dataset.ycbPrice !== undefined && li.dataset.ycbPrice !== '' ? Number(li.dataset.ycbPrice) : null,
      available: li.dataset.ycbAvailable !== 'false',
    });
    items = Array.from(grid.children, readItem);

    const loadErrors = section.querySelectorAll('[data-ycb-load-error]');
    const showLoadError = (shown) => loadErrors.forEach((node) => { node.hidden = !shown; });
    let restLoading = null;
    let restLoaded = false;

    async function loadRest() {
      const pages = Number(grid.dataset.ycbPages) || 1;
      if (pages <= 1 || restLoaded) return true;
      if (restLoading) return restLoading;
      showLoadError(false);
      grid.setAttribute('aria-busy', 'true');
      restLoading = Promise.all(Array.from({ length: pages - 1 }, async (_, index) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(index + 2));
        url.searchParams.set('section_id', section.dataset.sectionId);
        const response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(15000), headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error('Collection page failed');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const nodes = doc.querySelectorAll('[data-ycb-grid] > li');
        if (!nodes.length) throw new Error('Collection page is empty');
        return Array.from(nodes, (li) => document.importNode(li, true));
      })).then((rest) => {
        const lis = rest.flat();
        lis.forEach((li) => li.classList.remove('ycb-grid__item--later'));
        grid.append(...lis);
        items = items.concat(lis.map(readItem));
        restLoaded = true;
        return true;
      }).catch(() => {
        // Keep page 1 products intact and show a visible retry prompt.
        showLoadError(true);
        return false;
      }).finally(() => {
        grid.removeAttribute('aria-busy');
        restLoading = null;
      });
      return restLoading;
    }

    const entryGroup = () => (state.entry || '').split(':')[0];

    function renderHead() {
      const node = entries[state.entry];
      const entryLabel = label(state.entry);
      if (title) title.textContent = node?.dataset.title || entryLabel || defaults.title;
      if (lead) lead.innerHTML = node ? node.innerHTML : (state.entry ? '' : defaults.lead);
      if (lead) lead.hidden = !lead.textContent.trim();
      if (crumb) { crumb.hidden = !state.entry; crumb.querySelector('[data-ycb-crumb-label]').textContent = entryLabel; }
      document.title = `${title?.textContent || ''} – ${document.title.split(' – ').pop()}`;
    }

    function renderCircles(baseCounts) {
      if (state.entry) section.setAttribute('data-ycb-group', entryGroup()); else section.removeAttribute('data-ycb-group');
      section.querySelectorAll('[data-ycb-circle]').forEach((link) => {
        const token = link.dataset.ycbCircle;
        const on = token === 'all' ? !state.entry : token === state.entry;
        link.classList.toggle('is-current', on);
        if (on) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
        const n = token === 'all' ? items.length : baseCounts[token] || 0;
        if (link.parentElement) link.parentElement.hidden = token !== 'all' && n === 0 && !on;
        const photo = link.querySelector('.ycb-circle__photo');
        if (token !== 'all' && photo && !photo.querySelector('img') && n > 0) {
          const match = items.find((item) => hasToken(item.tokens, token) && item.li.dataset.ycbImg);
          if (match) photo.append(Object.assign(document.createElement('img'), { src: match.li.dataset.ycbImg, alt: '', loading: 'lazy' }));
        }
        const counter = link.querySelector('[data-ycb-circle-count]');
        if (counter) counter.textContent = fill(counter.dataset.t, { N: n });
      });
    }

    function renderMenus(counts, baseCounts) {
      menus.forEach((menu) => {
        const key = menu.dataset.yfbMenu;
        if (key === 'sort') return;
        if (key === 'price_stock') {
          let pickedInMenu = 0;
          if (stockButton) {
            stockButton.setAttribute('aria-pressed', String(Boolean(state.inStock)));
            if (state.inStock) pickedInMenu += 1;
            const stockN = items.filter((item) => matchesItem(item, state, 'stock') && item.available).length;
            const sc = stockButton.querySelector('[data-yfb-stock-count]');
            if (sc) sc.textContent = `(${stockN})`;
          }
          priceButtons.forEach((btn) => {
            const on = state.priceBand === btn.dataset.yfbPrice;
            btn.setAttribute('aria-pressed', String(on));
            if (on) pickedInMenu += 1;
            const pn = items.filter((item) => matchesItem(item, state, 'price') && matchesPrice(item.price, btn.dataset.yfbPrice)).length;
            btn.disabled = pn === 0 && !on;
            const pc = btn.querySelector('[data-yfb-price-count]');
            if (pc) pc.textContent = `(${pn})`;
          });
          menu.classList.toggle('has-active', pickedInMenu > 0);
          const badge = menu.querySelector('[data-yfb-menu-count]');
          if (badge) { badge.hidden = pickedInMenu === 0; badge.textContent = pickedInMenu ? `· ${pickedInMenu}` : ''; }
          const sel = menu.querySelector('[data-yfb-selected]');
          if (sel) sel.textContent = fill(sel.dataset.t, { N: pickedInMenu });
          return;
        }

        let shown = 0;
        let pickedInMenu = 0;
        menu.querySelectorAll('[data-ycb-opt]').forEach((button) => {
          const opt = button.dataset.ycbOpt;
          const [group, value] = opt.split(':');
          const on = group === 'beginner' ? state.beginner : state.facets[group]?.includes(value);
          button.hidden = group === entryGroup() || ((baseCounts[opt] || 0) === 0 && !on);
          if (!button.hidden) shown += 1;
          if (on && opt !== state.entry) pickedInMenu += 1;
          const n = counts[opt] || 0;
          button.setAttribute('aria-pressed', String(Boolean(on)));
          button.disabled = n === 0 && !on;
          const cntEl = button.querySelector('[data-ycb-opt-count]');
          if (cntEl) cntEl.textContent = `(${n})`;
        });
        menu.hidden = key === entryGroup() || shown === 0;
        menu.classList.toggle('has-active', pickedInMenu > 0);
        const badge = menu.querySelector('[data-yfb-menu-count]');
        if (badge) { badge.hidden = pickedInMenu === 0; badge.textContent = pickedInMenu ? `· ${pickedInMenu}` : ''; }
        const sel = menu.querySelector('[data-yfb-selected]');
        if (sel) sel.textContent = fill(sel.dataset.t, { N: pickedInMenu });
      });
    }

    function renderActive() {
      active.querySelectorAll('[data-ycb-tag], [data-ycb-clear]').forEach((node) => node.remove());
      const tag = (text, clear) => {
        const button = el('button', 'yfb__tag', text);
        button.type = 'button';
        button.dataset.ycbTag = '';
        button.append(el('span', 'yfb__tag-x', '×'));
        button.setAttribute('aria-label', `${text} · ${active.dataset.tRemove || ''}`);
        button.addEventListener('click', clear);
        active.append(button);
      };
      if (state.beginner && state.entry !== 'beginner:yes') {
        tag(label('beginner:yes'), () => update({ beginner: false }));
      }
      facetsActive(state.facets).forEach((group) => state.facets[group].forEach((value) => {
        if (`${group}:${value}` === state.entry) return;
        const g = groupLabel(group);
        const v = label(`${group}:${value}`);
        tag(g ? `${g}：${v}` : v, () => update({ facets: { ...state.facets, [group]: state.facets[group].filter((x) => x !== value) } }));
      }));
      if (state.inStock) {
        tag(active.dataset.tStock || '仅看现货', () => update({ inStock: false }));
      }
      if (state.priceBand) {
        const pb = priceButtons.find((b) => b.dataset.yfbPrice === state.priceBand);
        const pLabel = pb?.querySelector('.yfb__opt-name')?.textContent.trim() || state.priceBand;
        tag(pLabel, () => update({ priceBand: '' }));
      }
      const picked = active.querySelectorAll('[data-ycb-tag]').length;
      if (picked) {
        const clear = el('button', 'yfb__clear', active.dataset.tClear || '');
        clear.type = 'button';
        clear.dataset.ycbClear = '';
        clear.addEventListener('click', () => update(entryOnly()));
        active.append(clear);
      }
      active.hidden = !active.children.length;
      return picked;
    }

    function entryOnly() {
      const facets = noFacets();
      const [group, value] = (state.entry || '').split(':');
      if (FACET_GROUPS.includes(group)) facets[group] = [value];
      return { facets, beginner: state.entry === 'beginner:yes', inStock: false, priceBand: '' };
    }

    function renderList(picked) {
      const matched = items.filter((item) => matchesItem(item, state));
      items.forEach((item) => { item.li.hidden = true; });
      matched.slice(0, limit).forEach((item) => { item.li.hidden = false; });
      const shown = Math.min(limit, matched.length);
      if (none) none.hidden = matched.length > 0;
      if (more) more.hidden = matched.length === 0;
      if (status) status.textContent = fill(more?.dataset.tShown, { S: shown, T: matched.length });
      if (reveal) reveal.hidden = shown >= matched.length;
      if (count) count.textContent = fill(count.dataset.t, { N: matched.length });
      renderNear(matched, picked);
    }

    function renderNear(matched, picked) {
      if (!near) return;
      nearGrid.replaceChildren();
      if (!picked || matched.length >= 4) { near.hidden = true; return; }
      const taken = new Set(matched.map((item) => item.handle));
      const refinedGroups = facetsActive(state.facets).filter((group) => group !== entryGroup());
      if (state.beginner && state.entry !== 'beginner:yes') refinedGroups.push('beginner');
      if (state.inStock) refinedGroups.push('stock');
      if (state.priceBand) refinedGroups.push('price');
      const relaxed = items.filter((item) => !taken.has(item.handle) && refinedGroups.some((group) => matchesItem(item, state, group))).slice(0, 4);
      relaxed.forEach((item) => {
        const copy = item.li.cloneNode(true);
        copy.hidden = false;
        copy.removeAttribute('data-ycb-item');
        nearGrid.append(copy);
      });
      near.hidden = relaxed.length === 0;
    }

    function syncUrl() {
      let params = writeState(new URLSearchParams(window.location.search), state);
      if (state.inStock) params.set(STOCK_KEY, '1'); else params.delete(STOCK_KEY);
      if (state.priceBand) params = applyBand(params, state.priceBand);
      else PRICE_KEYS.forEach((k) => params.delete(k));
      window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    }

    function render() {
      const baseCounts = countOptions(items, { facets: noFacets(), beginner: false, entry: '', inStock: false, priceBand: '' });
      const counts = countOptions(items, state);
      renderHead();
      renderCircles(baseCounts);
      renderMenus(counts, baseCounts);
      renderList(renderActive());
      syncUrl();
    }

    function update(change) {
      state = { ...state, ...change };
      limit = step;
      render();
    }

    reveal?.addEventListener('click', () => {
      const before = limit;
      limit += step;
      renderList(active.querySelectorAll('[data-ycb-tag]').length);
      const first = items.filter((item) => matchesItem(item, state))[before];
      first?.li.querySelector('a')?.focus({ preventScroll: true });
    });

    section.querySelectorAll('[data-ycb-circle]').forEach((link) => link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      const token = link.dataset.ycbCircle;
      const facets = noFacets();
      let entry = '';
      if (token !== 'all') {
        const [group, value] = token.split(':');
        facets[group] = [value];
        entry = token;
      }
      menus.forEach((m) => { m.open = false; });
      update({ facets, beginner: false, entry, inStock: false, priceBand: '' });
    }));

    section.querySelectorAll('[data-ycb-opt]').forEach((button) => button.addEventListener('click', () => {
      const [group, value] = button.dataset.ycbOpt.split(':');
      if (group === 'beginner') { update({ beginner: !state.beginner }); return; }
      const values = state.facets[group] || [];
      update({ facets: { ...state.facets, [group]: values.includes(value) ? values.filter((v) => v !== value) : [...values, value] } });
    }));

    stockButton?.addEventListener('click', () => update({ inStock: !state.inStock }));
    priceButtons.forEach((btn) => btn.addEventListener('click', () => {
      update({ priceBand: state.priceBand === btn.dataset.yfbPrice ? '' : btn.dataset.yfbPrice });
    }));

    section.querySelectorAll('[data-yfb-reset]').forEach((btn) => btn.addEventListener('click', () => {
      const grp = btn.dataset.yfbReset;
      if (grp === 'price_stock') { update({ inStock: false, priceBand: '' }); return; }
      if (grp === 'feature_grams') {
        update({ beginner: state.entry === 'beginner:yes', facets: { ...state.facets, feature: [], grams: [] } });
        return;
      }
      update({ facets: { ...state.facets, [grp]: [] } });
    }));

    section.querySelector('[data-ycb-empty-clear]')?.addEventListener('click', (event) => {
      event.preventDefault();
      update(entryOnly());
    });

    section.querySelectorAll('[data-ycb-load-retry]').forEach((button) => button.addEventListener('click', async () => {
      const restoreFocus = document.activeElement === button;
      button.disabled = true;
      const complete = await loadRest();
      if (complete) render();
      else button.closest('[data-ycb-load-error]')?.scrollIntoView?.({ block: 'nearest' });
      button.disabled = false;
      if (restoreFocus) {
        const next = complete ? grid.querySelector('li:not([hidden]) a') : button;
        next?.focus({ preventScroll: true });
      }
    }));

    render();
    if (Number(grid.dataset.ycbPages) > 1) loadRest().then((complete) => { if (complete) render(); });
  }

  connect(document);
  document.addEventListener('shopify:section:load', (event) => connect(event.target));
})();
