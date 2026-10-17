(function () {
  // #149: results are grouped as yarn / kit / finished; tabs only change which group shows and keep the keyword.
  const GROUPS = ['yarn', 'kit', 'finished'];
  const BROWSE_MODES = ['favorites'];
  // In the「全部」view the yarn group previews this many cards; the rest stay one tap away on the「毛线」tab.
  const YARN_PREVIEW = 8;

  function normalizeText(value) {
    return String(value || '').normalize('NFKD').replace(/(\p{Script=Latin})\p{Mark}+/gu, '$1')
      .normalize('NFC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  }

  function stateFromSearch(search) {
    const params = new URLSearchParams(search || '');
    return {
      q: String(params.get('q') || '').trim(),
      group: GROUPS.includes(params.get('group')) ? params.get('group') : '',
      browse: BROWSE_MODES.includes(params.get('browse')) ? params.get('browse') : '',
    };
  }

  function queryState(query) {
    return { q: String(query || '').trim(), group: '', browse: '' };
  }

  function urlWithState(href, state) {
    const url = new URL(href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('project_') || key === 'page' || key.startsWith('page_') || key === 'section_id' || key === 'type'
        || key === 'category' || key === 'purchase') url.searchParams.delete(key);
    }
    for (const key of ['q', 'group', 'browse']) {
      if (state[key]) url.searchParams.set(key, state[key]);
      else url.searchParams.delete(key);
    }
    url.hash = '';
    return url;
  }

  function entityKey(entity) { return `${entity.type}:${entity.id}`; }

  function matchesEntity(entity, state, favorites = new Set()) {
    if (state.group && entity.group !== state.group) return false;
    if (state.browse === 'favorites' && !favorites.has(entityKey(entity))) return false;
    const ownCopy = normalizeText(`${entity.title || ''} ${entity.summary || ''} ${entity.tags || ''}`);
    const terms = normalizeText(state.q).split(' ').filter(Boolean);
    return terms.every((term) => ownCopy.includes(term));
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

  function entityFromCard(card) {
    return {
      type: card.dataset.entityType,
      id: card.dataset.entityId,
      group: card.dataset.group || '',
      title: card.dataset.title || '',
      summary: card.dataset.summary || '',
      tags: card.dataset.tags || '',
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
      this.favoritesEmpty = this.querySelector('[data-favorites-empty]');
      this.loginState = this.querySelector('[data-favorites-login]');
      this.unavailableState = this.querySelector('[data-favorites-unavailable]');
      this.error = this.querySelector('[data-search-error]');
      this.loading = this.querySelector('[data-search-loading]');
      this.clearButton = this.querySelector('[data-search-clear]');
      this.tabs = Array.from(this.querySelectorAll('[data-search-tab]'));
      this.count = this.querySelector('[data-search-count]');
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
      const active = Object.values(this.state).some(Boolean);
      this.input.value = this.state.q;
      this.clearButton.hidden = !this.state.q;
      this.heading.textContent = isFavorites ? this.heading.dataset.favoritesTitle : this.heading.dataset.title;
      this.querySelector('[data-favorites-link]').hidden = isFavorites;
      this.tabs.forEach((tab) => tab.setAttribute('aria-pressed', String(tab.dataset.searchTab === this.state.group)));
      this.hideStates();
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

    updateTabCounts(counts) {
      this.tabs.forEach((tab) => {
        const output = tab.querySelector('[data-search-tab-count]');
        if (!output || tab.disabled) return;
        const group = tab.dataset.searchTab;
        output.textContent = counts ? String(group ? counts[group] : counts.yarn + counts.kit + counts.finished) : '';
      });
    }

    render() {
      if (this.state.browse === 'favorites' && !window.YarnFavorites?.enabled) {
        this.hideStates(); this.unavailableState.hidden = false;
        return;
      }
      if (this.state.browse === 'favorites' && !window.YarnFavorites?.authenticated) {
        this.hideStates(); this.loginState.hidden = false;
        return;
      }
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
      }
      this.updateTabCounts(counts);
      const total = matches.yarn + matches.kit + matches.finished;
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
      if (this.finishedNote) this.finishedNote.hidden = noResults || this.state.browse === 'favorites';
      const noFavorites = this.state.browse === 'favorites' && favorites.size === 0;
      this.empty.hidden = !noResults || noFavorites;
      this.favoritesEmpty.hidden = !noResults || !noFavorites;
      this.browsePanel.hidden = !noResults || noFavorites || this.state.browse === 'favorites';
      if (noResults && !noFavorites && this.emptyTitle) {
        if (this.state.q) renderTemplate(this.emptyTitle, this.emptyTitle.dataset.queryTemplate, { query: this.state.q }, ['query']);
        else this.emptyTitle.textContent = this.emptyTitle.dataset.title;
      }
      this.count.hidden = noResults;
      if (this.state.q) renderTemplate(this.count, this.count.dataset.template, { count: total, query: this.state.q }, ['query']);
      else this.count.textContent = '';
      window.YarnFavorites?.render();
    }
  }

  if (typeof customElements !== 'undefined' && !customElements.get('yarn-discovery-search')) customElements.define('yarn-discovery-search', YarnDiscoverySearch);
  if (typeof module !== 'undefined' && module.exports) module.exports = { GROUPS, YARN_PREVIEW, normalizeText, stateFromSearch, queryState, urlWithState, entityKey, matchesEntity, categoryForQuery, paginationUrl, fill, templateParts, YarnDiscoverySearch };
})();
