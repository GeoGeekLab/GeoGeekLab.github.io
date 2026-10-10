(() => {
  'use strict';

  // The capture job replaces this token with a hash of the generated images.
  const VERSION = '20260930i';
  const root = '/assets/lab/previews';
  const watched = new WeakSet();

  function makeImage(name, alt) {
    const img = document.createElement('img');
    img.src = root + '/' + name + '.jpg?v=' + VERSION;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function showFallback(visual, title, kind) {
    if (visual.dataset.previewFallback === kind) return;
    visual.dataset.previewFallback = kind;
    delete visual.dataset.realPreview;
    visual.classList.remove('is-real-output');
    visual.classList.add('is-preview-fallback');

    const fallback = document.createElement('div');
    fallback.className = 'lab-preview-unavailable';
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', title + ' preview unavailable');
    // This is an explicit error state, not a fabricated instrument screenshot.
    fallback.innerHTML = '<span class="lab-preview-unavailable-grid" aria-hidden="true"></span>' +
      '<span class="lab-preview-unavailable-label">PREVIEW UNAVAILABLE</span>';
    visual.replaceChildren(fallback);
  }

  function watchImage(visual, image, title, kind) {
    if (watched.has(image)) return;
    watched.add(image);
    image.addEventListener('error', () => showFallback(visual, title, kind), { once: true });
    // A lazy or cached request can fail before this post-load runtime starts.
    if (image.complete && image.naturalWidth === 0) {
      showFallback(visual, title, kind);
    }
  }

  function instrumentFromCard(card) {
    const href = card?.dataset?.detailHref;
    if (!href) return '';
    try { return new URL(href, location.href).searchParams.get('instrument') || ''; }
    catch { return ''; }
  }

  function replaceInstrumentCards() {
    document.querySelectorAll('#labList .project-card').forEach(card => {
      const kind = instrumentFromCard(card);
      if (!kind) return;
      const visual = card.querySelector('.project-visual');
      if (!visual || visual.dataset.previewFallback === kind) return;
      const title = card.querySelector('h2,h3')?.textContent?.trim() || kind;
      const image = visual.querySelector('img');

      if (visual.dataset.realPreview === kind && image) {
        watchImage(visual, image, title, kind);
        return;
      }

      const replacement = makeImage(kind, title + ' — real instrument output');
      visual.replaceChildren(replacement);
      visual.dataset.realPreview = kind;
      visual.classList.remove('is-preview-fallback');
      visual.classList.add('is-real-output');
      watchImage(visual, replacement, title, kind);
    });
  }

  function apply() {
    replaceInstrumentCards();
    document.documentElement.classList.add('lab-real-previews-ready');
  }

  const labList = document.getElementById('labList');
  if (labList) {
    const observer = new MutationObserver(replaceInstrumentCards);
    observer.observe(labList, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
})();
