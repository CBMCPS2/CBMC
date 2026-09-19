'use strict';
// Progressive enhancement: links, source images and every guide work without JS.
document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('#primary-nav');
const mobileLayout = matchMedia('(max-width: 850px)');
function setMenu(open, restoreFocus = false) {
  menuButton.setAttribute('aria-expanded', String(open));
  primaryNav.classList.toggle('is-open', open);
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    setMenu(false, true);
  }
});
mobileLayout.addEventListener('change', () => setMenu(false));
primaryNav.addEventListener('click', event => {
  if (event.target.closest('a') && mobileLayout.matches) setMenu(false);
});

const search = document.querySelector('#guide-search');
if (search) {
  const cards = [...document.querySelectorAll('.guide-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  let category = 'All';
  function filterGuides() {
    const query = search.value.trim().toLocaleLowerCase('en');
    let count = 0;
    for (const card of cards) {
      const matches = (category === 'All' || card.dataset.category === category)
        && card.dataset.search.toLocaleLowerCase('en').includes(query);
      card.hidden = !matches;
      if (matches) count += 1;
    }
    document.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'platform' : 'platforms'}${category === 'All' ? '' : ' / ' + category}`;
    document.querySelector('#empty-results').hidden = count !== 0;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  }
  search.addEventListener('input', filterGuides);
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    filterGuides();
  }));
  document.querySelector('#clear-filters').addEventListener('click', () => {
    category = 'All';
    search.value = '';
    filterGuides();
    search.focus();
  });
}

// Native modal dialogs supply focus trapping and Escape; source links remain
// a fallback. The trigger is retained explicitly for reliable focus restoration.
const gallery = [...document.querySelectorAll('[data-lightbox]')];
const dialog = document.querySelector('.lightbox');
let imageIndex = 0;
let opener = null;
function displayImage(index) {
  imageIndex = (index + gallery.length) % gallery.length;
  const item = gallery[imageIndex];
  const img = dialog.querySelector('.lightbox-image');
  img.src = item.dataset.preview || item.href;
  img.alt = item.dataset.caption;
  dialog.querySelector('#lightbox-title').textContent = `${item.dataset.caption} · ${imageIndex + 1} / ${gallery.length}`;
  dialog.querySelector('[data-original]').href = item.href;
}
if (typeof dialog.showModal === 'function') {
  gallery.forEach((item, index) => item.addEventListener('click', event => {
    // Preserve open-in-new-tab/window gestures on the original full-size image.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = item;
    displayImage(index);
    dialog.showModal();
    dialog.querySelector('[data-close]').focus();
  }));
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-previous]').addEventListener('click', () => displayImage(imageIndex - 1));
  dialog.querySelector('[data-next]').addEventListener('click', () => displayImage(imageIndex + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button:not(:disabled),a[href]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      displayImage(imageIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => opener?.focus());
  if (gallery.length < 2) {
    dialog.querySelector('[data-previous]').disabled = true;
    dialog.querySelector('[data-next]').disabled = true;
    dialog.querySelector('.lightbox-bottom p').textContent = 'Esc to close';
  }
}

const animationButton = document.querySelector('[data-video]');
if (animationButton) {
  const preview = document.querySelector('video.gif-preview');
  // Enable autoplay only after checking motion preferences. Keeping it out of
  // the HTML prevents early playback (and keeps the no-JS fallback still).
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const playbackNote = document.querySelector('[data-playback-note]');
  preview.controls = false;
  animationButton.hidden = false;
  const updatePlayback = () => {
    const playing = !preview.paused;
    animationButton.setAttribute('aria-pressed', String(playing));
    animationButton.textContent = playing ? 'Pause drop animation' : 'Play drop animation';
    playbackNote.textContent = playing
      ? 'Squad-drop animation · looping silently. Pause any time.'
      : 'Squad-drop animation · paused. Play when ready.';
  };
  const playAnimation = async () => {
    try {
      await preview.play();
    } catch {
      // Browser policy or decoding failure: leave a usable manual fallback.
      preview.autoplay = false;
      preview.pause();
      updatePlayback();
      playbackNote.textContent = 'Squad-drop animation · press Play to start.';
    }
  };
  preview.addEventListener('play', updatePlayback);
  preview.addEventListener('pause', updatePlayback);
  animationButton.addEventListener('click', () => {
    if (!preview.paused) {
      preview.pause();
      return;
    }
    void playAnimation();
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      preview.autoplay = false;
      preview.pause();
    }
  });
  updatePlayback();
  if (!reducedMotion.matches) {
    preview.autoplay = true;
    void playAnimation();
  }
}
