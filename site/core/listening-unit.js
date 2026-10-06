(() => {
  'use strict';

  const model = window.GEOGEEK_MODEL;
  if (!model) return;

  const manifestUrl = new URL('data/elsewhere-listening.json', document.baseURI).href;
  const state = { records: [], loaded: false };

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const escapeAttr = escapeHtml;
  const signalMarkup = '<span class="listening-unit-signal" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
  const titleForms = new Set(['original', 'first-release']);

  const sourceIdentifier = item => String(item?.source?.bvid || item?.source?.aid || item?.id || '').trim();
  const verifiedTitle = item => String(item?.title || '').trim();
  const displayHeading = item => verifiedTitle(item) || sourceIdentifier(item) || 'LISTENING SOURCE';
  const refFor = item => String(item?.ref || `elsewhere:${item?.id || ''}`);
  const recordHref = item => `records/${refFor(item).replace(':', '-')}.html`;

  const validateRecord = item => {
    if (!item?.id || !/^listening-\d{3}$/.test(item.id)) throw new Error('LISTENING record id must match listening-NNN');
    if (refFor(item) !== `elsewhere:${item.id}`) throw new Error(`LISTENING ${item.id}: invalid ref`);
    if (!item?.source?.provider) throw new Error(`LISTENING ${item.id}: source.provider is required`);
    if (!item?.source?.embedUrl) throw new Error(`LISTENING ${item.id}: source.embedUrl is required`);

    const title = verifiedTitle(item);
    if (title) {
      if (!String(item.titleLanguage || '').trim()) throw new Error(`LISTENING ${item.id}: titleLanguage is required for a verified title`);
      if (!titleForms.has(String(item.titleForm || '').trim())) throw new Error(`LISTENING ${item.id}: titleForm must be original or first-release`);
    } else if (item.titleStatus !== 'pending-source-verification') {
      throw new Error(`LISTENING ${item.id}: missing title must be marked pending-source-verification`);
    }
  };

  const integrateModel = items => {
    const collection = model.collections?.elsewhere;
    if (!Array.isArray(collection)) return;

    items.forEach(item => {
      const ref = refFor(item);
      if (model.recordIndex?.has(ref)) return;
      const modelItem = {
        id: item.id,
        unit: 'listening',
        order: item.order,
        parentRef: item.parentRef || 'elsewhere:e03',
        title: verifiedTitle(item),
        titleStatus: item.titleStatus || '',
        titleLanguage: item.titleLanguage || '',
        titleForm: item.titleForm || '',
        creator: item.creator || '',
        firstReleased: item.firstReleased || '',
        change: item.change || '',
        source: item.source || {},
      };
      const order = collection.length;
      collection.push(modelItem);
      model.recordIndex?.set(ref, { ref, kind: 'elsewhere', id: item.id, item: modelItem, order, geography: null });
    });
  };

  const loadManifest = async () => {
    if (state.loaded) return state.records;
    const response = await fetch(manifestUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`LISTENING manifest failed: HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload?.records) ? payload.records : [];
    items.forEach(validateRecord);
    items.sort((a, b) => Number(a.order ?? Number.MAX_SAFE_INTEGER) - Number(b.order ?? Number.MAX_SAFE_INTEGER) || String(a.id).localeCompare(String(b.id)));
    state.records = items;
    state.loaded = true;
    integrateModel(items);
    return items;
  };

  function renderCollection(items) {
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

    unit.dataset.listeningCount = String(items.length);
    unit.innerHTML = `
      <div class="listening-unit-head">
        <span>LISTENING INDEX</span>
        <strong>${String(items.length).padStart(2, '0')} ${items.length === 1 ? 'RECORD' : 'RECORDS'}</strong>
      </div>
      ${items.length ? `<div class="listening-unit-list">${items.map((item, index) => {
        const title = verifiedTitle(item);
        const sourceId = sourceIdentifier(item);
        const provider = String(item?.source?.provider || '').trim();
        const secondary = title
          ? [item.creator, item.firstReleased].filter(Boolean).join(' · ')
          : [provider, 'SOURCE TITLE PENDING'].filter(Boolean).join(' · ');
        const change = String(item.change || '').toUpperCase();
        const language = title && item.titleLanguage ? ` lang="${escapeAttr(item.titleLanguage)}"` : '';
        return `<a class="listening-unit-row contour-target${title ? '' : ' is-source-pending'}" data-record-ref="${escapeAttr(refFor(item))}" data-transition-source data-local-scale="1 : 2,500" data-local-level="RECORD" href="${escapeAttr(recordHref(item))}">
          <span class="listening-unit-index">${String(index + 1).padStart(2, '0')}</span>
          ${signalMarkup}
          <span class="listening-unit-main"><strong${language}>${escapeHtml(title || sourceId)}</strong>${secondary ? `<small>${escapeHtml(secondary)}</small>` : ''}</span>
          <span class="listening-unit-change">${escapeHtml(change)}</span>
          <span class="listening-unit-arrow" aria-hidden="true">↗</span>
        </a>`;
      }).join('')}</div>` : '<p class="listening-unit-empty">No listening records yet.</p>'}
    `;

    window.bindContourTargets?.();
  }

  function renderRecord(items) {
    const ref = document.body?.dataset?.recordRef || new URLSearchParams(location.search).get('ref');
    const item = items.find(candidate => refFor(candidate) === ref);
    if (!item) return;

    document.body.classList.add('listening-record-page');
    const title = verifiedTitle(item);
    const sourceId = sourceIdentifier(item);
    const provider = String(item?.source?.provider || 'Source');
    const heading = displayHeading(item);

    const titleNode = document.querySelector('#recordTitle');
    const excerpt = document.querySelector('#recordExcerpt');
    const kicker = document.querySelector('#recordKicker');
    const meta = document.querySelector('#recordMeta');
    const detailLabel = document.querySelector('#recordDetailLabel');
    const body = document.querySelector('#recordBody');
    const back = document.querySelector('#recordBack');
    const actions = document.querySelector('#recordActions');

    if (titleNode) {
      titleNode.textContent = heading;
      if (title && item.titleLanguage) titleNode.setAttribute('lang', item.titleLanguage);
      else titleNode.removeAttribute('lang');
      titleNode.classList.toggle('is-source-identifier', !title);
    }
    if (excerpt) excerpt.textContent = title ? [item.creator, item.firstReleased].filter(Boolean).join(' · ') : 'Source title pending verification.';
    if (kicker) kicker.textContent = 'LISTENING / RECORD';
    if (detailLabel) detailLabel.textContent = 'SOURCE';
    if (back) {
      back.href = 'elsewhere.html#e03';
      back.textContent = '← COLLECTION · ELSEWHERE / LISTENING';
    }

    if (meta) {
      const rows = [
        ['FIELD', 'LISTENING'],
        ['TITLE', title || 'PENDING SOURCE VERIFICATION'],
        ['TITLE LANGUAGE', item.titleLanguage || 'PENDING'],
        ['CREATOR', item.creator],
        ['FIRST RELEASE', item.firstReleased],
        ['SOURCE', provider],
        ['SOURCE ID', sourceId],
        ['STATUS', title ? 'VERIFIED TITLE' : 'SOURCE TITLE PENDING'],
      ];
      meta.innerHTML = rows.filter(([, value]) => value).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
    }

    if (body) {
      body.innerHTML = `<div class="listening-record-source">
        <div class="listening-record-source-head">
          <span>${escapeHtml(provider.toUpperCase())}</span>
          <strong>${escapeHtml(sourceId)}</strong>
        </div>
        <div class="listening-record-embed">
          <iframe src="${escapeAttr(item.source.embedUrl)}" title="${escapeAttr(title || `${provider} source ${sourceId}`)}" scrolling="no" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>
        </div>
      </div>`;
    }

    if (actions) {
      actions.innerHTML = item?.source?.watchUrl
        ? `<a class="record-action secondary" href="${escapeAttr(item.source.watchUrl)}" rel="noreferrer" target="_blank">OPEN SOURCE ↗</a><a class="record-action secondary" href="elsewhere.html#e03">RETURN TO LISTENING ↗</a>`
        : '<a class="record-action secondary" href="elsewhere.html#e03">RETURN TO LISTENING ↗</a>';
    }

    document.title = `${heading} — GeoGeek`;
  }

  const boot = async () => {
    try {
      const items = await loadManifest();
      renderCollection(items);
      renderRecord(items);
      setTimeout(() => {
        renderCollection(items);
        renderRecord(items);
      }, 0);
    } catch (error) {
      console.error(error);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
