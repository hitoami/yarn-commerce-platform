(function () {
  const CATEGORIES = ['bag', 'scarf', 'home', 'toy'];
  const PURCHASES = ['finished', 'materials', 'inspiration'];
  const BROWSE_MODES = ['all', 'projects', 'products', 'favorites'];
  const PROJECT_CATEGORIES = { bag: ['配饰'], scarf: ['服装'], home: ['家居', '花片'], toy: ['玩偶'] };
  const USE_WORDS = {
    bag: ['包袋', '手提包', '束口袋', '小袋', 'バッグ', '巾着', 'ポーチ', 'bag', 'pouch', 'tote'],
    scarf: ['围巾', '披肩', 'ショール', 'マフラー', 'スカーフ', 'scarf', 'shawl'],
    home: ['家居', '收纳', '篮', '靠垫', '毯', '花片', '杯垫', '収納', 'バスケット', 'クッション', 'ブランケット', '花束', 'basket', 'cushion', 'blanket', 'coaster', 'bouquet'],
    toy: ['玩偶', '娃娃', 'あみぐるみ', 'ぬいぐるみ', 'toy', 'doll', 'amigurumi'],
  };

  function normalizeText(value) {
    return String(value || '').normalize('NFKD').replace(/(\p{Script=Latin})\p{Mark}+/gu, '$1')
      .normalize('NFC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  }

  function stateFromSearch(search) {
    const params = new URLSearchParams(search || '');
    return {
      q: String(params.get('q') || '').trim(),
      category: CATEGORIES.includes(params.get('category')) ? params.get('category') : '',
      purchase: PURCHASES.includes(params.get('purchase')) ? params.get('purchase') : '',
      browse: BROWSE_MODES.includes(params.get('browse')) ? params.get('browse') : '',
    };
  }

  function queryState(query) {
    return { q: String(query || '').trim(), category: '', purchase: '', browse: '' };
  }

  function urlWithState(href, state) {
    const url = new URL(href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('project_') || key === 'page' || key.startsWith('page_') || key === 'section_id' || key === 'type') url.searchParams.delete(key);
    }
    for (const key of ['q', 'category', 'purchase', 'browse']) {
      if (state[key]) url.searchParams.set(key, state[key]);
      else url.searchParams.delete(key);
    }
    url.hash = '';
    return url;
  }

  function entityKey(entity) { return `${entity.type}:${entity.id}`; }

  function categoryMatches(entity, category) {
    if (!category) return true;
    const declared = String(entity.category || '').split(',').map((value) => value.trim()).filter(Boolean);
    if (declared.includes(category)) return true;
    if (entity.type === 'project') return declared.some((value) => PROJECT_CATEGORIES[category]?.includes(value));
    // An explicitly maintained category wins. Text fallback only inspects this Product's own copy.
    if (declared.length) return false;
    const ownCopy = normalizeText(`${entity.title || ''} ${entity.summary || ''}`);
    return (USE_WORDS[category] || []).some((word) => ownCopy.includes(word));
  }

  function matchesEntity(entity, state, favorites = new Set()) {
    if (state.browse === 'projects' && entity.type !== 'project') return false;
    if (state.browse === 'products' && entity.type !== 'product') return false;
    if (state.browse === 'favorites' && !favorites.has(entityKey(entity))) return false;
    if (!categoryMatches(entity, state.category)) return false;
    const capabilities = String(entity.purchase || '').split(',');
    if (state.purchase && !capabilities.includes(state.purchase)) return false;
    const ownCopy = normalizeText(`${entity.title || ''} ${entity.summary || ''} ${entity.tags || ''}`);
    const terms = normalizeText(state.q).split(' ').filter(Boolean);
    return terms.every((term) => ownCopy.includes(term) || (term === '篮子' && ownCopy.includes('篮')));
  }

  function entityFromCard(card) {
    return {
      type: card.dataset.entityType,
      id: card.dataset.entityId,
      title: card.dataset.title || '',
      summary: card.dataset.summary || '',
      tags: card.dataset.tags || '',
      category: card.dataset.category || '',
      purchase: card.dataset.purchase || '',
    };
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

  const ElementBase = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;
  class YarnDiscoverySearch extends ElementBase {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const signal = this.controller.signal;
      this.form = this.querySelector('[data-search-form]');
      this.input = this.form?.querySelector('[name="q"]');
      this.results = this.querySelector('[data-search-results]');
      this.defaultState = this.querySelector('[data-search-default]');
      this.empty = this.querySelector('[data-search-empty]');
      this.favoritesEmpty = this.querySelector('[data-favorites-empty]');
      this.loginState = this.querySelector('[data-favorites-login]');
      this.unavailableState = this.querySelector('[data-favorites-unavailable]');
      this.error = this.querySelector('[data-search-error]');
      this.loading = this.querySelector('[data-search-loading]');
      this.clearButton = this.querySelector('[data-search-clear]');
      this.filterButton = this.querySelector('[data-search-filter]');
      this.dialog = this.querySelector('dialog');
      this.count = this.querySelector('[data-search-count]');
      this.heading = this.querySelector('[data-search-title]');
      if (!this.input || !this.results || !this.dialog) return;
      this.state = stateFromSearch(window.location.search);
      this.catalogs = Object.fromEntries(['project', 'product'].map((type) => [type, {
        element: this.querySelector(`[data-search-catalog="${type}"]`),
        next: this.querySelector(`[data-search-next="${type}"]`)?.href || '',
        visited: new Set(),
      }]));
      this.readCards();
      const listen = (target, event, handler) => target?.addEventListener(event, handler, { signal });
      listen(this.form, 'submit', (event) => { event.preventDefault(); this.setState(queryState(this.input.value)); });
      listen(this.input, 'input', () => { this.clearButton.hidden = !this.input.value; });
      listen(this.clearButton, 'click', () => { this.setState(queryState('')); this.input.focus(); });
      listen(this.querySelector('[data-search-reset]'), 'click', () => { this.setState(queryState('')); this.input.focus(); });
      listen(this.querySelector('[data-search-retry]'), 'click', () => this.present());
      this.querySelectorAll('[data-search-suggestion]').forEach((link) => listen(link, 'click', (event) => {
        event.preventDefault(); this.setState(queryState(link.dataset.searchSuggestion));
      }));
      this.querySelectorAll('[data-search-category]').forEach((button) => listen(button, 'click', () => {
        this.setState({ ...this.state, category: button.dataset.searchCategory, browse: this.state.browse || (this.state.q ? '' : 'all') });
      }));
      listen(this.filterButton, 'click', () => {
        this.dialog.querySelectorAll('[name="purchase"]').forEach((radio) => { radio.checked = radio.value === this.state.purchase; });
        this.dialog.showModal();
      });
      listen(this.querySelector('[data-filter-close]'), 'click', () => this.dialog.close());
      listen(this.querySelector('[data-filter-reset]'), 'click', () => {
        this.dialog.querySelectorAll('[name="purchase"]').forEach((radio) => { radio.checked = !radio.value; });
      });
      listen(this.querySelector('[data-filter-form]'), 'submit', (event) => {
        event.preventDefault();
        const purchase = this.dialog.querySelector('[name="purchase"]:checked')?.value || '';
        this.dialog.close();
        this.setPurchase(purchase);
      });
      this.querySelectorAll('[data-inline-purchase]').forEach((radio) => listen(radio, 'change', () => {
        if (radio.checked) this.setPurchase(radio.value);
      }));
      listen(window.matchMedia('(min-width: 990px)'), 'change', (event) => {
        if (event.matches && this.dialog.open) {
          this.dialog.close();
          this.querySelector('[data-inline-purchase]:checked')?.focus();
        }
      });
      listen(this.dialog, 'click', (event) => {
        if (event.target !== this.dialog) return;
        const box = this.dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) this.dialog.close();
      });
      listen(this.querySelector('[data-favorites-login-button]'), 'click', () => window.YarnFavorites?.showLogin());
      listen(window, 'popstate', () => { this.state = stateFromSearch(window.location.search); this.present(); });
      listen(document, 'yarn:favorites-changed', () => { if (this.state.browse === 'favorites' && this.presentationReady) this.render(); });
      this.present();
    }

    disconnectedCallback() { this.controller?.abort(); this.controller = null; this.loadPromise = null; }

    readCards() {
      this.cards = Array.from(this.results.querySelectorAll('[data-discovery-card]'));
      this.entities = new Map(this.cards.map((card) => [card, entityFromCard(card)]));
    }

    setState(state) {
      this.state = state;
      const url = urlWithState(window.location.href, state);
      if (url.href !== window.location.href) window.history.pushState({ discovery: true }, '', url.href);
      this.present();
    }

    setPurchase(purchase) {
      const browse = purchase === 'inspiration' && this.state.browse === 'products' ? 'all' : this.state.browse;
      this.setState({ ...this.state, purchase, browse: browse || (this.state.q ? '' : 'all') });
    }

    async loadCatalogs() {
      if (this.loadPromise) return this.loadPromise;
      const controller = this.controller;
      const task = Promise.all(Object.entries(this.catalogs).map(async ([type, source]) => {
        const known = new Set(Array.from(source.element.querySelectorAll('[data-discovery-card]'), (card) => card.dataset.entityId));
        while (source.next) {
          const url = paginationUrl(source.next, window.location.href, this.dataset.sectionId);
          if (source.visited.has(url.href)) throw new Error('Discovery pagination loop');
          const response = await fetch(url.href, { credentials: 'same-origin', headers: { Accept: 'text/html' }, signal: controller.signal });
          if (!response.ok) throw new Error('Discovery page failed');
          const html = await response.text();
          if (this.controller !== controller) return;
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const page = doc.querySelector(`[data-search-catalog="${type}"]`);
          if (!page) throw new Error('Discovery catalog is missing');
          for (const card of page.querySelectorAll('[data-discovery-card]')) {
            if (known.has(card.dataset.entityId)) continue;
            known.add(card.dataset.entityId);
            source.element.append(document.importNode(card, true));
          }
          source.visited.add(url.href);
          source.next = doc.querySelector(`[data-search-next="${type}"]`)?.getAttribute('href') || '';
        }
      }));
      this.loadPromise = task;
      try { await task; if (this.controller === controller) this.readCards(); }
      finally { if (this.controller === controller && this.loadPromise === task) this.loadPromise = null; }
    }

    async present() {
      this.presentationReady = false;
      const version = this.presentationVersion = (this.presentationVersion || 0) + 1;
      const controller = this.controller;
      const isFavorites = this.state.browse === 'favorites';
      const active = Object.values(this.state).some(Boolean);
      this.input.value = this.state.q;
      this.clearButton.hidden = !this.state.q;
      this.heading.textContent = isFavorites ? this.heading.dataset.favoritesTitle : this.heading.dataset.title;
      this.querySelector('[data-favorites-link]').hidden = isFavorites;
      this.querySelectorAll('[data-search-category]').forEach((button) => {
        button.setAttribute('aria-pressed', String(active && button.dataset.searchCategory === this.state.category));
      });
      this.filterButton.dataset.active = String(Boolean(this.state.purchase));
      this.querySelectorAll('[data-inline-purchase], [data-filter-form] [name="purchase"]').forEach((radio) => {
        radio.checked = radio.value === this.state.purchase;
      });
      this.defaultState.hidden = active;
      this.empty.hidden = true;
      this.favoritesEmpty.hidden = true;
      this.loginState.hidden = true;
      this.unavailableState.hidden = true;
      this.error.hidden = true;
      this.results.hidden = true;
      this.count.textContent = '';
      this.loading.hidden = !active;
      if (!active) return;
      try {
        if (isFavorites) {
          if (!window.YarnFavorites) throw new Error('Favorites runtime unavailable');
          const state = await window.YarnFavorites.load({ refresh: true });
          if (this.controller !== controller || this.presentationVersion !== version) return;
          if (state.unavailable) { this.unavailableState.hidden = false; return; }
          if (!state.authenticated) { this.loginState.hidden = false; return; }
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

    render() {
      if (this.state.browse === 'favorites' && !window.YarnFavorites?.enabled) {
        this.results.hidden = true; this.empty.hidden = true; this.favoritesEmpty.hidden = true; this.loginState.hidden = true; this.unavailableState.hidden = false;
        return;
      }
      if (this.state.browse === 'favorites' && !window.YarnFavorites?.authenticated) {
        this.results.hidden = true; this.empty.hidden = true; this.favoritesEmpty.hidden = true; this.loginState.hidden = false;
        return;
      }
      const favorites = window.YarnFavorites?.keys() || new Set();
      const counts = { project: 0, product: 0 };
      for (const card of this.cards) {
        const entity = this.entities.get(card);
        const matches = matchesEntity(entity, this.state, favorites);
        card.hidden = !matches;
        if (matches) counts[entity.type] += 1;
        if (entity.type === 'project') {
          const link = card.querySelector('.yp-card__link');
          const url = new URL(link.href, window.location.href);
          if (this.state.purchase === 'finished' || this.state.purchase === 'materials') url.searchParams.set('project_mode', this.state.purchase);
          else url.searchParams.delete('project_mode');
          link.href = url.href;
        }
      }
      for (const type of ['project', 'product']) this.querySelector(`[data-search-group="${type}"]`).hidden = counts[type] === 0;
      const noResults = counts.project + counts.product === 0;
      this.results.hidden = noResults;
      const noFavorites = this.state.browse === 'favorites' && favorites.size === 0;
      this.empty.hidden = !noResults || noFavorites;
      this.favoritesEmpty.hidden = !noResults || !noFavorites;
      this.count.textContent = this.count.dataset.countTemplate.replace('[projects]', counts.project).replace('[products]', counts.product);
      window.YarnFavorites?.render();
    }
  }

  if (typeof customElements !== 'undefined' && !customElements.get('yarn-discovery-search')) customElements.define('yarn-discovery-search', YarnDiscoverySearch);
  if (typeof module !== 'undefined' && module.exports) module.exports = { normalizeText, stateFromSearch, queryState, urlWithState, entityKey, categoryMatches, matchesEntity, paginationUrl, YarnDiscoverySearch };
})();
