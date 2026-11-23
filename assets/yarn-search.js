(function () {
  // #149 + 2026-11-21: results are grouped as yarn / kit / finished with unified 6-pill facet/price/stock filtering and sorting.
  const GROUPS = ['yarn', 'kit', 'finished'];
  const BROWSE_MODES = ['favorites'];
  const FACET_ALLOWED = {
    thick: ['fine', 'medium', 'chunky'],
    color: ['solid', 'variegated'],
    fiber: ['wool', 'wool_blend', 'cotton', 'synthetic'],
    works: ['sweater', 'hat', 'scarf', 'blanket', 'bag', 'doll'],
    grams: ['small', 'mid', 'big'],
    feature: ['fluffy', 'crochet'],
  };
  const FACET_GROUPS = Object.keys(FACET_ALLOWED);
  const SORT_VALUES = ['price-ascending', 'price-descending', 'created-descending'];
  // In the「全部」view the yarn group previews this many cards; the rest stay one tap away on the「毛线」tab.
  const YARN_PREVIEW = 8;

  function normalizeText(value) {
    return String(value || '').normalize('NFKD').replace(/(\p{Script=Latin})\p{Mark}+/gu, '$1')
      .normalize('NFC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  }

  function emptyFacets() {
    return Object.fromEntries(FACET_GROUPS.map((group) => [group, []]));
  }

  function parsePriceBand(band) {
    if (!band) return null;
    const p = new URLSearchParams(band);
    const gte = p.has('filter.v.price.gte') ? Number(p.get('filter.v.price.gte')) : null;
    const lte = p.has('filter.v.price.lte') ? Number(p.get('filter.v.price.lte')) : null;
    if (gte == null && lte == null) return null;
    return { gte: Number.isFinite(gte) ? gte : null, lte: Number.isFinite(lte) ? lte : null };
  }

  function priceParamFromSearch(params) {
    const out = new URLSearchParams();
    const gte = params.get('filter.v.price.gte');
    const lte = params.get('filter.v.price.lte');
    if (gte !== null && gte !== '' && Number.isFinite(Number(gte))) out.set('filter.v.price.gte', String(Number(gte)));
    if (lte !== null && lte !== '' && Number.isFinite(Number(lte))) out.set('filter.v.price.lte', String(Number(lte)));
    return out.toString();
  }

  function stateFromSearch(search) {
    const params = new URLSearchParams(search || '');
    const facets = emptyFacets();
    for (const group of FACET_GROUPS) {
      const raw = (params.get(`ycb_${group}`) || '').split(',');
      facets[group] = [...new Set(raw.filter((value) => FACET_ALLOWED[group].includes(value)))];
    }
    const sort = params.get('sort_by') || '';
    return {
      q: String(params.get('q') || '').trim(),
      group: GROUPS.includes(params.get('group')) ? params.get('group') : '',
      browse: BROWSE_MODES.includes(params.get('browse')) ? params.get('browse') : '',
      facets,
      beginner: params.get('ycb_beginner') === '1',
      stock: params.get('filter.v.availability') === '1',
      price: priceParamFromSearch(params),
      sort: SORT_VALUES.includes(sort) ? sort : '',
    };
  }

  function queryState(query) {
    return {
      q: String(query || '').trim(),
      group: '',
      browse: '',
      facets: emptyFacets(),
      beginner: false,
      stock: false,
      price: '',
      sort: '',
    };
  }

  function hasFacetFilters(state) {
    if (!state) return false;
    const facets = state.facets || {};
    return Boolean(state.beginner || state.stock || state.price || FACET_GROUPS.some((group) => (facets[group] || []).length > 0));
  }

  function urlWithState(href, state) {
    const url = new URL(href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('project_') || key === 'page' || key.startsWith('page_') || key === 'section_id' || key === 'type'
        || key === 'category' || key === 'purchase' || key.startsWith('ycb_')
        || key === 'filter.v.availability' || key === 'filter.v.price.gte' || key === 'filter.v.price.lte' || key === 'sort_by') {
        url.searchParams.delete(key);
      }
    }
    for (const key of ['q', 'group', 'browse']) {
      if (state[key]) url.searchParams.set(key, state[key]);
      else url.searchParams.delete(key);
    }
    const facets = state.facets || {};
    for (const group of FACET_GROUPS) {
      if ((facets[group] || []).length) url.searchParams.set(`ycb_${group}`, facets[group].join(','));
    }
    if (state.beginner) url.searchParams.set('ycb_beginner', '1');
    if (state.stock) url.searchParams.set('filter.v.availability', '1');
    if (state.price) {
      for (const [k, v] of new URLSearchParams(state.price)) url.searchParams.set(k, v);
    }
    if (state.sort && SORT_VALUES.includes(state.sort)) url.searchParams.set('sort_by', state.sort);
    url.hash = '';
    return url;
  }

  function entityKey(entity) { return `${entity.type}:${entity.id}`; }

  function matchesFacets(entity, state) {
    const facets = state.facets || {};
    const needsFacet = Boolean(state.beginner || FACET_GROUPS.some((group) => (facets[group] || []).length > 0));
    if (needsFacet) {
      const tokens = entity.facets || '';
      if (!tokens.trim()) return false;
      if (state.beginner && !tokens.includes(' beginner:yes ')) return false;
      for (const group of FACET_GROUPS) {
        const chosen = facets[group] || [];
        if (chosen.length && !chosen.some((value) => tokens.includes(` ${group}:${value} `))) return false;
      }
    }
    if (state.stock && entity.available === false) return false;
    const range = parsePriceBand(state.price);
    if (range) {
      const price = entity.price;
      if (price == null || !Number.isFinite(price) || price <= 0) return false;
      if (range.gte != null && price < range.gte) return false;
      if (range.lte != null && price > range.lte) return false;
    }
    return true;
  }

  function matchesEntity(entity, state, favorites = new Set()) {
    if (state.group && entity.group !== state.group) return false;
    if (state.browse === 'favorites' && !favorites.has(entityKey(entity))) return false;
    const ownCopy = normalizeText(`${entity.title || ''} ${entity.summary || ''} ${entity.tags || ''}`);
    const terms = normalizeText(state.q).split(' ').filter(Boolean);
    if (!terms.every((term) => ownCopy.includes(term))) return false;
    return matchesFacets(entity, state);
  }

  // A keyword links to a yarn category only when it names that category (name or maintained alias),
  // e.g.「段染」→「段染渐变」. Colours, fibres or projects stay inside search.
  function categoryForQuery(query, categories) {
    const q = normalizeText(query);
    if (!q) return null;
    return categories.find((category) => [category.name, ...(category.aliases || [])]
      .map(normalizeText).filter(Boolean)
      .some((label) => label === q || (q.length >= 2 && label.includes(q)) || (label.length >= 2 && q.includes(label)))) || null;
  }

  function entityFromCard(card, order) {
    const rawPrice = card.dataset.price;
    const price = rawPrice !== undefined && rawPrice !== '' ? Number(rawPrice) : null;
    return {
      type: card.dataset.entityType,
      id: card.dataset.entityId,
      group: card.dataset.group || '',
      title: card.dataset.title || '',
      summary: card.dataset.summary || '',
      tags: card.dataset.tags || '',
      facets: card.dataset.facets ? ` ${card.dataset.facets.trim()} ` : '',
      price: Number.isFinite(price) ? price : null,
      available: card.dataset.available !== 'false',
      created: Number(card.dataset.created || 0),
      order,
    };
  }

  function compareEntities(a, b, sort) {
    if (sort === 'price-ascending') {
      const pa = a.price && a.price > 0 ? a.price : Number.POSITIVE_INFINITY;
      const pb = b.price && b.price > 0 ? b.price : Number.POSITIVE_INFINITY;
      return pa - pb || a.order - b.order;
    }
    if (sort === 'price-descending') {
      const pa = a.price && a.price > 0 ? a.price : -1;
      const pb = b.price && b.price > 0 ? b.price : -1;
      return pb - pa || a.order - b.order;
    }
    if (sort === 'created-descending') {
      return (b.created || 0) - (a.created || 0) || a.order - b.order;
    }
    return a.order - b.order;
  }

  function paginationUrl(value, currentHref, sectionId) {
    const url = new URL(value, currentHref);
    const current = new URL(currentHref);
    if (url.origin !== current.origin || url.pathname !== current.pathname || url.searchParams.get('section_id') !== sectionId) throw new Error('Invalid discovery pagination URL');
    const preview = current.searchParams.get('preview_theme_id');
    if (preview) url.searchParams.set('preview_theme_id', preview);
    url.hash = '';
    return url;
  }

  function fill(template, values) {
    return Object.entries(values).reduce((text, [key, value]) => text.split(`[${key}]`).join(String(value)), template || '');
  }

  // Splits a locale template into text parts; `key` marks parts that echo shopper or Shopify content (the keyword, a category name).
  function templateParts(template, values) {
    return String(template || '').split(/(\[\w+\])/).filter(Boolean).map((part) => {
      const key = part.match(/^\[(\w+)\]$/)?.[1];
      return key && key in values ? { text: String(values[key]), key } : { text: part };
    });
  }

  // Shopper input is never parsed as HTML; content parts are tagged so language checks do not treat them as theme copy.
  function renderTemplate(element, template, values, contentKeys) {
    element.replaceChildren(...templateParts(template, values).map((part) => {
      if (!part.key || !contentKeys.includes(part.key)) return document.createTextNode(part.text);
      const span = document.createElement('span');
      span.dataset.proofContent = '';
      span.textContent = part.text;
      return span;
    }));
  }

  const ElementBase = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;
  class YarnDiscoverySearch extends ElementBase {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const signal = this.controller.signal;
      this.form = this.querySelector('[data-search-form]');
      this.input = this.form?.querySelector('[name="q"]');
      this.results = this.querySelector('[data-search-results]');
      this.browsePanel = this.querySelector('[data-search-browse]');
      this.empty = this.querySelector('[data-search-empty]');
      this.emptyTitle = this.querySelector('[data-search-empty-title]');
      this.emptyClear = this.querySelector('[data-search-empty-clear]');
      this.favoritesEmpty = this.querySelector('[data-favorites-empty]');
      this.localNote = this.querySelector('[data-favorites-local-note]');
      this.loginState = this.querySelector('[data-favorites-login]');
      this.unavailableState = this.querySelector('[data-favorites-unavailable]');
      this.error = this.querySelector('[data-search-error]');
      this.loading = this.querySelector('[data-search-loading]');
      this.clearButton = this.querySelector('[data-search-clear]');
      this.tabs = Array.from(this.querySelectorAll('[data-search-tab]'));
      this.toolbar = this.querySelector('[data-search-toolbar]');
      this.count = this.querySelector('[data-search-count]');
      this.sortLabel = this.querySelector('[data-search-sort-label]');
      this.sortOptions = Array.from(this.querySelectorAll('[data-search-sort-opt]'));
      this.activeWrap = this.querySelector('[data-search-active]');
      this.activeTags = this.querySelector('[data-search-active-tags]');
      this.clearFiltersButton = this.querySelector('[data-search-clear-filters]');
      this.menus = Array.from(this.querySelectorAll('[data-yfb-menu]'));
      this.optButtons = Array.from(this.querySelectorAll('[data-yfb-opt]'));
      this.stockButton = this.querySelector('[data-yfb-stock]');
      this.priceButtons = Array.from(this.querySelectorAll('[data-yfb-price]'));
      this.heading = this.querySelector('[data-search-title]');
      this.categoryLink = this.querySelector('[data-search-category-link]');
      this.showAll = this.querySelector('[data-search-show-all]');
      this.finishedNote = this.querySelector('[data-search-finished-note]');
      if (!this.input || !this.results) return;
      this.categories = Array.from(this.querySelectorAll('[data-search-category]'), (link) => ({
        name: link.dataset.categoryName || '',
        aliases: String(link.dataset.categoryAliases || '').split(/[,，、]/).map((value) => value.trim()).filter(Boolean),
        href: link.href,
      }));
      this.state = stateFromSearch(window.location.search);
      this.catalogs = Object.fromEntries(GROUPS.map((group) => [group, {
        element: this.querySelector(`[data-search-catalog="${group}"]`),
        next: this.querySelector(`[data-search-next="${group}"]`)?.href || '',
        visited: new Set(),
      }]).filter(([, source]) => source.element));
      this.readCards();
      const listen = (target, event, handler) => target?.addEventListener(event, handler, { signal });
      listen(this.form, 'submit', (event) => { event.preventDefault(); this.setState(queryState(this.input.value)); });
      listen(this.input, 'input', () => { this.clearButton.hidden = !this.input.value; });
      listen(this.clearButton, 'click', () => { this.setState(queryState('')); this.input.focus(); });
      listen(this.querySelector('[data-search-retry]'), 'click', () => this.present());
      this.querySelectorAll('[data-search-suggestion]').forEach((link) => listen(link, 'click', (event) => {
        event.preventDefault(); this.setState(queryState(link.dataset.searchSuggestion));
      }));
      this.tabs.forEach((tab) => listen(tab, 'click', () => {
        if (tab.disabled) return;
        this.setState({ ...this.state, group: tab.dataset.searchTab, browse: this.state.browse });
      }));
      listen(this.showAll, 'click', () => this.setState({ ...this.state, group: 'yarn' }));
      this.sortOptions.forEach((button) => listen(button, 'click', () => {
        const menu = button.closest('[data-yfb-menu]');
        if (menu) menu.open = false;
        this.setState({ ...this.state, sort: button.dataset.searchSortOpt || '' });
      }));
      const positionPopover = (menu) => {
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
      };
      const syncOpenPopover = () => { const open = this.menus.find((m) => m.open); if (open) positionPopover(open); };
      this.menus.forEach((menu) => listen(menu, 'toggle', () => {
        if (!menu.open) return;
        this.menus.forEach((other) => { if (other !== menu) other.open = false; });
        positionPopover(menu);
      }));
      listen(window, 'scroll', syncOpenPopover);
      listen(window, 'resize', syncOpenPopover);
      listen(this.toolbar?.querySelector('.yfb__bar > .yfb__filters'), 'scroll', syncOpenPopover);
      listen(document, 'click', (event) => {
        if (!event.target.closest('.yfb__menu')) this.menus.forEach((menu) => { menu.open = false; });
      });
      listen(document, 'keydown', (event) => {
        if (event.key === 'Escape') this.menus.forEach((menu) => { menu.open = false; });
      });
      this.optButtons.forEach((button) => listen(button, 'click', () => this.toggleFacet(button.dataset.yfbOpt)));
      listen(this.stockButton, 'click', () => this.setState({ ...this.state, stock: !this.state.stock }));
      this.priceButtons.forEach((button) => listen(button, 'click', () => {
        const nextPrice = this.state.price === button.dataset.yfbPrice ? '' : button.dataset.yfbPrice;
        this.setState({ ...this.state, price: nextPrice });
      }));
      this.querySelectorAll('[data-yfb-reset]').forEach((button) => listen(button, 'click', () => this.resetMenu(button.dataset.yfbReset)));
      const clearAllFilters = () => this.setState({ ...this.state, facets: emptyFacets(), beginner: false, stock: false, price: '' });
      listen(this.clearFiltersButton, 'click', clearAllFilters);
      listen(this.emptyClear, 'click', clearAllFilters);
      listen(this.querySelector('[data-favorites-login-button]'), 'click', () => window.YarnFavorites?.showLogin());
      listen(window, 'popstate', () => { this.state = stateFromSearch(window.location.search); this.present(); });
      listen(document, 'yarn:favorites-changed', () => { if (this.state.browse === 'favorites' && this.presentationReady) this.render(); });
      this.present();
    }

    disconnectedCallback() { this.controller?.abort(); this.controller = null; this.loadPromise = null; }

    readCards() {
      this.cards = Array.from(this.results.querySelectorAll('[data-discovery-card]'));
      this.entities = new Map(this.cards.map((card, index) => [card, entityFromCard(card, index)]));
    }

    toggleFacet(token) {
      const [group, value] = String(token || '').split(':');
      if (group === 'beginner') {
        this.setState({ ...this.state, beginner: !this.state.beginner });
        return;
      }
      if (!FACET_ALLOWED[group]?.includes(value)) return;
      const current = this.state.facets[group] || [];
      const nextList = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      this.setState({ ...this.state, facets: { ...this.state.facets, [group]: nextList } });
    }

    resetMenu(menuKey) {
      if (menuKey === 'price_stock') {
        this.setState({ ...this.state, stock: false, price: '' });
        return;
      }
      if (menuKey === 'feature_grams') {
        this.setState({ ...this.state, beginner: false, facets: { ...this.state.facets, feature: [], grams: [] } });
        return;
      }
      if (FACET_ALLOWED[menuKey]) {
        this.setState({ ...this.state, facets: { ...this.state.facets, [menuKey]: [] } });
      }
    }

    setState(state) {
      this.state = state;
      const url = urlWithState(window.location.href, state);
      if (url.href !== window.location.href) window.history.pushState({ discovery: true }, '', url.href);
      this.present();
    }

    async loadCatalogs() {
      if (this.loadPromise) return this.loadPromise;
      const controller = this.controller;
      const task = Promise.all(Object.entries(this.catalogs).map(async ([group, source]) => {
        const known = new Set(Array.from(source.element.querySelectorAll('[data-discovery-card]'), (card) => card.dataset.entityId));
        while (source.next) {
          const url = paginationUrl(source.next, window.location.href, this.dataset.sectionId);
          if (source.visited.has(url.href)) throw new Error('Discovery pagination loop');
          const response = await fetch(url.href, { credentials: 'same-origin', headers: { Accept: 'text/html' }, signal: controller.signal });
          if (!response.ok) throw new Error('Discovery page failed');
          const html = await response.text();
          if (this.controller !== controller) return;
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const page = doc.querySelector(`[data-search-catalog="${group}"]`);
          if (!page) throw new Error('Discovery catalog is missing');
          for (const card of page.querySelectorAll('[data-discovery-card]')) {
            if (known.has(card.dataset.entityId)) continue;
            known.add(card.dataset.entityId);
            source.element.append(document.importNode(card, true));
          }
          source.visited.add(url.href);
          source.next = doc.querySelector(`[data-search-next="${group}"]`)?.getAttribute('href') || '';
        }
      }));
      this.loadPromise = task;
      try { await task; if (this.controller === controller) this.readCards(); }
      finally { if (this.controller === controller && this.loadPromise === task) this.loadPromise = null; }
    }

    hideStates() {
      for (const element of [this.empty, this.favoritesEmpty, this.loginState, this.unavailableState, this.error, this.results]) {
        if (element) element.hidden = true;
      }
    }

    async present() {
      this.presentationReady = false;
      const version = this.presentationVersion = (this.presentationVersion || 0) + 1;
      const controller = this.controller;
      const isFavorites = this.state.browse === 'favorites';
      const active = Boolean(this.state.q || this.state.group || this.state.browse || hasFacetFilters(this.state));
      this.input.value = this.state.q;
      this.clearButton.hidden = !this.state.q;
      this.heading.textContent = isFavorites ? this.heading.dataset.favoritesTitle : this.heading.dataset.title;
      this.classList.toggle('is-favorites', isFavorites);
      this.querySelector('[data-favorites-link]').hidden = isFavorites;
      this.tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.searchTab === this.state.group)));
      const currentSort = this.state.sort || '';
      this.sortOptions.forEach((button) => {
        const activeSort = (button.dataset.searchSortOpt || '') === currentSort;
        button.setAttribute('aria-pressed', String(activeSort));
        if (activeSort && this.sortLabel) {
          this.sortLabel.textContent = (this.sortLabel.dataset.t || '__N__').replace('__N__', button.dataset.sortName || '');
        }
      });
      this.hideStates();
      if (this.localNote) this.localNote.hidden = true;
      if (this.toolbar) this.toolbar.hidden = !active;
      this.browsePanel.hidden = active;
      this.count.textContent = '';
      this.count.hidden = true;
      this.loading.hidden = !active;
      if (!active) { this.updateTabCounts(null); return; }
      try {
        if (isFavorites) {
          if (!window.YarnFavorites) throw new Error('Favorites runtime unavailable');
          const state = await window.YarnFavorites.load({ refresh: true });
          if (this.controller !== controller || this.presentationVersion !== version) return;
          if (state.unavailable) { this.unavailableState.hidden = false; if (this.toolbar) this.toolbar.hidden = true; return; }
          if (!state.authenticated) { this.loginState.hidden = false; if (this.toolbar) this.toolbar.hidden = true; return; }
        }
        await this.loadCatalogs();
        if (this.controller !== controller || this.presentationVersion !== version) return;
        this.presentationReady = true;
        this.render();
      } catch (error) {
        if (this.controller === controller && this.presentationVersion === version && error.name !== 'AbortError') this.error.hidden = false;
      } finally {
        if (this.controller === controller && this.presentationVersion === version) this.loading.hidden = true;
      }
    }

    updateTabCounts(counts) {
      this.tabs.forEach((tab) => {
        const output = tab.querySelector('[data-search-tab-count]');
        if (!output || tab.disabled) return;
        const group = tab.dataset.searchTab;
        output.textContent = counts ? String(group ? counts[group] : counts.yarn + counts.kit + counts.finished) : '';
      });
    }

    sortCatalogs() {
      const sort = this.state.sort || '';
      for (const source of Object.values(this.catalogs)) {
        const children = Array.from(source.element.children);
        children.sort((a, b) => compareEntities(this.entities.get(a), this.entities.get(b), sort));
        source.element.append(...children);
      }
      this.cards = Array.from(this.results.querySelectorAll('[data-discovery-card]'));
    }

    updateFilterUI(favorites) {
      if (!this.toolbar) return;
      const baseQueryState = { q: this.state.q, group: this.state.group, browse: this.state.browse };
      const baseEntities = this.cards.map((card) => this.entities.get(card)).filter((entity) => matchesEntity(entity, baseQueryState, favorites));

      this.optButtons.forEach((button) => {
        const [group, value] = String(button.dataset.yfbOpt || '').split(':');
        const active = group === 'beginner' ? this.state.beginner : (this.state.facets[group] || []).includes(value);
        button.setAttribute('aria-pressed', String(active));
        const probeState = group === 'beginner'
          ? { ...this.state, beginner: true }
          : { ...this.state, facets: { ...this.state.facets, [group]: [value] } };
        const n = baseEntities.filter((entity) => matchesFacets(entity, probeState)).length;
        const countEl = button.querySelector('[data-yfb-opt-count]');
        if (countEl) countEl.textContent = `(${n})`;
        button.disabled = n === 0 && !active;
      });

      if (this.stockButton) {
        this.stockButton.setAttribute('aria-pressed', String(this.state.stock));
        const n = baseEntities.filter((entity) => matchesFacets(entity, { ...this.state, stock: true })).length;
        const countEl = this.stockButton.querySelector('[data-yfb-stock-count]');
        if (countEl) countEl.textContent = `(${n})`;
        this.stockButton.disabled = n === 0 && !this.state.stock;
      }

      this.priceButtons.forEach((button) => {
        const band = button.dataset.yfbPrice;
        const active = this.state.price === band;
        button.setAttribute('aria-pressed', String(active));
        const n = baseEntities.filter((entity) => matchesFacets(entity, { ...this.state, price: band })).length;
        const countEl = button.querySelector('[data-yfb-price-count]');
        if (countEl) countEl.textContent = `(${n})`;
        button.disabled = n === 0 && !active;
      });

      this.menus.forEach((menu) => {
        const key = menu.dataset.yfbMenu;
        if (key === 'sort') return;
        let selected = 0;
        if (key === 'price_stock') selected = (this.state.stock ? 1 : 0) + (this.state.price ? 1 : 0);
        else if (key === 'feature_grams') selected = (this.state.beginner ? 1 : 0) + (this.state.facets.feature?.length || 0) + (this.state.facets.grams?.length || 0);
        else selected = this.state.facets[key]?.length || 0;
        menu.classList.toggle('has-active', selected > 0);
        const badge = menu.querySelector('[data-yfb-menu-count]');
        if (badge) {
          badge.hidden = selected === 0;
          badge.textContent = selected ? `· ${selected}` : '';
        }
        const selectedEl = menu.querySelector('[data-yfb-selected]');
        if (selectedEl) selectedEl.textContent = (selectedEl.dataset.t || '').replace('__N__', String(selected));
      });

      if (!this.activeWrap || !this.activeTags) return;
      const tags = [];
      const groupName = (g) => this.dataset[`group${g[0].toUpperCase()}${g.slice(1)}`] || '';
      const optLabel = (token) => this.optButtons.find((b) => b.dataset.yfbOpt === token)?.querySelector('.yfb__opt-name')?.textContent.trim() || token;
      const colon = /^en/i.test(document.documentElement.lang) ? ': ' : '：';
      for (const group of FACET_GROUPS) {
        for (const value of this.state.facets[group] || []) {
          const token = `${group}:${value}`;
          tags.push({ text: `${groupName(group)}${colon}${optLabel(token)}`, remove: () => this.toggleFacet(token) });
        }
      }
      if (this.state.beginner) {
        tags.push({ text: optLabel('beginner:yes'), remove: () => this.toggleFacet('beginner:yes') });
      }
      if (this.state.stock) {
        tags.push({ text: this.dataset.labelStock || '', remove: () => this.setState({ ...this.state, stock: false }) });
      }
      if (this.state.price) {
        const priceName = this.priceButtons.find((b) => b.dataset.yfbPrice === this.state.price)?.querySelector('.yfb__opt-name')?.textContent.trim() || this.state.price;
        tags.push({ text: `${this.dataset.labelPrice || ''}${colon}${priceName}`, remove: () => this.setState({ ...this.state, price: '' }) });
      }
      this.activeTags.replaceChildren(...tags.map((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'yfb__tag';
        btn.append(document.createTextNode(item.text));
        const x = document.createElement('span');
        x.className = 'yfb__tag-x';
        x.setAttribute('aria-hidden', 'true');
        x.textContent = '×';
        btn.append(x);
        btn.addEventListener('click', item.remove);
        return btn;
      }));
      this.activeWrap.hidden = tags.length === 0;
    }

    render() {
      if (this.localNote) this.localNote.hidden = !(this.state.browse === 'favorites' && window.YarnFavorites?.local && window.YarnFavorites?.enabled);
      if (this.state.browse === 'favorites' && !window.YarnFavorites?.enabled) {
        this.hideStates(); this.unavailableState.hidden = false; if (this.toolbar) this.toolbar.hidden = true;
        return;
      }
      if (this.state.browse === 'favorites' && !window.YarnFavorites?.authenticated) {
        this.hideStates(); this.loginState.hidden = false; if (this.toolbar) this.toolbar.hidden = true;
        return;
      }
      this.sortCatalogs();
      const favorites = window.YarnFavorites?.keys() || new Set();
      const matches = { yarn: 0, kit: 0, finished: 0 };
      const counts = { yarn: 0, kit: 0, finished: 0 };
      const groupState = { ...this.state, group: '' };
      for (const card of this.cards) {
        const entity = this.entities.get(card);
        const matched = matchesEntity(entity, groupState, favorites);
        if (matched && entity.group in counts) counts[entity.group] += 1;
        const inView = matched && (!this.state.group || entity.group === this.state.group);
        const previewed = !(entity.group === 'yarn' && !this.state.group && counts.yarn > YARN_PREVIEW);
        card.hidden = !(inView && previewed);
        if (inView && entity.group in matches) matches[entity.group] += 1;
      }
      for (const group of GROUPS) {
        const section = this.querySelector(`[data-search-group="${group}"]`);
        if (section) section.hidden = matches[group] === 0;
        const groupCount = this.querySelector(`[data-search-group-count="${group}"]`);
        if (groupCount) groupCount.textContent = matches[group] > 0 ? `(${matches[group]})` : '';
      }
      this.updateTabCounts(counts);
      this.updateFilterUI(favorites);
      const total = matches.yarn + matches.kit + matches.finished;
      const filtered = hasFacetFilters(this.state);
      const noResults = total === 0;
      this.results.hidden = noResults;
      const showsYarn = !this.state.group || this.state.group === 'yarn';
      if (this.showAll) {
        this.showAll.hidden = !(showsYarn && !this.state.group && counts.yarn > YARN_PREVIEW);
        this.showAll.textContent = fill(this.showAll.dataset.template, { count: counts.yarn });
      }
      const category = showsYarn && this.state.browse !== 'favorites' ? categoryForQuery(this.state.q, this.categories) : null;
      if (this.categoryLink) {
        this.categoryLink.hidden = !category;
        if (category) {
          this.categoryLink.href = category.href;
          renderTemplate(this.categoryLink, this.categoryLink.dataset.template, { name: category.name }, ['name']);
        }
      }
      if (this.finishedNote) this.finishedNote.hidden = noResults || this.state.browse === 'favorites' || filtered;
      const noFavorites = this.state.browse === 'favorites' && favorites.size === 0;
      this.empty.hidden = !noResults || noFavorites;
      if (this.emptyClear) this.emptyClear.hidden = !filtered;
      this.favoritesEmpty.hidden = !noResults || !noFavorites;
      this.browsePanel.hidden = !noResults || noFavorites || this.state.browse === 'favorites' || filtered;
      if (this.toolbar) this.toolbar.hidden = noFavorites;
      if (noResults && !noFavorites && this.emptyTitle) {
        if (this.state.q && !filtered) renderTemplate(this.emptyTitle, this.emptyTitle.dataset.queryTemplate, { query: this.state.q }, ['query']);
        else this.emptyTitle.textContent = this.emptyTitle.dataset.title;
      }
      this.count.hidden = noResults;
      if (!noResults) {
        const shortTpl = this.count.dataset.shortTemplate;
        if (shortTpl) this.count.textContent = fill(shortTpl, { count: total });
        else if (this.state.q) renderTemplate(this.count, this.count.dataset.template, { count: total, query: this.state.q }, ['query']);
        else this.count.textContent = '';
      }
      window.YarnFavorites?.render();
    }
  }

  if (typeof customElements !== 'undefined' && !customElements.get('yarn-discovery-search')) customElements.define('yarn-discovery-search', YarnDiscoverySearch);
  if (typeof module !== 'undefined' && module.exports) module.exports = { GROUPS, YARN_PREVIEW, normalizeText, stateFromSearch, queryState, urlWithState, hasFacetFilters, entityKey, matchesEntity, compareEntities, categoryForQuery, paginationUrl, fill, templateParts, YarnDiscoverySearch };
})();
