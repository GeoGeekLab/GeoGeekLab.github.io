(() => {
  'use strict';

  const model = window.GEOGEEK_MODEL;
  if (!model) return;
  const stage = document.getElementById('atlasStage');
  if (!stage) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const L = model.labels.atlas;
  const items = model.atlasRecords();
  if (!items.length) return;

  const inspector = $('#atlasTip');
  const inspectorClose = $('#atlasInspectorClose');
  const status = $('#atlasStatus');
  const guides = $('#atlasGuides');
  const labelsLayer = $('#atlasLabels');
  const links = $('#atlasLinks');
  const explain = $('#atlasExplain');
  const controls = $$('.projections [data-projection]');

  const typeOrder = { note: 0, lab: 1, place: 2, photo: 3 };
  const typeX = { note: .16, lab: .46, place: .78, photo: .88 };
  const typeLabel = model.locale === 'zh'
    ? { note: '地记', lab: '作器', place: '方外', photo: '影像' }
    : { note: 'NOTE', lab: 'LAB', place: 'ELSEWHERE', photo: 'PHOTO' };

  const projectionLabel = {
    field: L.field,
    time: L.time,
    type: L.type,
    topic: L.topic,
    trace: L.trace,
    geographic: L.geographic
  };
  const relationLabel = L.relation;
  const explanation = L.explanations;

  controls.forEach(button => {
    const mode = button.dataset.projection;
    if (projectionLabel[mode]) button.textContent = projectionLabel[mode];
  });

  const topics = [...new Set(items.map(item => item.topic))];
  const topicCenters = {};
  topics.forEach((topic, index) => {
    const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(topics.length))));
    const rows = Math.ceil(topics.length / columns);
    const row = Math.floor(index / columns);
    const column = index % columns;
    topicCenters[topic] = [
      .14 + column * (.72 / Math.max(1, columns - 1)),
      .22 + row * (.56 / Math.max(1, rows - 1 || 1))
    ];
  });

  const geographicItems = items.filter(item => item.geography?.kind === 'point');
  const globalItems = items.filter(item => item.geography?.kind === 'extent');
  const nonSpatialItems = items.filter(item => !item.geography);

  function position(item, mode) {
    if (mode === 'field') return [item.x, item.y];
    if (mode === 'time') {
      const years = items.map(value => value.year);
      const min = Math.min(...years);
      const max = Math.max(...years);
      const span = Math.max(1, max - min);
      const sameYear = items.filter(value => value.year === item.year);
      const index = sameYear.indexOf(item);
      const rows = Math.ceil(sameYear.length / 4);
      const row = Math.floor(index / 4);
      const col = index % 4;
      return [
        .12 + ((item.year - min) / span) * .76 + (col - 1.5) * .012,
        .24 + (row / Math.max(1, rows - 1 || 1)) * .50 + (typeOrder[item.type] || 0) * .018
      ];
    }
    if (mode === 'type') {
      const sameType = items.filter(value => value.type === item.type).sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
      const index = sameType.indexOf(item);
      return [typeX[item.type] || .5, .16 + (index + 1) / (sameType.length + 1) * .68];
    }
    if (mode === 'topic') {
      const center = topicCenters[item.topic] || [.5, .5];
      const sameTopic = items.filter(value => value.topic === item.topic);
      const index = sameTopic.indexOf(item);
      const ring = Math.floor(index / 7);
      const angle = (index % 7) / Math.min(7, sameTopic.length) * Math.PI * 2 - Math.PI / 2;
      const radius = sameTopic.length > 1 ? .045 + ring * .035 : 0;
      return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
    }
    if (mode === 'trace') return [item.traceX, item.traceY];
    if (mode === 'geographic') {
      if (item.geography?.kind === 'point') {
        const [lon, lat] = item.geography.coordinates;
        return [.08 + ((lon + 180) / 360) * .68, .12 + ((90 - lat) / 180) * .66];
      }
      if (item.geography?.kind === 'extent') {
        const index = globalItems.indexOf(item);
        return [.12 + (index + 1) / (globalItems.length + 1) * .62, .84];
      }
      const index = nonSpatialItems.indexOf(item);
      return [.89, .14 + (index + 1) / (nonSpatialItems.length + 1) * .68];
    }
    return [item.x, item.y];
  }

  let savedProjection = 'field';
  let pinnedRef = '';
  try {
    savedProjection = sessionStorage.getItem('geogeek-atlas-projection') || 'field';
    if (savedProjection === 'space') savedProjection = 'field';
    pinnedRef = sessionStorage.getItem('geogeek-atlas-record') || '';
  } catch {}
  if (!['field', 'time', 'type', 'topic', 'trace', 'geographic'].includes(savedProjection)) savedProjection = 'field';
  if (!items.some(item => item.ref === pinnedRef)) pinnedRef = '';

  function geoLabel(item) {
    if (item.geography?.kind === 'extent') return L.globalBand;
    if (item.geography?.kind === 'point') return item.place;
    return L.nonSpatialBand;
  }

  function setInspector(item, { pinned = false } = {}) {
    if (!inspector) return;
    if (!item) {
      inspector.classList.add('is-empty');
      inspector.dataset.pinned = 'false';
      inspector.innerHTML = `<button class="atlas-inspector-close" id="atlasInspectorClose" type="button" aria-label="${model.data.ui?.atlas?.closeSelection || 'Close selection'}">×</button><span>${model.data.ui?.atlas?.tipKicker || 'ATLAS'} / ${projectionLabel[layout.mode || 'field']}</span><strong>${model.data.ui?.atlas?.firstUse || L.tip}</strong>`;
      bindInspectorClose();
      return;
    }
    inspector.classList.remove('is-empty');
    inspector.dataset.pinned = pinned ? 'true' : 'false';
    const context = layout.mode === 'geographic' ? geoLabel(item) : item.place;
    inspector.innerHTML = `
      <button class="atlas-inspector-close" id="atlasInspectorClose" type="button" aria-label="${model.data.ui?.atlas?.closeSelection || 'Close selection'}">×</button>
      <span>${model.data.ui?.atlas?.selection || 'SELECTION'} / ${typeLabel[item.type] || item.type}</span>
      <strong>${item.title}</strong>
      <small>${item.topic} · ${item.year} · ${context}</small>
      <a class="atlas-open-record" href="${model.hrefForRecord(item.ref)}" data-atlas-open="${item.ref}">${L.open}</a>`;
    bindInspectorClose();
  }

  function bindInspectorClose() {
    $('#atlasInspectorClose', inspector)?.addEventListener('click', () => {
      pinnedRef = '';
      try { sessionStorage.removeItem('geogeek-atlas-record'); } catch {}
      nodes.forEach(node => node.classList.remove('is-active'));
      labelsLayer.innerHTML = '';
      setInspector(null);
      window.GeoScale?.restore?.();
    });
  }

  inspector?.addEventListener('click', event => {
    const open = event.target.closest('[data-atlas-open]');
    if (!open) return;
    const ref = open.dataset.atlasOpen;
    try {
      sessionStorage.setItem('geogeek-atlas-projection', layout.mode || 'field');
      sessionStorage.setItem('geogeek-atlas-record', ref);
      sessionStorage.setItem('geogeek-record-origin', 'atlas');
    } catch {}
    const title = $('strong', inspector);
    if (title) title.style.viewTransitionName = 'record-title';
  });

  const nodes = items.map(item => {
    const node = document.createElement('button');
    node.className = 'atlas-node';
    node.dataset.type = item.type;
    node.dataset.recordRef = item.ref;
    node.dataset.detailHref = model.detailForRecord(item.ref) || '';
    node.setAttribute('aria-label', `${item.title} · ${model.locale === 'zh' ? '察看关系' : 'Inspect relation'}`);
    node.innerHTML = '<i aria-hidden="true"></i>';
    stage.appendChild(node);

    const preview = () => {
      if (pinnedRef && pinnedRef !== item.ref) return;
      nodes.forEach(element => element.classList.toggle('is-active', element === node));
      setInspector(item, { pinned: false });
      renderSelectionLabels(item.ref);
      window.GeoScale?.apply?.('RECORD');
      window.GeoSemantic?.focus?.(item.ref, { detailHref: model.detailForRecord(item.ref) });
    };
    const release = () => {
      if (pinnedRef) {
        const pinned = items.find(value => value.ref === pinnedRef);
        nodes.forEach(element => element.classList.toggle('is-active', element.dataset.recordRef === pinnedRef));
        if (pinned) { setInspector(pinned, { pinned: true }); renderSelectionLabels(pinnedRef); }
      } else {
        nodes.forEach(element => element.classList.remove('is-active'));
        labelsLayer.innerHTML = '';
        setInspector(null);
        window.GeoScale?.restore?.();
      }
    };

    node.addEventListener('mouseenter', preview);
    node.addEventListener('focus', preview);
    node.addEventListener('mouseleave', release);
    node.addEventListener('blur', release);
    node.addEventListener('click', () => {
      pinnedRef = item.ref;
      try {
        sessionStorage.setItem('geogeek-atlas-projection', layout.mode || 'field');
        sessionStorage.setItem('geogeek-atlas-record', item.ref);
      } catch {}
      nodes.forEach(element => element.classList.toggle('is-active', element === node));
      setInspector(item, { pinned: true });
      renderSelectionLabels(item.ref);
      window.GeoScale?.apply?.('RECORD');
      window.GeoSemantic?.focus?.(item.ref, { detailHref: model.detailForRecord(item.ref) });
    });
    return node;
  });

  function addGuide(text, x, y, className = '') {
    const guide = document.createElement('span');
    guide.className = `atlas-guide ${className}`.trim();
    guide.textContent = text;
    guide.style.left = `${x * 100}%`;
    guide.style.top = `${y * 100}%`;
    guides.appendChild(guide);
  }

  function renderGeographicFrame() {
    const frame = document.createElement('div');
    frame.className = 'atlas-geographic-frame';
    frame.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 1000 520" preserveAspectRatio="none">
        <rect x="55" y="40" width="700" height="390"></rect>
        ${[-120,-60,0,60,120].map(lon => {
          const x = 55 + ((lon + 180) / 360) * 700;
          return `<line x1="${x}" y1="40" x2="${x}" y2="430"></line>`;
        }).join('')}
        ${[-60,-30,0,30,60].map(lat => {
          const y = 40 + ((90 - lat) / 180) * 390;
          return `<line x1="55" y1="${y}" x2="755" y2="${y}"></line>`;
        }).join('')}
        <line class="atlas-nonspatial-divider" x1="820" y1="40" x2="820" y2="430"></line>
      </svg>`;
    guides.appendChild(frame);
    addGuide('180°W', .055, .075, 'geo-axis');
    addGuide('0°', .39, .075, 'geo-axis');
    addGuide('180°E', .735, .075, 'geo-axis');
    addGuide('90°N', .018, .12, 'geo-axis');
    addGuide('0°', .028, .45, 'geo-axis');
    addGuide('90°S', .018, .76, 'geo-axis');
    addGuide(L.globalBand, .11, .89, 'geo-band');
    addGuide(L.nonSpatialBand, .84, .075, 'geo-band');
  }

  function renderGuides(mode) {
    guides.innerHTML = '';
    if (mode === 'field') {
      const fields = [...new Set(items.map(item => item.spatialField))];
      fields.forEach(fieldName => {
        const group = items.filter(item => item.spatialField === fieldName);
        const x = group.reduce((sum, item) => sum + item.x, 0) / group.length;
        const y = Math.max(.075, group.reduce((sum, item) => sum + item.y, 0) / group.length - .105);
        addGuide(fieldName, x, y);
      });
    } else if (mode === 'time') {
      const years = [...new Set(items.map(item => item.year))].sort();
      const min = Math.min(...years);
      const max = Math.max(...years);
      const span = Math.max(1, max - min);
      years.forEach(year => addGuide(String(year), .12 + ((year - min) / span) * .76, .10));
    } else if (mode === 'type') {
      Object.entries(typeX).forEach(([type, x]) => addGuide(typeLabel[type] || type, x, .10));
    } else if (mode === 'topic') {
      Object.entries(topicCenters).forEach(([topic, [x, y]]) => addGuide(topic, x, Math.max(.075, y - .10)));
    } else if (mode === 'trace') {
      addGuide(model.locale === 'zh' ? '起' : 'BEGIN', .10, .10);
      addGuide(model.locale === 'zh' ? '今' : 'NOW', .90, .10);
      addGuide(model.locale === 'zh' ? '仅示作者明确承转' : 'AUTHORED LINKS ONLY', .50, .91, 'trace-note');
    } else if (mode === 'geographic') renderGeographicFrame();
  }

  function edgePairs(mode) {
    const pairs = [];
    const add = (a, b) => { if (a !== b) pairs.push([a, b]); };
    const indexed = items.map((item, index) => [item, index]);

    if (mode === 'time') {
      const sorted = [...indexed].sort((a, b) => a[0].year - b[0].year || a[0].title.localeCompare(b[0].title));
      sorted.slice(0, -1).forEach((entry, offset) => add(entry[1], sorted[offset + 1][1]));
      return pairs;
    }
    if (mode === 'type') {
      [...new Set(items.map(item => item.type))].forEach(type => {
        const group = indexed.filter(([item]) => item.type === type).sort((a, b) => a[0].year - b[0].year || a[0].title.localeCompare(b[0].title));
        group.slice(0, -1).forEach((entry, offset) => add(entry[1], group[offset + 1][1]));
      });
      return pairs;
    }
    if (mode === 'trace') {
      const byRef = new Map(items.map((item, index) => [item.ref, index]));
      items.forEach((item, index) => (item.traceLinks || []).forEach(targetRef => {
        const target = byRef.get(targetRef);
        if (Number.isInteger(target)) add(index, target);
      }));
      return pairs;
    }
    if (mode === 'geographic') return pairs;

    const key = mode === 'field' ? 'spatialField' : 'topic';
    [...new Set(items.map(item => item[key]))].forEach(value => {
      const group = indexed.filter(([item]) => item[key] === value).sort((a, b) => a[0].title.localeCompare(b[0].title));
      group.slice(0, -1).forEach((entry, offset) => add(entry[1], group[offset + 1][1]));
    });
    return pairs;
  }

  function drawLinks(mode) {
    links.innerHTML = '';
    const rect = stage.getBoundingClientRect();
    const positions = items.map(item => position(item, mode));
    edgePairs(mode).forEach(([a, b]) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', positions[a][0] * rect.width);
      line.setAttribute('y1', positions[a][1] * rect.height);
      line.setAttribute('x2', positions[b][0] * rect.width);
      line.setAttribute('y2', positions[b][1] * rect.height);
      line.classList.add('signal');
      links.appendChild(line);
    });
  }

  function renderSelectionLabels(ref) {
    labelsLayer.innerHTML = '';
    if (!ref) return;
    const selectedIndex = items.findIndex(item => item.ref === ref);
    if (selectedIndex < 0) return;
    const neighborIndexes = [];
    edgePairs(layout.mode || 'field').forEach(([a,b]) => {
      if (a === selectedIndex) neighborIndexes.push(b);
      if (b === selectedIndex) neighborIndexes.push(a);
    });
    const indexes = [selectedIndex, ...new Set(neighborIndexes)].slice(0, 5);
    const rect = stage.getBoundingClientRect();
    const placed = [];
    const offsets = [[14,-18],[14,12],[-14,-18],[-14,12]];

    indexes.forEach((index, orderIndex) => {
      const item = items[index];
      const [px, py] = position(item, layout.mode || 'field');
      const w = Math.min(190, Math.max(72, item.title.length * (model.locale === 'zh' ? 14 : 7.2) + 18));
      const h = 28;
      let chosen = null;
      for (const [dx,dy] of offsets) {
        const left = px * rect.width + dx + (dx < 0 ? -w : 0);
        const top = py * rect.height + dy + (dy < 0 ? -h : 0);
        const box = { left, top, right:left+w, bottom:top+h };
        const inBounds = box.left > 4 && box.top > 4 && box.right < rect.width - 4 && box.bottom < rect.height - 4;
        const collides = placed.some(other => !(box.right < other.left || box.left > other.right || box.bottom < other.top || box.top > other.bottom));
        if (inBounds && !collides) { chosen = box; break; }
      }
      if (!chosen) return;
      placed.push(chosen);
      const label = document.createElement('span');
      label.className = `atlas-node-label${orderIndex === 0 ? ' is-selected' : ''}`;
      label.textContent = item.title;
      label.style.left = `${chosen.left}px`;
      label.style.top = `${chosen.top}px`;
      label.style.maxWidth = `${w}px`;
      labelsLayer.appendChild(label);
    });
  }

  function updateStatus(mode) {
    const base = L.status.replace('{projection}', projectionLabel[mode]).replace('{relation}', relationLabel[mode]);
    if (mode === 'geographic') {
      const counts = L.located
        .replace('{located}', String(geographicItems.length))
        .replace('{global}', String(globalItems.length))
        .replace('{nonSpatial}', String(nonSpatialItems.length));
      status.textContent = `${base} · ${counts}`;
    } else status.textContent = base;
  }

  function layout(mode) {
    layout.mode = mode;
    stage.dataset.mode = mode;
    nodes.forEach((node, index) => {
      const [x, y] = position(items[index], mode);
      node.style.left = `${x * 100}%`;
      node.style.top = `${y * 100}%`;
      node.classList.toggle('is-nonspatial', mode === 'geographic' && !items[index].geography);
      node.classList.toggle('is-global', mode === 'geographic' && items[index].geography?.kind === 'extent');
      node.classList.toggle('is-active', items[index].ref === pinnedRef);
    });
    controls.forEach(button => {
      const active = button.dataset.projection === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active) requestAnimationFrame(() => button.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' }));
    });
    renderGuides(mode);
    explain.textContent = explanation[mode] || '';
    updateStatus(mode);
    const pinned = items.find(item => item.ref === pinnedRef);
    if (pinned) { setInspector(pinned, { pinned: true }); renderSelectionLabels(pinnedRef); }
    else { setInspector(null); labelsLayer.innerHTML = ''; }
    clearTimeout(layout.timer);
    layout.timer = setTimeout(() => drawLinks(mode), reduced ? 0 : 360);
    try { sessionStorage.setItem('geogeek-atlas-projection', mode); } catch {}
  }

  controls.forEach(button => button.addEventListener('click', () => layout(button.dataset.projection)));
  addEventListener('resize', () => {
    if (!layout.mode) return;
    drawLinks(layout.mode);
    if (pinnedRef) renderSelectionLabels(pinnedRef);
  }, { passive: true });

  layout(savedProjection);
})();
