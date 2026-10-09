(() => {
  'use strict';

  const VERSION = '20260930i';
  const root = '/assets/lab/previews';

  function makeImage(name, alt, critical = false) {
    const img = document.createElement('img');
    img.src = `${root}/${name}.jpg?v=${VERSION}`;
    img.alt = alt;
    img.loading = critical ? 'eager' : 'lazy';
    if (critical) img.fetchPriority = 'high';
    img.decoding = 'async';
    return img;
  }

  function instrumentFromCard(card) {
    const href = card?.dataset?.detailHref;
    if (!href) return '';
    try { return new URL(href, location.href).searchParams.get('instrument') || ''; }
    catch { return ''; }
  }

  function replaceInstrumentCards() {
    // Only prioritize the first collection preview. Direct instrument links must
    // leave bandwidth available to the selected workspace and its data.
    // The Lab collection normalizes and can reorder cards after initial
    // mounting. Select the first preview-eligible card, then update existing
    // images when the order settles so the LCP image cannot remain lazy.
    const firstCard = [...(labList?.querySelectorAll('.project-card') || [])].find(card => instrumentFromCard(card));
    const collectionEntry = !new URLSearchParams(location.search).has('instrument');
    document.querySelectorAll('#labList .project-card').forEach(card => {
      const kind = instrumentFromCard(card);
      if (!kind) return;
      const visual = card.querySelector('.project-visual');
      if (!visual) return;
      const critical = collectionEntry && card === firstCard;
      if (visual.dataset.realPreview === kind) {
        const img = visual.querySelector('img');
        if (img) {
          img.loading = critical ? 'eager' : 'lazy';
          if (critical) img.fetchPriority = 'high';
          else img.removeAttribute('fetchpriority');
        }
        return;
      }
      const title = card.querySelector('h2,h3')?.textContent?.trim() || kind;
      visual.replaceChildren(makeImage(kind, `${title} — real instrument output`, critical));
      visual.dataset.realPreview = kind;
      visual.classList.add('is-real-output');
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