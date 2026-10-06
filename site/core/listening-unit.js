(() => {
  'use strict';

  const model = window.GEOGEEK_MODEL;
  const data = window.GEOGEEK_DATA?.en || {};
  if (!model) return;

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const listening = () => (data.elsewhere || [])
    .filter(item => item.unit === 'listening')
    .sort((a, b) => {
      const orderA = a.order != null && Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
      const orderB = b.order != null && Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
      return orderA - orderB || String(a.id).localeCompare(String(b.id));
    });

  const signalMarkup = '<span class="listening-unit-signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';

  function renderCollection() {
    const entry = document.querySelector('#e03');
    const host = entry?.querySelector('.elsewhere-entry-copy');
    if (!entry || !host) return;

    entry.dataset.collectionEntry = 'true';
    let unit = host.querySelector('.listening-unit');
    if (!unit) {
      unit = document.createElement('section');
      unit.className = 'listening-unit';
      unit.setAttribute('aria-label', 'Listening records');
      host.appendChild(unit);
    }

    const items = listening();
    unit.dataset.listeningCount = String(items.length);
    unit.innerHTML = `
      <div class="listening-unit-head">
        <span>LISTENING INDEX</span>
        <strong>${String(items.length).padStart(2, '0')} ${items.length === 1 ? 'RECORD' : 'RECORDS'}</strong>
      </div>
      ${items.length ? `<div class="listening-unit-list">${items.map((item, index) => {
        const ref = `elsewhere:${item.id}`;
        const creator = item.creator || item.artist || item.author || '';
        const released = item.firstReleased || item.released || item.year || item.firstPublished || '';
        const secondary = [creator, released].filter(Boolean).join(' · ');
        const change = String(item.change?.type || item.mode || item.shift?.type || '').toUpperCase();
        return `<a class="listening-unit-row contour-target" data-record-ref="${escapeHtml(ref)}" data-transition-source data-local-scale="1 : 2,500" data-local-level="RECORD" href="${escapeHtml(model.hrefForRecord(ref))}">
          <span class="listening-unit-index">${String(index + 1).padStart(2, '0')}</span>
          ${signalMarkup}
          <span class="listening-unit-main"><strong>${escapeHtml(item.title || 'Untitled')}</strong>${secondary ? `<small>${escapeHtml(secondary)}</small>` : ''}</span>
          <span class="listening-unit-change">${escapeHtml(change)}</span>
          <span class="listening-unit-arrow" aria-hidden="true">↗</span>
        </a>`;
      }).join('')}</div>` : '<p class="listening-unit-empty">No listening records yet.</p>'}
    `;

    window.bindContourTargets?.();
  }

  const boot = () => {
    renderCollection();
    setTimeout(renderCollection, 0);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
