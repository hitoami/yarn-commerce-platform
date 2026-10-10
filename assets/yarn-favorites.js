(function () {
  const INTENT_KEY = 'yarn-favorite-intent';
  function validEntity(entity) {
    return entity && ['project', 'product'].includes(entity.type) && /^[1-9]\d{0,19}$/.test(String(entity.id));
  }
  function endpointUrl(value, href) {
    if (!value) throw new Error('Favorites endpoint is not configured');
    const url = new URL(value, href);
    const current = new URL(href);
    if (url.origin !== current.origin || !/^\/(apps|a|community|tools)\/[^/]+/.test(url.pathname) || url.search || url.hash) throw new Error('Invalid favorites endpoint');
    return url;
  }
  function favoriteKeys(items) {
    return new Set((Array.isArray(items) ? items : []).filter(validEntity).map((entity) => `${entity.type}:${entity.id}`));
  }
  const ElementBase = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;
  class YarnFavorites extends ElementBase {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.saved = new Set();
      this.pending = new Set();
      this.queue = Promise.resolve();
      this.authenticated = this.dataset.authenticated === 'true';
      this.enabled = this.dataset.enabled === 'true';
      this.dialog = this.querySelector('dialog');
      this.notice = this.querySelector('[data-favorite-notice]');
      window.YarnFavorites = this;
      const options = { signal: this.controller.signal };
      document.addEventListener('click', (event) => {
        const button = event.target.closest?.('[data-favorite-button]');
        if (!button) return;
        event.preventDefault();
        const entity = { type: button.dataset.favoriteType, id: button.dataset.favoriteId };
        if (!validEntity(entity)) return;
        if (!this.enabled) { this.announce(this.dataset.unavailable); return; }
        if (!this.authenticated) { this.showLogin(entity); return; }
        this.toggle(entity);
      }, options);
      this.querySelector('[data-favorite-login-close]').addEventListener('click', () => this.dialog.close(), options);
      this.querySelector('[data-favorite-login-link]').addEventListener('click', (event) => {
        if (this.loginIntent) {
          try { sessionStorage.setItem(INTENT_KEY, JSON.stringify({ entity: this.loginIntent, expires: Date.now() + 15 * 60 * 1000 })); } catch (_) { /* Storage is optional for the login handoff. */ }
        }
        const url = new URL(this.dataset.loginUrl, window.location.href);
        if (url.origin === window.location.origin) {
          url.searchParams.set('return_to', window.location.pathname + window.location.search + window.location.hash);
          event.currentTarget.href = url.href;
        }
      }, options);
      window.addEventListener('pageshow', (event) => { if (event.persisted && this.authenticated) this.load({ refresh: true }).catch(() => {}); }, options);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.authenticated) this.load({ refresh: true }).catch(() => {});
      }, options);
      if (this.enabled && this.authenticated) {
        this.load().then(() => this.resumeIntent()).catch(() => {});
      }
    }

    disconnectedCallback() {
      this.controller?.abort(); this.controller = null; clearTimeout(this.noticeTimer);
      if (window.YarnFavorites === this) delete window.YarnFavorites;
    }

    keys() { return new Set(this.saved); }

    async load({ refresh = false } = {}) {
      if (!this.enabled) return { authenticated: false, unavailable: true };
      if (!this.authenticated) return { authenticated: false };
      if (this.loadPromise) return this.loadPromise;
      if (this.loaded && !refresh) return { authenticated: true };
      const task = this.request('GET').then((data) => {
        this.accept(data);
        return { authenticated: this.authenticated };
      });
      this.loadPromise = task;
      try { return await task; } finally { if (this.loadPromise === task) this.loadPromise = null; }
    }

    async request(method, body) {
      const url = endpointUrl(this.dataset.endpoint, window.location.href);
      const response = await fetch(url.href, {
        method, credentials: 'same-origin', cache: 'no-store', signal: this.controller.signal,
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) return { authenticated: false, favorites: [] };
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Favorites request failed');
      return response.json();
    }

    accept(data) {
      if (typeof data.authenticated !== 'boolean' || (data.authenticated && (!Array.isArray(data.favorites) || typeof data.csrfToken !== 'string'))) throw new Error('Invalid favorites response');
      this.authenticated = data.authenticated;
      this.saved = favoriteKeys(data.favorites);
      this.csrfToken = data.csrfToken;
      this.loaded = true;
      this.render();
      document.dispatchEvent(new CustomEvent('yarn:favorites-changed'));
    }

    toggle(entity, desired) {
      const key = `${entity.type}:${entity.id}`;
      if (this.pending.has(key)) return;
      this.pending.add(key);
      this.render();
      this.queue = this.queue.catch(() => {}).then(async () => {
        try {
          const status = await this.load({ refresh: true });
          if (!status.authenticated) { this.showLogin(entity); return; }
          const shouldSave = desired === undefined ? !this.saved.has(key) : desired;
          const data = await this.request('POST', { action: shouldSave ? 'add' : 'remove', entity, csrfToken: this.csrfToken });
          this.accept(data);
          if (!this.authenticated) { this.showLogin(entity); return; }
          if (this.saved.has(key) !== shouldSave) throw new Error('Favorite was not persisted');
          this.announce(shouldSave ? this.dataset.saved : this.dataset.removed);
        } catch (error) {
          if (error.name !== 'AbortError') this.announce(this.dataset.error);
        } finally {
          this.pending.delete(key); this.render();
        }
      });
      return this.queue;
    }

    render() {
      document.querySelectorAll('[data-favorite-button]').forEach((button) => {
        const key = `${button.dataset.favoriteType}:${button.dataset.favoriteId}`;
        const active = this.saved.has(key);
        button.setAttribute('aria-pressed', String(active));
        button.setAttribute('aria-label', active ? button.dataset.labelRemove : button.dataset.labelAdd);
        button.setAttribute('aria-busy', String(this.pending.has(key)));
      });
    }

    showLogin(entity) {
      if (!this.enabled) { this.announce(this.dataset.unavailable); return; }
      this.loginIntent = validEntity(entity) ? entity : null;
      if (!this.dialog.open) this.dialog.showModal();
    }

    resumeIntent() {
      let intent;
      try { intent = JSON.parse(sessionStorage.getItem(INTENT_KEY) || 'null'); sessionStorage.removeItem(INTENT_KEY); } catch (_) { return; }
      if (this.authenticated && intent?.expires > Date.now() && validEntity(intent.entity)) return this.toggle(intent.entity, true);
    }

    announce(message) {
      clearTimeout(this.noticeTimer);
      this.notice.textContent = message; this.notice.hidden = false;
      this.noticeTimer = setTimeout(() => { this.notice.hidden = true; }, 5500);
    }
  }
  if (typeof customElements !== 'undefined' && !customElements.get('yarn-favorites-runtime')) customElements.define('yarn-favorites-runtime', YarnFavorites);
  if (typeof module !== 'undefined' && module.exports) module.exports = { validEntity, endpointUrl, favoriteKeys, YarnFavorites };
})();
