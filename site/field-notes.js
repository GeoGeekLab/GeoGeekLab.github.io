(() => {
  'use strict';

  const data = window.GEOGEEK_DATA?.en || {};
  const notes = Array.isArray(data.notes) ? data.notes : [];
  const list = document.getElementById('noteList');
  const filters = document.getElementById('fieldNotesFilters');
  if (!list || !filters) return;

  const keys = ['observation', 'scale', 'causality', 'representation', 'practice'];
  const labels = {
    all: 'ALL',
    observation: 'OBSERVATION',
    scale: 'SCALE',
    causality: 'CAUSALITY',
    representation: 'REPRESENTATION',
    practice: 'PRACTICE'
  };

  const escapeHTML = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function seriesKey(note) {
    const direct = String(note?.seriesKey || '').trim().toLowerCase();
    if (keys.includes(direct)) return direct;

    const source = `${note?.series || ''} ${(note?.tags || []).join(' ')}`.toLowerCase();
    if (/research practice|practice|method/.test(source)) return 'practice';
    if (/representation|projection|cartograph|earth representation/.test(source)) return 'representation';
    if (/causal|attribution/.test(source)) return 'causality';
    if (/scale|extrapolat|transfer/.test(source)) return 'scale';
    if (/observation|proxies|proxy|sensor|remote sensing/.test(source)) return 'observation';
    return '';
  }

  function recordHref(note) {
    const ref = `notes:${note.id}`;
    return window.GEOGEEK_MODEL?.hrefForRecord?.(ref) || `record.html?ref=${encodeURIComponent(ref)}`;
  }

  function render(filter = 'all') {
    const items = filter === 'all' ? notes : notes.filter(note => seriesKey(note) === filter);
    list.dataset.filter = filter;
    list.innerHTML = items.map(note => {
      const key = seriesKey(note);
      const meta = [note.series || labels[key] || '', ...(note.tags || []).slice(0, 2), note.read || ''].filter(Boolean).join(' · ');
      return `
        <a class="note-row archive-note-row contour-target" data-series="${escapeHTML(key)}" data-record-ref="notes:${escapeHTML(note.id)}" data-transition-source data-local-scale="1 : 2,500" data-local-level="RECORD" id="${escapeHTML(note.id)}" href="${escapeHTML(recordHref(note))}">
          <time>${escapeHTML(note.date || '')}</time>
          <h2>${escapeHTML(note.title || '')}</h2>
          <span class="note-meta">${escapeHTML(meta)}</span>
          <span class="arrow" aria-hidden="true">↗</span>
        </a>`;
    }).join('');

    if (!items.length) {
      list.innerHTML = '<p class="field-notes-empty">No notes in this field yet.</p>';
    }
    window.bindContourTargets?.();
  }

  function updateFilters(active = 'all') {
    filters.querySelectorAll('[data-note-filter]').forEach(button => {
      const key = button.dataset.noteFilter;
      const count = key === 'all' ? notes.length : notes.filter(note => seriesKey(note) === key).length;
      const selected = key === active;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.innerHTML = `<span>${labels[key] || key.toUpperCase()}</span><b>${String(count).padStart(2, '0')}</b>`;
    });
  }

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-note-filter]');
    if (!button || !filters.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    const filter = button.dataset.noteFilter || 'all';
    updateFilters(filter);
    render(filter);
  }, true);

  const sourceLabel = document.getElementById('wechatArchiveLabel');
  const sourceTitle = document.getElementById('wechatArchiveTitle');
  const sourceCopy = document.getElementById('wechatArchiveCopy');
  const sourceScan = document.getElementById('wechatArchiveScan');
  if (sourceLabel) sourceLabel.textContent = 'ORIGINAL CHANNEL / WECHAT';
  if (sourceTitle) sourceTitle.textContent = 'GeoGeek on WeChat';
  if (sourceCopy) sourceCopy.textContent = 'Original Chinese editions · publication dates preserved.';
  if (sourceScan) sourceScan.textContent = 'SCAN WITH WECHAT';

  updateFilters('all');
  render('all');
})();