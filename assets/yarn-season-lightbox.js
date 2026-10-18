// Season feature page (#181): tap a finished-piece photo to view the yarn's photos full screen.
// Swipe (scroll-snap), the ‹ › buttons, arrow keys or the thumbnails change photo; ✕, Esc or a downward swipe closes,
// and focus returns to the photo that opened the viewer.
class YarnSeasonLightbox extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.track = this.querySelector('[data-track]');
    this.thumbs = this.querySelector('[data-thumbs]');
    this.count = this.querySelector('[data-count]');
    this.caption = this.querySelector('[data-caption]');
    this.index = 0;
    this.photos = [];

    document.addEventListener('click', event => {
      const shot = event.target.closest('.yx-season-page__shot');
      if (shot) this.open(shot);
    });
    this.querySelector('[data-close]').addEventListener('click', () => this.dialog.close());
    this.querySelectorAll('[data-step]').forEach(button => {
      button.addEventListener('click', () => this.go(this.index + Number(button.dataset.step)));
    });
    this.thumbs.addEventListener('click', event => {
      const thumb = event.target.closest('[data-index]');
      if (thumb) this.go(Number(thumb.dataset.index));
    });
    this.dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') this.go(this.index - 1);
      if (event.key === 'ArrowRight') this.go(this.index + 1);
    });
    this.dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('yx-lightbox-open');
      if (this.opener) this.opener.focus({ preventScroll: true });
    });
    // Clicking the dark area around the photo closes the viewer.
    this.dialog.addEventListener('click', event => {
      if (event.target === this.dialog || event.target.classList.contains('yx-lightbox__slide')) this.dialog.close();
    });
    this.track.addEventListener('scroll', () => {
      window.cancelAnimationFrame(this.frame);
      this.frame = window.requestAnimationFrame(() => {
        const width = this.track.clientWidth || 1;
        this.mark(Math.round(this.track.scrollLeft / width));
      });
    }, { passive: true });
    this.track.addEventListener('touchstart', event => {
      this.startY = event.touches[0].clientY;
      this.startX = event.touches[0].clientX;
    }, { passive: true });
    this.track.addEventListener('touchend', event => {
      const dy = event.changedTouches[0].clientY - this.startY;
      const dx = Math.abs(event.changedTouches[0].clientX - this.startX);
      if (dy > 90 && dy > dx * 1.5) this.dialog.close();
    }, { passive: true });
  }

  open(shot) {
    const gallery = shot.closest('[data-season-gallery]');
    const shots = [...gallery.querySelectorAll('.yx-season-page__shot')];
    this.opener = shot;
    this.photos = shots.map(item => item.dataset.full);
    this.caption.textContent = gallery.dataset.caption || '';
    this.track.replaceChildren(...this.photos.map(src => {
      const slide = document.createElement('div');
      slide.className = 'yx-lightbox__slide';
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.decoding = 'async';
      slide.append(img);
      return slide;
    }));
    this.thumbs.replaceChildren(...this.photos.map((src, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.index = i;
      button.setAttribute('aria-label', `${i + 1} / ${this.photos.length}`);
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      button.append(img);
      return button;
    }));
    this.toggleAttribute('data-single', this.photos.length < 2);
    document.documentElement.classList.add('yx-lightbox-open');
    this.dialog.showModal();
    this.go(shots.indexOf(shot), 'instant');
    this.track.focus({ preventScroll: true });
  }

  go(index, behavior) {
    const count = this.photos.length;
    if (!count) return;
    const next = Math.max(0, Math.min(count - 1, index));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.track.scrollTo({ left: next * this.track.clientWidth, behavior: behavior || (reduced ? 'instant' : 'smooth') });
    this.mark(next);
  }

  mark(index) {
    this.index = index;
    this.count.textContent = `${index + 1} / ${this.photos.length}`;
    [...this.thumbs.children].forEach((thumb, i) => thumb.toggleAttribute('aria-current', i === index));
    this.querySelector('[data-step="-1"]').disabled = index === 0;
    this.querySelector('[data-step="1"]').disabled = index === this.photos.length - 1;
  }
}

if (!customElements.get('yarn-season-lightbox')) customElements.define('yarn-season-lightbox', YarnSeasonLightbox);
