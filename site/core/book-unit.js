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

  const bookRecordFor = ref => {
    const record = model.recordIndex?.get(ref);
    return record?.kind === 'elsewhere' && record.item?.unit === 'book' ? record : null;
  };

  const books = () => (data.elsewhere || [])
    .filter(item => item.unit === 'book')
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
      return orderA - orderB || String(a.id).localeCompare(String(b.id));
    });

  function syncCollectionVocabulary() {
    const register = document.querySelector('.elsewhere-register span:last-child');
    if (register) register.textContent = 'PLACE · BOOK · LISTENING';

    const entry = document.querySelector('#e02 .elsewhere-entry-copy');
    if (entry) {
      const eyebrow = entry.querySelector('.eyebrow');
      if (eyebrow) eyebrow.textContent = 'BOOK';
      const registerRows = [...entry.querySelectorAll('.elsewhere-entry-register dt')];
      registerRows.forEach(dt => {
        const value = dt.nextElementSibling;
        if (!value) return;
        if (dt.textContent.trim() === 'CHANGE') value.textContent = 'FRAME / SCALE / VOCABULARY';
        if (dt.textContent.trim() === 'TRACE') value.textContent = 'BOOK / MARGINS / RETURN';
        if (dt.textContent.trim() === 'KEPT WHEN') value.textContent = 'A BOOK CHANGES HOW LATER QUESTIONS ARE ASKED OR SEEN';
      });
    }

    const conditions = [...document.querySelectorAll('.elsewhere-condition')];
    const reading = conditions.find(node => node.querySelector('span')?.textContent.trim() === 'READING');
    if (reading) {
      const label = reading.querySelector('span');
      const title = reading.querySelector('strong');
      const copy = reading.querySelector('p');
      if (label) label.textContent = 'BOOK';
      if (title) title.textContent = 'The frame changes, not only the facts.';
      if (copy) copy.textContent = 'Keep a book when it alters scale, distance, vocabulary, or the questions that survive it.';
    }
  }

  function renderCollection() {
    const host = document.querySelector('#e02 .elsewhere-entry-copy');
    if (!host) return;

    syncCollectionVocabulary();
    let unit = host.querySelector('.book-unit');
    if (!unit) {
      unit = document.createElement('section');
      unit.className = 'book-unit';
      unit.setAttribute('aria-label', 'Book records');
      host.appendChild(unit);
    }

    const items = books();
    unit.innerHTML = `
      <div class="book-unit-head">
        <span>BOOK RECORDS</span>
        <strong>${String(items.length).padStart(2, '0')}</strong>
      </div>
      ${items.length ? `<div class="book-unit-list">${items.map((item, index) => {
        const ref = `elsewhere:${item.id}`;
        const shift = String(item.shift?.type || '').toUpperCase();
        return `<a class="book-unit-row contour-target" data-record-ref="${escapeHtml(ref)}" data-transition-source data-local-scale="1 : 2,500" data-local-level="RECORD" href="${escapeHtml(model.hrefForRecord(ref))}">
          <span class="book-unit-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="book-unit-main"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.author || '')}</small></span>
          <span class="book-unit-shift">${escapeHtml(shift)}</span>
          <span class="book-unit-arrow" aria-hidden="true">↗</span>
        </a>`;
      }).join('')}</div>` : '<p class="book-unit-empty">No book records yet.</p>'}
    `;
    window.bindContourTargets?.();
  }

  const fallbackBody = item => {
    const sections = [
      ['02 / BEFORE', item.before],
      [`03 / SHIFT${item.shift?.type ? ` · ${String(item.shift.type).toUpperCase()}` : ''}`, item.shift?.text],
      ['04 / AFTER', item.after],
      ['06 / RETURN', item.return]
    ].filter(([, value]) => value);
    return sections.map(([label, value]) => `<section class="book-record-section"><div class="book-record-section-label">${escapeHtml(label)}</div><p>${escapeHtml(value)}</p></section>`).join('');
  };

  function renderBookRecord() {
    const ref = document.body?.dataset?.recordRef || new URLSearchParams(location.search).get('ref');
    const record = bookRecordFor(ref);
    if (!record) return;

    const item = record.item;
    document.body.dataset.recordRef = ref;
    document.body.classList.add('book-record-page');

    const title = document.querySelector('#recordTitle');
    const excerpt = document.querySelector('#recordExcerpt');
    const kicker = document.querySelector('#recordKicker');
    const meta = document.querySelector('#recordMeta');
    const detailLabel = document.querySelector('#recordDetailLabel');
    const body = document.querySelector('#recordBody');
    const back = document.querySelector('#recordBack');

    if (title) title.textContent = item.title || 'Book';
    if (excerpt) excerpt.textContent = item.subtitle || '';
    if (kicker) kicker.textContent = 'BOOK / RECORD';
    if (detailLabel) detailLabel.textContent = 'ORIENTATION TRACE';
    if (body) body.innerHTML = item.bodyHtml || fallbackBody(item);
    if (back) {
      back.href = 'elsewhere.html#e02';
      back.textContent = '← COLLECTION · ELSEWHERE / BOOK';
    }

    if (meta) {
      const conditions = [
        ['FIELD', 'READING'],
        ['OBJECT', item.title],
        ['AUTHOR', item.author],
        ['FIRST PUBLISHED', item.firstPublished],
        ['EDITION READ', item.editionRead],
        ['LANGUAGE READ', item.languageRead],
        ['METHOD', item.meta || 'close reading / margins / return'],
        ['SHIFT', item.shift?.type ? String(item.shift.type).toUpperCase() : ''],
        ['SCALE', 'Record'],
        ['STATUS', String(item.status || 'open').toUpperCase() === 'OPEN' ? 'Open record' : item.status]
      ];
      meta.innerHTML = conditions.filter(([, value]) => value).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
    }

    const actions = document.querySelector('#recordActions');
    if (actions) actions.innerHTML = '<a class="record-action secondary" href="elsewhere.html#e02">RETURN TO BOOKS ↗</a>';
    document.title = `${item.title || 'Book'} — GeoGeek`;
  }

  const boot = () => {
    renderCollection();
    renderBookRecord();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
