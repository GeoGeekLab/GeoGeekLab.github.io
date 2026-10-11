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

    // Never substitute fabricated instrument artwork for a failed screenshot.
    // Keep the error explicit and make a transient image failure recoverable.
    const fallback = document.createElement('div');
    fallback.className = 'lab-preview-unavailable';
    fallback.setAttribute('role', 'group');
    fallback.setAttribute('aria-label', title + ' image loading failed');
    const grid = document.createElement('span');
    grid.className = 'lab-preview-unavailable-grid';
    grid.setAttribute('aria-hidden', 'true');
    const message = document.createElement('span');
    message.className = 'lab-preview-unavailable-label';
    message.textContent = 'IMAGE UNAVAILABLE';
    const retry = document.createElement('button');
    retry.className = 'lab-preview-retry';
    retry.type = 'button';
    retry.textContent = 'RETRY IMAGE';
    retry.setAttribute('aria-label', 'Retry image for ' + title);
    retry.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      restoreImage(visual, title, kind);
    });
    fallback.append(grid, message, retry);
    visual.replaceChildren(fallback);
  }

  function restoreImage(visual, title, kind) {
    // A cache-busting request is limited to explicit user action.
    const image = makeImage(kind, title + ' — real instrument output');
    const url = new URL(image.src, document.baseURI);
    url.searchParams.set('retry', String(Date.now()));
    image.src = url.href;
    image.loading = 'eager';
    delete visual.dataset.previewFallback;
    visual.dataset.realPreview = kind;
    visual.classList.remove('is-preview-fallback');
    visual.classList.add('is-real-output');
    visual.replaceChildren(image);
    watchImage(visual, image, title, kind);
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
