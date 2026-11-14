/* 首页常见问题「店员猫答疑」：把问题按钮变成标签页，一次只显示一条回答。
   无 JS 时按钮保持隐藏、所有回答依次显示。方向键 / Home / End 在问题之间移动。 */
(() => {
  class YarnFaqChat extends HTMLElement {
    connectedCallback() {
      this.list = this.querySelector('.yarn-faq-chat__chips');
      this.tabs = [...this.querySelectorAll('.yarn-faq-chat__chip')];
      this.panels = this.tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
      if (!this.list || !this.tabs.length || this.panels.some((panel) => !panel)) return;

      this.list.setAttribute('role', 'tablist');
      this.list.hidden = false;
      this.tabs.forEach((tab, index) => {
        tab.setAttribute('role', 'tab');
        this.panels[index].setAttribute('role', 'tabpanel');
        this.panels[index].setAttribute('aria-labelledby', tab.id);
        tab.addEventListener('click', () => this.select(index));
        tab.addEventListener('keydown', (event) => this.onKey(event, index));
      });
      this.classList.add('is-ready');
      this.select(0, false);
    }

    select(index, animate = true) {
      this.tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        this.panels[i].hidden = !active;
        this.panels[i].classList.toggle('is-entering', active && animate);
      });
    }

    onKey(event, index) {
      const last = this.tabs.length - 1;
      const next = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: last }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const target = next < 0 ? last : next > last ? 0 : next;
      this.select(target);
      this.tabs[target].focus();
      this.tabs[target].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  if (!customElements.get('yarn-faq-chat')) customElements.define('yarn-faq-chat', YarnFaqChat);
})();
