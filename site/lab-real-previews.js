(() => {
  'use strict';

  const VERSION = '20260930i';
  const root = '/assets/lab/previews';

  function makeImage(name, alt) {
    const img = document.createElement('img');
    img.src = `${root}/${name}.jpg?v=${VERSION}`;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function instrumentFromCard(card) {
    const href = card?.dataset?.detailHref;
    if (!href) return '';
    try { return new URL(href, location.href).searchParams.get('instrument') || ''; }
    catch { return ''; }
  }

  function replaceEarthPreview() {
    const screen = document.querySelector('.earth-preview-screen');
    if (!screen || screen.dataset.realPreview === 'true') return;
    const image = makeImage('earth-observatory', 'Real Earth Observatory interface preview');
    image.fetchPriority = 'high';
    screen.replaceChildren(image);
    screen.dataset.realPreview = 'true';
    screen.classList.add('is-real-output');
  }

  function replaceInstrumentCards() {
    document.querySelectorAll('#labList .project-card').forEach(card => {
      const kind = instrumentFromCard(card);
      if (!kind) return;
      const visual = card.querySelector('.project-visual');
      if (!visual || visual.dataset.realPreview === kind) return;
      const title = card.querySelector('h2,h3')?.textContent?.trim() || kind;
      visual.replaceChildren(makeImage(kind, `${title} — real instrument output`));
      visual.dataset.realPreview = kind;
      visual.classList.add('is-real-output');
    });
  }

  function apply() {
    replaceEarthPreview();
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
