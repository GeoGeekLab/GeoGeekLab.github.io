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
  const status = $('#atlasStatus');
  const guides = $('#atlasGuides');
  const labelsLayer = $('#atlasLabels');
  const links = $('#atlasLinks');
  const explain = $('#atlasExplain');
  const controls = $$('.projections [data-projection]');

  const typeOrder = { note: 0, lab: 1, place: 2, photo: 3 };
  const typeLabel = { note: 'NOTE', lab: 'LAB', place: 'ELSEWHERE', photo: 'PHOTO' };
  const projectionLabel = {
    field: 'RELATION',
    time: 'TIME',
    type: 'FORMAT',
    topic: 'TOPIC',
    trace: 'TRACE',
    geographic: 'PLACE'
  };
  const relationLabel = {
    field: 'SEMANTIC PROXIMITY',
    time: 'SUCCESSION',
    type: 'FORM',
    topic: 'AFFINITY',
    trace: 'DERIVATION',
    geographic: 'GEOGRAPHIC REFERENCE'
  };

  function recordTime(item) {
    const record = model.recordIndex?.get(item.ref);
    const rawDate = String(record?.item?.date || '').trim();
    const match = rawDate.match(/^(\d{4})(?:[.\/-](\d{1,2}))?/);
    const dateYear = Number(match?.[1]);
    const dateMonth = Number(match?.[2]);
    const layoutMonth = Number(model.atlasLayout?.get(item.ref)?.month);
    const year = Number.isFinite(dateYear) && dateYear > 0 ? dateYear : item.year;
    const month = Number.isInteger(dateMonth) && dateMonth >= 1 && dateMonth <= 12
      ? dateMonth
      : Number.isInteger(layoutMonth) && layoutMonth >= 1 && layoutMonth <= 12
        ? layoutMonth
        : null;

    // Keep year-only records explicit. The end-of-year bucket avoids inventing a month.
    const index = year * 12 + (month ? month - 1 : 11.5);
    const label = month ? `${year}-${String(month).padStart(2, '0')}` : `${year}-??`;
    return { year, month, index, label, key: label };
  }

  const timeMeta = new Map(items.map(item => [item.ref, recordTime(item)]));
  const timeOf = item => timeMeta.get(item.ref) || {
    year: item.year,
    month: null,
    index: item.year * 12 + 11.5,
    label: `${item.year}-??`,
    key: `${item.year}-??`
  };

  const STOP = new Set('the a an and or of to in on for with from as by at is are be being this that these those into through about across within without what why how when where which one same records record field world geo geogeek'.split(' '));
  const normalizeTokens = value => new Set(String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP.has(token)));

  const titleTokens = items.map(item => normalizeTokens(`${item.title} ${item.topic} ${item.spatialField}`));
  const refIndex = new Map(items.map((item, index) => [item.ref, index]));
  const traceSet = new Set();
  items.forEach((item, a) => (item.traceLinks || []).forEach(ref => {
    const b = refIndex.get(ref);
    if (Number.isInteger(b)) traceSet.add(`${Math.min(a, b)}:${Math.max(a, b)}`);
  }));

  function semanticScore(aIndex, bIndex) {
    const a = items[aIndex];
    const b = items[bIndex];
    let score = 0;
    const reasons = [];
    const traceKey = `${Math.min(aIndex, bIndex)}:${Math.max(aIndex, bIndex)}`;

    if (traceSet.has(traceKey)) { score += 6.5; reasons.push('authored trace'); }
    if (a.spatialField && a.spatialField === b.spatialField) { score += 3.2; reasons.push(a.spatialField); }
    if (a.topic && a.topic === b.topic) { score += 2.8; reasons.push(a.topic); }
    if (a.sourceKind === b.sourceKind) score += .75;
    if (a.type === b.type) score += .45;

    const yearGap = Math.abs((a.year || 0) - (b.year || 0));
    if (yearGap === 0) score += .7;
    else if (yearGap <= 2) score += .35;

    let overlap = 0;
    titleTokens[aIndex].forEach(token => { if (titleTokens[bIndex].has(token)) overlap += 1; });
    if (overlap) {
      score += Math.min(1.8, overlap * .6);
      reasons.push(`${overlap} shared term${overlap > 1 ? 's' : ''}`);
    }

    return { score, reasons };
  }

  function buildRelationEdges() {
    const candidates = [];
    for (let a = 0; a < items.length; a += 1) {
      for (let b = a + 1; b < items.length; b += 1) {
        const relation = semanticScore(a, b);
        if (relation.score > 0) candidates.push({ a, b, ...relation, kind: traceSet.has(`${a}:${b}`) ? 'trace' : 'semantic' });
      }
    }
    candidates.sort((x, y) => y.score - x.score);

    const degree = Array(items.length).fill(0);
    const selected = [];
    const chosen = new Set();
    const maxDegree = 5;

    const choose = edge => {
      const key = `${edge.a}:${edge.b}`;
      if (chosen.has(key)) return false;
      chosen.add(key);
      selected.push(edge);
      degree[edge.a] += 1;
      degree[edge.b] += 1;
      return true;
    };

    candidates.forEach(edge => {
      if (edge.kind === 'trace' || (degree[edge.a] < maxDegree && degree[edge.b] < maxDegree && edge.score >= 2.65)) choose(edge);
    });

    for (let index = 0; index < items.length; index += 1) {
      if (degree[index] >= 2) continue;
      const nearest = candidates.filter(edge => edge.a === index || edge.b === index);
      for (const edge of nearest) {
        if (degree[index] >= 2) break;
        if (degree[edge.a] >= 6 || degree[edge.b] >= 6) continue;
        choose(edge);
      }
    }
    return selected;
  }

  const relationEdges = buildRelationEdges();

  function makeSeedPositions() {
    return items.map((item, index) => {
      const angle = (index / Math.max(1, items.length)) * Math.PI * 2;
      return {
        x: Number.isFinite(item.x) ? item.x : .5 + Math.cos(angle) * .24,
        y: Number.isFinite(item.y) ? item.y : .5 + Math.sin(angle) * .24,
        vx: 0,
        vy: 0
      };
    });
  }

  function computeRelationLayout() {
    const nodes = makeSeedPositions();
    const fieldNames = [...new Set(items.map(item => item.spatialField).filter(Boolean))];
    const fieldCenters = new Map();
    fieldNames.forEach((name, index) => {
      const angle = (index / Math.max(1, fieldNames.length)) * Math.PI * 2 - Math.PI / 2;
      const radius = fieldNames.length > 1 ? .24 : 0;
      fieldCenters.set(name, [.5 + Math.cos(angle) * radius, .5 + Math.sin(angle) * radius * .72]);
    });

    const iterations = 220;
    for (let tick = 0; tick < iterations; tick += 1) {
      const alpha = 1 - tick / iterations;

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          let dx = nodes[j].x - nodes[i].x;
          let dy = nodes[j].y - nodes[i].y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < .00012) {
            const nudge = ((i + 1) * 17 + (j + 1) * 31) % 19 / 19000;
            dx += nudge;
            dy -= nudge;
            dist2 = dx * dx + dy * dy;
          }
          const dist = Math.sqrt(dist2);
          const force = Math.min(.0032, .000022 / dist2) * alpha;
          const fx = dx / dist * force;
          const fy = dy / dist * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      relationEdges.forEach(edge => {
        const a = nodes[edge.a];
        const b = nodes[edge.b];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(.001, Math.hypot(dx, dy));
        const target = Math.max(.085, .195 - Math.min(7, edge.score) * .014);
        const spring = (dist - target) * (.016 + Math.min(7, edge.score) * .0025) * alpha;
        const fx = dx / dist * spring;
        const fy = dy / dist * spring;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      nodes.forEach((node, index) => {
        const center = fieldCenters.get(items[index].spatialField) || [.5, .5];
        node.vx += (center[0] - node.x) * .0038 * alpha;
        node.vy += (center[1] - node.y) * .0038 * alpha;
        node.vx += (.5 - node.x) * .0014 * alpha;
        node.vy += (.5 - node.y) * .0014 * alpha;
        node.vx *= .76;
        node.vy *= .76;
        node.x += node.vx;
        node.y += node.vy;
      });
    }

    const xs = nodes.map(node => node.x);
    const ys = nodes.map(node => node.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    return nodes.map(node => [
      .08 + ((node.x - minX) / Math.max(.001, maxX - minX)) * .84,
      .10 + ((node.y - minY) / Math.max(.001, maxY - minY)) * .78
    ]);
  }

  const relationPositions = computeRelationLayout();

  const topics = [...new Set(items.map(item => item.topic || 'Other'))];
  const topicCenters = {};
  topics.forEach((topic, index) => {
    const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(topics.length))));
    const rows = Math.ceil(topics.length / columns);
    const row = Math.floor(index / columns);
    const column = index % columns;
    topicCenters[topic] = [
      columns === 1 ? .5 : .13 + column * (.74 / Math.max(1, columns - 1)),
      rows === 1 ? .5 : .22 + row * (.55 / Math.max(1, rows - 1))
    ];
  });

  const geographicItems = items.filter(item => item.geography?.kind === 'point');
  const globalItems = items.filter(item => item.geography?.kind === 'extent');
  const nonSpatialItems = items.filter(item => !item.geography);

  function gridPosition(index, count, box, preferredColumns = 4) {
    const cols = Math.min(preferredColumns, Math.max(1, Math.ceil(Math.sqrt(count))));
    const rows = Math.ceil(count / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    return [
      box[0] + (col + .5) / cols * box[2],
      box[1] + (row + .5) / rows * box[3]
    ];
  }

  function traceLevels() {
    const incoming = Array(items.length).fill(0);
    const outgoing = Array.from({ length: items.length }, () => []);
    items.forEach((item, source) => (item.traceLinks || []).forEach(ref => {
      const target = refIndex.get(ref);
      if (!Number.isInteger(target) || target === source) return;
      outgoing[source].push(target);
      incoming[target] += 1;
    }));
    const levels = Array(items.length).fill(null);
    const queue = [];
    incoming.forEach((count, index) => { if (count === 0 && outgoing[index].length) { levels[index] = 0; queue.push(index); } });
    if (!queue.length) items.forEach((item, index) => { if ((item.traceLinks || []).length) { levels[index] = 0; queue.push(index); } });
    while (queue.length) {
      const source = queue.shift();
      outgoing[source].forEach(target => {
        const next = (levels[source] || 0) + 1;
        if (levels[target] == null || next > levels[target]) {
          levels[target] = next;
          if (next < items.length) queue.push(target);
        }
      });
    }
    return levels;
  }
  const derivedTraceLevels = traceLevels();

  function position(item, mode, index = items.indexOf(item)) {
    if (mode === 'field') return relationPositions[index] || [item.x, item.y];

    if (mode === 'time') {
      const times = items.map(value => timeOf(value).index);
      const min = Math.min(...times);
      const max = Math.max(...times);
      const span = Math.max(1, max - min);
      const itemTime = timeOf(item);
      const sameTime = items.filter(value => timeOf(value).key === itemTime.key).sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.title.localeCompare(b.title));
      const localIndex = sameTime.indexOf(item);
      const bandY = { note: .30, lab: .48, place: .66, photo: .80 }[item.type] || .58;
      return [
        .10 + ((itemTime.index - min) / span) * .80,
        bandY + (localIndex - (sameTime.length - 1) / 2) * .022
      ];
    }

    if (mode === 'type') {
      const types = [...new Set(items.map(value => value.type))];
      const typeIndex = types.indexOf(item.type);
      const sameType = items.filter(value => value.type === item.type).sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
      const localIndex = sameType.indexOf(item);
      const cols = Math.max(1, types.length);
      const centerX = .10 + (typeIndex + .5) / cols * .80;
      const columnsInside = sameType.length > 14 ? 2 : 1;
      const subCol = localIndex % columnsInside;
      const subRow = Math.floor(localIndex / columnsInside);
      const subRows = Math.ceil(sameType.length / columnsInside);
      return [centerX + (subCol - (columnsInside - 1) / 2) * .036, .17 + (subRow + .5) / subRows * .68];
    }

    if (mode === 'topic') {
      const center = topicCenters[item.topic] || [.5, .5];
      const sameTopic = items.filter(value => value.topic === item.topic).sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
      const localIndex = sameTopic.indexOf(item);
      const ring = Math.floor(localIndex / 8);
      const inRing = Math.min(8, sameTopic.length - ring * 8);
      const angle = (localIndex % 8) / Math.max(1, inRing) * Math.PI * 2 - Math.PI / 2;
      const radius = sameTopic.length > 1 ? .040 + ring * .034 : 0;
      return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius * .78];
    }

    if (mode === 'trace') {
      const connected = derivedTraceLevels[index] != null;
      if (!connected) {
        const unlinked = items.filter((_, i) => derivedTraceLevels[i] == null);
        return gridPosition(unlinked.indexOf(item), unlinked.length, [.12, .75, .76, .14], 8);
      }
      const maxLevel = Math.max(1, ...derivedTraceLevels.filter(Number.isFinite));
      const level = derivedTraceLevels[index];
      const sameLevel = items.filter((_, i) => derivedTraceLevels[i] === level).sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.title.localeCompare(b.title));
      const localIndex = sameLevel.indexOf(item);
      return [
        .12 + (level / maxLevel) * .76,
        .16 + (localIndex + 1) / (sameLevel.length + 1) * .48
      ];
    }

    if (mode === 'geographic') {
      if (item.geography?.kind === 'point') {
        const [lon, lat] = item.geography.coordinates;
        const mercY = Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360));
        const maxMerc = Math.log(Math.tan(Math.PI / 4 + 85 * Math.PI / 360));
        return [.07 + ((lon + 180) / 360) * .64, .14 + (.5 - mercY / (2 * maxMerc)) * .58];
      }
      if (item.geography?.kind === 'extent') {
        const localIndex = globalItems.indexOf(item);
        return [.09 + (localIndex + .5) / Math.max(1, globalItems.length) * .60, .84];
      }
      const localIndex = nonSpatialItems.indexOf(item);
      return gridPosition(localIndex, nonSpatialItems.length, [.77, .20, .18, .58], 3);
    }

    return [item.x, item.y];
  }

  let savedProjection = 'field';
  let pinnedRef = '';
  let focusRef = '';
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

  function relationEdgesForMode(mode) {
    if (mode === 'field') return relationEdges;
    const pairs = [];
    const add = (a, b, score = 1, kind = mode) => { if (a !== b) pairs.push({ a, b, score, kind, reasons: [] }); };
    const indexed = items.map((item, index) => [item, index]);

    if (mode === 'time') {
      const sorted = [...indexed].sort((a, b) => timeOf(a[0]).index - timeOf(b[0]).index || a[0].title.localeCompare(b[0].title));
      sorted.slice(0, -1).forEach((entry, offset) => add(entry[1], sorted[offset + 1][1], 1, 'time'));
      return pairs;
    }
    if (mode === 'type') {
      [...new Set(items.map(item => item.type))].forEach(type => {
        const group = indexed.filter(([item]) => item.type === type).sort((a, b) => a[0].year - b[0].year || a[0].title.localeCompare(b[0].title));
        group.slice(0, -1).forEach((entry, offset) => add(entry[1], group[offset + 1][1], 1, 'type'));
      });
      return pairs;
    }
    if (mode === 'topic') {
      [...new Set(items.map(item => item.topic))].forEach(topic => {
        const group = indexed.filter(([item]) => item.topic === topic).sort((a, b) => a[0].year - b[0].year || a[0].title.localeCompare(b[0].title));
        group.slice(0, -1).forEach((entry, offset) => add(entry[1], group[offset + 1][1], 1.2, 'topic'));
      });
      return pairs;
    }
    if (mode === 'trace') {
      items.forEach((item, source) => (item.traceLinks || []).forEach(ref => {
        const target = refIndex.get(ref);
        if (Number.isInteger(target)) add(source, target, 3, 'trace');
      }));
      return pairs;
    }
    return pairs;
  }

  function neighborsFor(ref, mode = layout.mode || 'field') {
    const index = refIndex.get(ref);
    if (!Number.isInteger(index)) return [];
    return relationEdgesForMode(mode)
      .filter(edge => edge.a === index || edge.b === index)
      .sort((a, b) => b.score - a.score)
      .map(edge => ({ item: items[edge.a === index ? edge.b : edge.a], edge }));
  }

  function bindInspectorClose() {
    $('#atlasInspectorClose', inspector)?.addEventListener('click', () => {
      pinnedRef = '';
      focusRef = '';
      try { sessionStorage.removeItem('geogeek-atlas-record'); } catch {}
      syncFocus('');
      setInspector(null);
      labelsLayer.innerHTML = '';
      window.GeoScale?.restore?.();
    });
  }

  function setInspector(item, { pinned = false } = {}) {
    if (!inspector) return;
    if (!item) {
      inspector.classList.add('is-empty');
      inspector.dataset.pinned = 'false';
      inspector.innerHTML = `<button class="atlas-inspector-close" id="atlasInspectorClose" type="button" aria-label="Close selection">×</button><span>ATLAS / ${projectionLabel[layout.mode || 'field']}</span><strong>Hover a record. Click to keep it selected.</strong><small>Relations appear on demand; the archive stays fixed while the projection changes.</small>`;
      bindInspectorClose();
      return;
    }

    inspector.classList.remove('is-empty');
    inspector.dataset.pinned = pinned ? 'true' : 'false';
    const context = layout.mode === 'geographic' ? geoLabel(item) : item.place;
    const displayTime = layout.mode === 'time' ? timeOf(item).label : item.year;
    const neighbors = neighborsFor(item.ref).slice(0, 4);
    const neighborCopy = neighbors.length
      ? `<div class="atlas-related"><span>RELATED / ${neighbors.length}</span>${neighbors.map(({ item: neighbor }) => `<button type="button" data-atlas-related="${neighbor.ref}">${neighbor.title}</button>`).join('')}</div>`
      : '<div class="atlas-related is-empty"><span>RELATED / 0</span><small>No explicit relation in this projection.</small></div>';

    inspector.innerHTML = `
      <button class="atlas-inspector-close" id="atlasInspectorClose" type="button" aria-label="Close selection">×</button>
      <span>SELECTION / ${typeLabel[item.type] || item.type}</span>
      <strong>${item.title}</strong>
      <small>${item.topic} · ${displayTime} · ${context}</small>
      ${neighborCopy}
      <a class="atlas-open-record" href="${model.hrefForRecord(item.ref)}" data-atlas-open="${item.ref}">${L.open}</a>`;
    bindInspectorClose();
  }

  inspector?.addEventListener('click', event => {
    const related = event.target.closest('[data-atlas-related]');
    if (related) {
      const ref = related.dataset.atlasRelated;
      const index = refIndex.get(ref);
      if (Number.isInteger(index)) {
        pinnedRef = ref;
        focusRef = '';
        try { sessionStorage.setItem('geogeek-atlas-record', ref); } catch {}
        syncFocus(ref);
        setInspector(items[index], { pinned: true });
        renderSelectionLabels(ref);
      }
      return;
    }

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

  const nodeElements = items.map(item => {
    const node = document.createElement('button');
    node.className = 'atlas-node';
    node.dataset.type = item.type;
    node.dataset.recordRef = item.ref;
    node.dataset.detailHref = model.detailForRecord(item.ref) || '';
    node.setAttribute('aria-label', `${item.title} · Inspect relation`);
    node.innerHTML = '<i aria-hidden="true"></i>';
    stage.appendChild(node);

    const preview = () => {
      if (pinnedRef && pinnedRef !== item.ref) return;
      focusRef = item.ref;
      syncFocus(item.ref);
      setInspector(item, { pinned: false });
      renderSelectionLabels(item.ref);
      window.GeoScale?.apply?.('RECORD');
      window.GeoSemantic?.focus?.(item.ref, { detailHref: model.detailForRecord(item.ref) });
    };

    const release = () => {
      if (pinnedRef) {
        const pinned = items[refIndex.get(pinnedRef)];
        focusRef = '';
        syncFocus(pinnedRef);
        if (pinned) {
          setInspector(pinned, { pinned: true });
          renderSelectionLabels(pinnedRef);
        }
      } else {
        focusRef = '';
        syncFocus('');
        setInspector(null);
        labelsLayer.innerHTML = '';
        window.GeoScale?.restore?.();
      }
    };

    node.addEventListener('mouseenter', preview);
    node.addEventListener('focus', preview);
    node.addEventListener('mouseleave', release);
    node.addEventListener('blur', release);
    node.addEventListener('click', () => {
      pinnedRef = pinnedRef === item.ref ? '' : item.ref;
      focusRef = '';
      try {
        sessionStorage.setItem('geogeek-atlas-projection', layout.mode || 'field');
        if (pinnedRef) sessionStorage.setItem('geogeek-atlas-record', pinnedRef);
        else sessionStorage.removeItem('geogeek-atlas-record');
      } catch {}
      if (pinnedRef) {
        syncFocus(pinnedRef);
        setInspector(item, { pinned: true });
        renderSelectionLabels(pinnedRef);
        window.GeoScale?.apply?.('RECORD');
      } else {
        syncFocus('');
        setInspector(null);
        labelsLayer.innerHTML = '';
        window.GeoScale?.restore?.();
      }
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

  function convexHull(points) {
    if (points.length < 3) return points;
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    sorted.forEach(point => {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
      lower.push(point);
    });
    const upper = [];
    [...sorted].reverse().forEach(point => {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
      upper.push(point);
    });
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function expandedHull(points, padding = 18) {
    const hull = convexHull(points);
    if (hull.length < 3) return hull;
    const cx = hull.reduce((sum, point) => sum + point[0], 0) / hull.length;
    const cy = hull.reduce((sum, point) => sum + point[1], 0) / hull.length;
    return hull.map(([x, y]) => {
      const dx = x - cx; const dy = y - cy;
      const length = Math.max(1, Math.hypot(dx, dy));
      return [x + dx / length * padding, y + dy / length * padding];
    });
  }

  function renderClusterHulls(mode, positions, rect) {
    if (!['field', 'topic'].includes(mode)) return;
    const key = mode === 'field' ? 'spatialField' : 'topic';
    const groups = [...new Set(items.map(item => item[key]).filter(Boolean))];
    groups.forEach((group, groupIndex) => {
      const points = items
        .map((item, index) => item[key] === group ? [positions[index][0] * rect.width, positions[index][1] * rect.height] : null)
        .filter(Boolean);
      if (points.length < 2) return;

      if (points.length === 2) {
        const [a, b] = points;
        const cx = (a[0] + b[0]) / 2;
        const cy = (a[1] + b[1]) / 2;
        const rx = Math.abs(a[0] - b[0]) / 2 + 28;
        const ry = Math.abs(a[1] - b[1]) / 2 + 24;
        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.setAttribute('cx', cx); ellipse.setAttribute('cy', cy);
        ellipse.setAttribute('rx', rx); ellipse.setAttribute('ry', ry);
        ellipse.classList.add('atlas-cluster-hull');
        ellipse.dataset.cluster = String(groupIndex);
        links.appendChild(ellipse);
        return;
      }

      const hull = expandedHull(points, 22);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${hull.map(point => `${point[0]} ${point[1]}`).join(' L ')} Z`);
      path.classList.add('atlas-cluster-hull');
      path.dataset.cluster = String(groupIndex);
      links.appendChild(path);
    });
  }

  function renderGeographicFrame() {
    const frame = document.createElement('div');
    frame.className = 'atlas-geographic-frame';
    frame.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 1000 560" preserveAspectRatio="none">
        <rect class="atlas-geo-map" x="52" y="58" width="650" height="360" rx="3"></rect>
        ${[-120,-60,0,60,120].map(lon => {
          const x = 52 + ((lon + 180) / 360) * 650;
          return `<line x1="${x}" y1="58" x2="${x}" y2="418"></line>`;
        }).join('')}
        ${[-60,-30,0,30,60].map(lat => {
          const y = 58 + ((90 - lat) / 180) * 360;
          return `<line x1="52" y1="${y}" x2="702" y2="${y}"></line>`;
        }).join('')}
        <rect class="atlas-geo-dock" x="760" y="90" width="190" height="330" rx="3"></rect>
        <line class="atlas-geo-global-line" x1="70" y1="480" x2="700" y2="480"></line>
      </svg>`;
    guides.appendChild(frame);
    addGuide('180°W', .050, .105, 'geo-axis');
    addGuide('0°', .365, .105, 'geo-axis');
    addGuide('180°E', .690, .105, 'geo-axis');
    addGuide('90°N', .012, .145, 'geo-axis');
    addGuide('0°', .024, .425, 'geo-axis');
    addGuide('90°S', .012, .725, 'geo-axis');
    addGuide('GLOBAL EXTENT', .075, .865, 'geo-band');
    addGuide('NO FIXED PLACE', .785, .135, 'geo-band');
  }

  function renderGuides(mode) {
    guides.innerHTML = '';

    if (mode === 'field') {
      const positions = items.map((item, index) => position(item, mode, index));
      [...new Set(items.map(item => item.spatialField).filter(Boolean))].forEach(fieldName => {
        const group = items.map((item, index) => item.spatialField === fieldName ? positions[index] : null).filter(Boolean);
        const x = group.reduce((sum, point) => sum + point[0], 0) / group.length;
        const y = Math.max(.055, group.reduce((sum, point) => sum + point[1], 0) / group.length - .12);
        addGuide(fieldName.toUpperCase(), x, y, 'cluster-label');
      });
      addGuide('SEMANTIC FIELD / WEIGHTED LINKS', .055, .945, 'atlas-stage-note');
    } else if (mode === 'time') {
      const ticks = [...new Map(items.map(item => {
        const time = timeOf(item);
        return [time.key, time];
      })).values()].sort((a, b) => a.index - b.index || a.label.localeCompare(b.label));
      const values = ticks.map(tick => tick.index);
      const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(1, max - min);
      ticks.forEach(tick => addGuide(tick.label, .10 + ((tick.index - min) / span) * .80, .08, 'time-tick'));
      Object.entries({ NOTE: .30, LAB: .48, ELSEWHERE: .66 }).forEach(([label, y]) => addGuide(label, .025, y, 'lane-label'));
    } else if (mode === 'type') {
      const types = [...new Set(items.map(item => item.type))];
      types.forEach((type, index) => addGuide(typeLabel[type] || type.toUpperCase(), .10 + (index + .5) / types.length * .80, .08, 'column-label'));
    } else if (mode === 'topic') {
      Object.entries(topicCenters).forEach(([topic, [x, y]]) => addGuide(topic.toUpperCase(), x, Math.max(.06, y - .11), 'cluster-label'));
    } else if (mode === 'trace') {
      addGuide('DERIVATION', .06, .08, 'trace-note');
      addGuide('UNLINKED RECORDS', .06, .74, 'trace-note');
    } else if (mode === 'geographic') {
      renderGeographicFrame();
    }
  }

  function curvePath(a, b, index) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const length = Math.max(1, Math.hypot(dx, dy));
    const bend = ((index % 5) - 2) * 3.2;
    const cx = mx - dy / length * bend;
    const cy = my + dx / length * bend;
    return `M ${a[0]} ${a[1]} Q ${cx} ${cy} ${b[0]} ${b[1]}`;
  }

  function syncFocus(ref = '') {
    const neighborRefs = new Set(neighborsFor(ref).map(({ item }) => item.ref));
    nodeElements.forEach(node => {
      const nodeRef = node.dataset.recordRef;
      node.classList.toggle('is-active', Boolean(ref) && nodeRef === ref);
      node.classList.toggle('is-neighbor', Boolean(ref) && neighborRefs.has(nodeRef));
      node.classList.toggle('is-dimmed', Boolean(ref) && nodeRef !== ref && !neighborRefs.has(nodeRef));
    });

    links.querySelectorAll('.atlas-edge').forEach(path => {
      const related = Boolean(ref) && (path.dataset.a === ref || path.dataset.b === ref);
      path.classList.toggle('is-related', related);
      path.classList.toggle('is-dimmed', Boolean(ref) && !related);
    });
  }

  function drawLinks(mode) {
    links.innerHTML = '';
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    links.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    links.setAttribute('preserveAspectRatio', 'none');

    const positions = items.map((item, index) => position(item, mode, index));
    renderClusterHulls(mode, positions, rect);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = '<marker id="atlasArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z"></path></marker>';
    links.appendChild(defs);

    relationEdgesForMode(mode).forEach((edge, edgeIndex) => {
      const start = [positions[edge.a][0] * rect.width, positions[edge.a][1] * rect.height];
      const end = [positions[edge.b][0] * rect.width, positions[edge.b][1] * rect.height];
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', curvePath(start, end, edgeIndex));
      path.dataset.a = items[edge.a].ref;
      path.dataset.b = items[edge.b].ref;
      path.dataset.weight = String(Math.min(7, Math.round(edge.score || 1)));
      path.classList.add('atlas-edge', `is-${edge.kind || mode}`);
      if (edge.kind === 'trace' || mode === 'trace') path.setAttribute('marker-end', 'url(#atlasArrow)');
      links.appendChild(path);
    });

    syncFocus(pinnedRef || focusRef);
  }

  function renderSelectionLabels(ref) {
    labelsLayer.innerHTML = '';
    if (!ref) return;
    const selectedIndex = refIndex.get(ref);
    if (!Number.isInteger(selectedIndex)) return;
    const neighbors = neighborsFor(ref).slice(0, 4);
    const indexes = [selectedIndex, ...neighbors.map(({ item }) => refIndex.get(item.ref)).filter(Number.isInteger)];
    const rect = stage.getBoundingClientRect();
    const placed = [];
    const offsets = [[14,-20],[14,14],[-14,-20],[-14,14],[18,-2],[-18,-2]];

    indexes.forEach((index, orderIndex) => {
      const item = items[index];
      const [px, py] = position(item, layout.mode || 'field', index);
      const w = Math.min(210, Math.max(86, item.title.length * 6.8 + 22));
      const h = 28;
      let chosen = null;
      for (const [dx, dy] of offsets) {
        const left = px * rect.width + dx + (dx < 0 ? -w : 0);
        const top = py * rect.height + dy + (dy < 0 ? -h : 0);
        const box = { left, top, right: left + w, bottom: top + h };
        const inBounds = box.left > 8 && box.top > 8 && box.right < rect.width - 8 && box.bottom < rect.height - 8;
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
    if (!status) return;
    if (mode === 'field') {
      status.textContent = `VIEW / RELATION · ${relationEdges.length} LINKS · ${items.length} RECORDS`;
      return;
    }
    if (mode === 'geographic') {
      status.textContent = `VIEW / PLACE · ${geographicItems.length} LOCATED · ${globalItems.length} GLOBAL · ${nonSpatialItems.length} NO FIXED PLACE`;
      return;
    }
    status.textContent = `VIEW / ${projectionLabel[mode]} · RELATION / ${relationLabel[mode]}`;
  }

  function layout(mode) {
    layout.mode = mode;
    stage.dataset.mode = mode;
    stage.setAttribute('aria-label', `Atlas ${projectionLabel[mode].toLowerCase()} view`);
    nodeElements.forEach((node, index) => {
      const [x, y] = position(items[index], mode, index);
      node.style.left = `${x * 100}%`;
      node.style.top = `${y * 100}%`;
      node.classList.toggle('is-nonspatial', mode === 'geographic' && !items[index].geography);
      node.classList.toggle('is-global', mode === 'geographic' && items[index].geography?.kind === 'extent');
    });

    controls.forEach(button => {
      const active = button.dataset.projection === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active) requestAnimationFrame(() => button.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' }));
    });

    renderGuides(mode);
    updateStatus(mode);
    if (explain) {
      explain.textContent = mode === 'field'
        ? 'Relation is a weighted semantic network: authored traces, shared fields, topics, vocabulary, form, and time contribute to proximity.'
        : (L.explanations?.[mode] || '');
    }

    const pinned = items[refIndex.get(pinnedRef)];
    if (pinned) {
      setInspector(pinned, { pinned: true });
      renderSelectionLabels(pinnedRef);
    } else {
      setInspector(null);
      labelsLayer.innerHTML = '';
    }

    clearTimeout(layout.timer);
    layout.timer = setTimeout(() => drawLinks(mode), reduced ? 0 : 380);
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