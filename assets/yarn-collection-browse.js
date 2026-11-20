/* 毛线目录（分类页，锦晨 2026-11-20 选定样稿 v2）。
   顾客从首页 / 导航带着一个入口进来（如 ?ycb_color=variegated），页头标题和说明换成这个入口；一排圆图切换同组的其他分类；
   「筛选」默认收起（全部毛线默认展开），展开后其余几组各占一行，同一行可多选（取并集），不同行取交集；数字是在其他已选条件下还剩几款，0 款变灰。
   结果少于 4 款时列出「放宽一个条件」的毛线。状态记在网址 ycb_* 参数上：入口那一组写在最前面，重新打开页面仍认得入口。
   每张卡带 yarn-facets 标记（" thick:fine fiber:wool works:hat "）。价格带与现货仍是 Search & Discovery，在抽屉里提交后刷新页面。
   没有 JS 时，表单与链接按原生 GET 跳转，列表显示这一页的全部商品。 */
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

  // The entry is the first ycb_* filter in the URL when it holds one value: that is what the customer clicked to get here.
  function readEntry(params) {
    for (const [key, value] of params) {
      if (key === 'ycb_beginner') return value === '1' ? 'beginner:yes' : '';
      const group = key.startsWith('ycb_') ? key.slice(4) : '';
      if (FACET_GROUPS.includes(group)) return VALUE.test(value) ? `${group}:${value}` : '';
    }
    return '';
  }

  function readState(params) {
    return { facets: readFacets(params), beginner: params.get('ycb_beginner') === '1', entry: readEntry(params) };
  }
  const isFiltered = (state) => state.beginner || facetsActive(state.facets).length > 0;

  // Whether an item passes every active filter. Values inside one group are alternatives (OR); groups combine (AND).
  // `skip` leaves one group out so its options can be counted.
  function matches(tokens, state, skip = null) {
    if (skip !== 'beginner' && state.beginner && !hasToken(tokens, 'beginner:yes')) return false;
    return facetsActive(state.facets).every((group) => group === skip || state.facets[group].some((value) => hasToken(tokens, `${group}:${value}`)));
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

  // The entry's group goes first so a reload or a shared link keeps the same page title.
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

  if (typeof module !== 'undefined') module.exports = { applyBand, activeBand, readState, writeState, matches, countOptions, isFiltered, readEntry };
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
    const drawer = section.querySelector('[data-ycb-drawer]');
    const filterForm = section.querySelector('[data-ycb-filter-form]');
    const grid = section.querySelector('[data-ycb-grid]');
    const more = section.querySelector('[data-ycb-more]');
    const reveal = section.querySelector('[data-ycb-reveal]');
    const status = section.querySelector('[data-ycb-status]');
    const count = section.querySelector('[data-ycb-count]');
    const total = section.querySelector('[data-ycb-total]');
    const none = section.querySelector('[data-ycb-none]');
    const active = section.querySelector('[data-ycb-active]');
    const refine = section.querySelector('[data-ycb-refine]');
    const near = section.querySelector('[data-ycb-near]');
    const nearGrid = section.querySelector('[data-ycb-near-grid]');
    const title = section.querySelector('[data-ycb-title]');
    const lead = section.querySelector('[data-ycb-lead]');
    const crumb = section.querySelector('[data-ycb-crumb-entry]');
    const step = Number(grid?.dataset.ycbStep) || 12;
    const label = (token) => section.querySelector(`[data-ycb-facet="${token}"]`)?.textContent.trim() || '';
    const entries = Object.fromEntries(Array.from(section.querySelector('[data-ycb-entries]')?.content.children || [], (node) => [node.dataset.entry, node]));
    const preview = new URLSearchParams(window.location.search).get('preview_theme_id');
    const defaults = { title: title?.dataset.default ?? title?.textContent ?? '', lead: lead?.dataset.default ?? lead?.innerHTML ?? '' };
    let state = readState(new URLSearchParams(window.location.search));
    let items = [];
    let limit = step;

    section.querySelectorAll('[data-ycb-js]').forEach((node) => { if (node !== reveal) node.hidden = false; });
    section.querySelector('[data-ycb-next]')?.remove();
    section.querySelectorAll('.ycb-grid__item--later').forEach((li) => li.classList.remove('ycb-grid__item--later'));

    section.querySelector('[data-ycb-open]')?.addEventListener('click', () => drawer?.showModal());
    section.querySelector('[data-ycb-close]')?.addEventListener('click', () => drawer?.close());
    drawer?.addEventListener('click', (event) => { if (event.target === drawer) drawer.close(); });

    const bands = Array.from(section.querySelectorAll('[data-ycb-band]'));
    const band = activeBand(new URLSearchParams(window.location.search), bands.map((input) => input.value).filter(Boolean));
    bands.forEach((input) => { input.checked = band ? input.value === band : !input.value; });

    // Price and stock need the server: submit the drawer as a normal GET, carrying the in-page filters along.
    filterForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const chosenBand = filterForm.querySelector('[data-ycb-band]:checked')?.value || '';
      const next = writeState(applyBand(new URLSearchParams(new FormData(filterForm)), chosenBand), state);
      if (preview) next.set('preview_theme_id', preview);
      window.location.assign(`${filterForm.getAttribute('action')}${next.size ? `?${next}` : ''}`);
    });

    const sort = section.querySelector('[data-ycb-sort]');
    sort?.addEventListener('change', () => sort.form.requestSubmit());
    sort?.form.addEventListener('submit', () => {
      writeState(new URLSearchParams(), state).forEach((value, key) => {
        sort.form.append(Object.assign(document.createElement('input'), { type: 'hidden', name: key, value }));
      });
    });

    if (!grid) return;

    const readItem = (li) => ({ li, tokens: li.dataset.ycbFacets || '', handle: li.dataset.ycbItem });
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

    const entryGroup = () => (state.entry || '').split(':')[0];

    // Page head: the entry's own title and words; without an entry, the collection's.
    function renderHead() {
      const node = entries[state.entry];
      const entryLabel = label(state.entry);
      if (title) title.textContent = node?.dataset.title || entryLabel || defaults.title;
      if (lead) lead.innerHTML = node ? node.innerHTML : (state.entry ? '' : defaults.lead);
      if (lead) lead.hidden = !lead.textContent.trim();
      if (crumb) { crumb.hidden = !state.entry; crumb.querySelector('[data-ycb-crumb-label]').textContent = entryLabel; }
      document.title = `${title?.textContent || ''} – ${document.title.split(' – ').pop()}`;
    }

    // Circle row: only on a category entry, showing that entry's siblings (CSS picks the row from data-ycb-group).
    // 全部毛线 and 新手推荐 have no siblings to switch to, so no circles there.
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

    // Refine rows: every group except the entry's, multi-select inside a row.
    // Options with 0 matches across the entire collection stay hidden (covers items loaded past page 1).
    function renderRefine(counts, baseCounts) {
      section.querySelectorAll('[data-ycb-row]').forEach((row) => {
        let shown = 0;
        row.querySelectorAll('[data-ycb-opt]').forEach((button) => {
          const opt = button.dataset.ycbOpt;
          const [group, value] = opt.split(':');
          const on = group === 'beginner' ? state.beginner : state.facets[group]?.includes(value);
          // The entry's own group is the page itself, so its options leave the rows (新手推荐 sits in the 特点 row).
          button.hidden = group === entryGroup() || ((baseCounts[opt] || 0) === 0 && !on);
          if (!button.hidden) shown += 1;
          const n = counts[opt] || 0;
          button.setAttribute('aria-pressed', String(Boolean(on)));
          button.disabled = n === 0 && !on;
          button.querySelector('[data-ycb-opt-count]').textContent = n;
        });
        row.hidden = shown === 0;
      });
    }

    // Picked refine options as removable tags (the entry itself is the page, not a tag).
    function renderActive() {
      active.querySelectorAll('[data-ycb-tag], [data-ycb-clear]').forEach((node) => node.remove());
      const tag = (text, clear) => {
        const button = el('button', 'ycb-active__chip', text);
        button.type = 'button';
        button.dataset.ycbTag = '';
        button.append(el('span', 'ycb-active__x', '×'));
        button.setAttribute('aria-label', `${text} · ${active.dataset.tRemove || ''}`);
        button.addEventListener('click', clear);
        active.append(button);
      };
      if (state.beginner && state.entry !== 'beginner:yes') tag(label('beginner:yes'), () => update({ beginner: false }));
      facetsActive(state.facets).forEach((group) => state.facets[group].forEach((value) => {
        if (`${group}:${value}` === state.entry) return;
        tag(label(`${group}:${value}`), () => update({ facets: { ...state.facets, [group]: state.facets[group].filter((v) => v !== value) } }));
      }));
      const picked = active.querySelectorAll('[data-ycb-tag]').length;
      if (picked) {
        const clear = el('button', 'ycb-active__clear', active.dataset.tClear || '');
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
      return { facets, beginner: state.entry === 'beginner:yes' };
    }

    function renderList(picked) {
      const matched = items.filter((item) => matches(item.tokens, state));
      items.forEach((item) => { item.li.hidden = true; });
      matched.slice(0, limit).forEach((item) => { item.li.hidden = false; });
      const shown = Math.min(limit, matched.length);
      if (none) none.hidden = matched.length > 0;
      if (more) more.hidden = matched.length === 0;
      if (status) status.textContent = fill(more?.dataset.tShown, { S: shown, T: matched.length });
      if (reveal) reveal.hidden = shown >= matched.length;
      if (count) count.textContent = fill(count.dataset.t, { N: matched.length });
      if (total) total.textContent = fill(total.dataset.t, { N: matched.length });
      renderNear(matched, picked);
    }

    // Fewer than 4 results after refining: show yarns that miss only one of the picked conditions.
    function renderNear(matched, picked) {
      if (!near) return;
      nearGrid.replaceChildren();
      if (!picked || matched.length >= 4) { near.hidden = true; return; }
      const taken = new Set(matched.map((item) => item.handle));
      const refinedGroups = facetsActive(state.facets).filter((group) => group !== entryGroup());
      if (state.beginner && state.entry !== 'beginner:yes') refinedGroups.push('beginner');
      const relaxed = items.filter((item) => !taken.has(item.handle) && refinedGroups.some((group) => matches(item.tokens, state, group))).slice(0, 4);
      relaxed.forEach((item) => {
        const copy = item.li.cloneNode(true);
        copy.hidden = false;
        copy.removeAttribute('data-ycb-item');
        nearGrid.append(copy);
      });
      near.hidden = relaxed.length === 0;
    }

    function syncUrl() {
      const params = writeState(new URLSearchParams(window.location.search), state);
      window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    }

    function render() {
      const tokenList = items.map((item) => item.tokens);
      const baseCounts = countOptions(tokenList, { facets: noFacets(), beginner: false, entry: '' });
      const counts = countOptions(tokenList, state);
      renderHead();
      renderCircles(baseCounts);
      renderRefine(counts, baseCounts);
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
      const first = items.filter((item) => matches(item.tokens, state))[before];
      first?.li.querySelector('a')?.focus({ preventScroll: true });
    });

    // The refine rows start open on 全部毛线 (nothing picked yet, so they are the way in) and closed on an entry.
    function setOpen(open) {
      refine?.classList.toggle('is-open', open);
      section.querySelector('[data-ycb-refine-toggle]')?.setAttribute('aria-expanded', String(open));
    }

    // Circles switch the entry in place and drop the refine options.
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
      setOpen(!entry);
      update({ facets, beginner: false, entry });
    }));

    section.querySelector('[data-ycb-refine-toggle]')?.addEventListener('click', (event) => {
      const open = !refine.classList.contains('is-open');
      refine.classList.toggle('is-open', open);
      event.currentTarget.setAttribute('aria-expanded', String(open));
    });

    section.querySelectorAll('[data-ycb-opt]').forEach((button) => button.addEventListener('click', () => {
      const [group, value] = button.dataset.ycbOpt.split(':');
      if (group === 'beginner') { update({ beginner: !state.beginner }); return; }
      const values = state.facets[group] || [];
      update({ facets: { ...state.facets, [group]: values.includes(value) ? values.filter((v) => v !== value) : [...values, value] } });
    }));

    // Arriving with refine options already in the URL (a shared link): open the rows so they can be seen.
    if (!state.entry || (active && facetsActive(state.facets).some((group) => group !== entryGroup()))) setOpen(true);

    render();
    if (Number(grid.dataset.ycbPages) > 1) loadRest().then(render);
  }

  connect(document);
  document.addEventListener('shopify:section:load', (event) => connect(event.target));
})();
