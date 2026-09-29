(() => {
  'use strict';

  const root = window.GEOGEEK_DATA || {};
  const locale = 'en';
  const data = root.en || {};

  const labels = {
    spatial: {
      title: 'SITE MAP',
      mode: 'SPATIAL BROWSER / SITE STRUCTURE',
      current: 'CURRENT',
      scale: 'INFORMATION SCALE',
      site: 'SITE',
      position: 'POSITION',
      collection: 'COLLECTION',
      record: 'RECORD',
      detail: 'DETAIL',
      origin: 'Origin',
      coordinates: 'Coordinates',
      notes: 'Field Notes',
      lab: 'Lab',
      atlas: 'Atlas',
      elsewhere: 'Elsewhere',
      open: 'OPEN',
      zoomIn: 'ZOOM IN',
      zoomOut: 'ZOOM OUT',
      inspect: 'READ RELATION',
      currentHere: 'CURRENT POSITION',
      collectionOf: 'PARENT COLLECTION',
      siblings: 'NEARBY RECORDS',
      empty: 'No additional structure at this scale.',
      hint: 'Selection reveals local topology; scale changes representation, not page size.',
      mobileHint: 'Pan the field horizontally; the list below exposes the same structure.',
      list: 'STRUCTURE LIST',
      close: 'Close map',
      recordCount: '{count} records',
      enterDetail: 'ENTER DETAIL',
      nonSpatial: 'NON-SPATIAL',
      globalExtent: 'GLOBAL EXTENT'
    },
    atlas: {
      field: 'FIELD',
      time: 'TIME',
      type: 'TYPE',
      topic: 'TOPIC',
      trace: 'TRACE',
      geographic: 'GEOGRAPHIC',
      relation: {
        field: 'FIELD',
        time: 'SUCCESSION',
        type: 'FORM',
        topic: 'AFFINITY',
        trace: 'DERIVATION',
        geographic: 'GEOGRAPHIC REFERENCE'
      },
      explanations: {
        field: 'Field preserves authored conceptual co-presence. Nearness here is relational, not geographic distance and not proof of causation.',
        time: 'Time preserves succession. Earlier and later become legible; causation does not follow automatically.',
        type: 'Type preserves record form, then orders records locally by time.',
        topic: 'Topic preserves thematic affinity. Shared subjects pull records together while other relations recede.',
        trace: 'Trace preserves authored derivation: what one question opened, what a method changed, and where one inquiry became another. It is not a timeline.',
        geographic: 'Geographic projection accepts only records with a real extent, geometry, or coordinate. Absence of location remains a meaningful data state.'
      },
      status: 'PROJECTION / {projection} · RELATION / {relation}',
      located: '{located} LOCATED · {global} GLOBAL · {nonSpatial} NON-SPATIAL',
      globalBand: 'GLOBAL EXTENT',
      nonSpatialBand: 'NON-SPATIAL',
      open: 'OPEN RECORD ↗',
      tip: 'Select a record and watch the same object persist while its relations change.'
    }
  };

  const collectionDefs = [
    { key: 'notes', code: '02', href: 'field-notes.html', type: 'note' },
    { key: 'lab', code: '03', href: 'lab.html', type: 'lab' },
    { key: 'atlas', code: '04', href: 'atlas.html', type: 'atlas' },
    { key: 'elsewhere', code: '05', href: 'elsewhere.html', type: 'elsewhere' }
  ];

  const pageNodes = [
    { key: 'home', code: '00', href: 'index.html', type: 'origin', x: 10, y: 50, label: labels.spatial.origin },
    { key: 'position', code: '01', href: 'index.html#now', type: 'position', x: 29, y: 50, label: labels.spatial.coordinates },
    { key: 'notes', code: '02', href: 'field-notes.html', type: 'note', x: 53, y: 20, label: labels.spatial.notes },
    { key: 'lab', code: '03', href: 'lab.html', type: 'lab', x: 56, y: 49, label: labels.spatial.lab },
    { key: 'atlas', code: '04', href: 'atlas.html', type: 'atlas', x: 78, y: 34, label: labels.spatial.atlas },
    { key: 'elsewhere', code: '05', href: 'elsewhere.html', type: 'elsewhere', x: 84, y: 72, label: labels.spatial.elsewhere }
  ];

  const siteEdges = [
    ['home', 'position'],
    ['position', 'notes'],
    ['position', 'lab'],
    ['position', 'atlas'],
    ['position', 'elsewhere'],
    ['notes', 'atlas'],
    ['lab', 'atlas'],
    ['atlas', 'elsewhere']
  ];

  const archive = window.GEOGEEK_ARCHIVE || { records: [] };
  const geography = Object.fromEntries((archive.records || [])
    .filter(record => record.geography)
    .map(record => [record.ref, {
      ...record.geography,
      label: record.geography.scope === 'global' ? labels.spatial.globalExtent : (record.geography.label || '')
    }]));

  const collections = {
    notes: data.notes || [],
    lab: data.lab || [],
    elsewhere: data.elsewhere || []
  };

  const recordIndex = new Map();
  Object.entries(collections).forEach(([kind, items]) => {
    items.forEach((item, index) => {
      const ref = `${kind}:${item.id}`;
      recordIndex.set(ref, { ref, kind, id: item.id, item, order: index, geography: geography[ref] || null });
    });
  });

  const atlasLayout = new Map((data.atlasLayout || []).map(item => [item.ref, item]));
  const authoredLinks = new Map();
  (data.atlasLayout || []).forEach(item => authoredLinks.set(item.ref, [...(item.traceLinks || [])]));

  const labelForCollection = key => {
    if (key === 'notes') return labels.spatial.notes;
    if (key === 'lab') return labels.spatial.lab;
    if (key === 'atlas') return labels.spatial.atlas;
    if (key === 'elsewhere') return labels.spatial.elsewhere;
    return key;
  };

  const hrefForRecord = ref => {
    const record = recordIndex.get(ref);
    if (record?.kind === 'notes') {
      if (record.item?.slug && !window.GEOGEEK_SOURCE_PREVIEW) return `field-notes/${record.item.slug}/`;
      return `record.html?ref=${encodeURIComponent(ref)}`;
    }
    return `records/${String(ref).replace(':', '-')}.html`;
  };
  const detailForRecord = ref => {
    const record = recordIndex.get(ref);
    if (!record) return null;
    if (record.kind === 'lab' && record.item.instrument) return `lab.html?instrument=${encodeURIComponent(record.item.instrument)}#${record.id}`;
    if (document.body?.dataset?.recordRef === ref) return '#detail';
    return `${hrefForRecord(ref)}#detail`;
  };
  const hrefForCollection = key => collectionDefs.find(item => item.key === key)?.href || 'index.html';

  function currentContext() {
    const pageFile = location.pathname.split('/').pop() || 'index.html';
    const declaredPage = document.body?.dataset?.pageKey;
    const pageKey = declaredPage === 'record' ? 'record' : pageFile === 'field-notes.html' ? 'notes' : pageFile === 'lab.html' ? 'lab' : pageFile === 'atlas.html' ? 'atlas' : pageFile === 'elsewhere.html' ? 'elsewhere' : pageFile === 'commons.html' ? 'commons' : pageFile === 'record.html' ? 'record' : 'home';
    if (pageKey === 'record') {
      const ref = document.body?.dataset?.recordRef || new URLSearchParams(location.search).get('ref');
      const record = recordIndex.get(ref);
      return { pageKey, collection: record?.kind || null, ref: record?.ref || null, level: 'RECORD' };
    }
    if (pageKey === 'commons') return { pageKey, collection: null, ref: null, level: 'COLLECTION' };
    if (pageKey === 'notes' || pageKey === 'lab' || pageKey === 'elsewhere' || pageKey === 'atlas') return { pageKey, collection: pageKey, ref: null, level: 'COLLECTION' };
    const section = document.body?.dataset?.currentSection || (location.hash === '#now' ? 'now' : 'origin');
    if (section === 'now') return { pageKey: 'home', collection: null, ref: null, level: 'POSITION' };
    if (section === 'field-notes') return { pageKey: 'home', collection: 'notes', ref: null, level: 'COLLECTION' };
    if (section === 'lab') return { pageKey: 'home', collection: 'lab', ref: null, level: 'COLLECTION' };
    if (section === 'atlas') return { pageKey: 'home', collection: 'atlas', ref: null, level: 'COLLECTION' };
    if (section === 'elsewhere') return { pageKey: 'home', collection: 'elsewhere', ref: null, level: 'COLLECTION' };
    return { pageKey: 'home', collection: null, ref: null, level: 'SITE' };
  }

  function siblings(ref, radius = 2) {
    const record = recordIndex.get(ref);
    if (!record) return [];
    const items = collections[record.kind] || [];
    const start = Math.max(0, record.order - radius);
    const end = Math.min(items.length, record.order + radius + 1);
    return items.slice(start, end).map(item => recordIndex.get(`${record.kind}:${item.id}`)).filter(Boolean);
  }

  function atlasRecords() {
    const explicit = new Map((data.atlasLayout || []).map(layout => [layout.ref, layout]));
    const all = [...recordIndex.values()];
    const kindType = { notes: 'note', lab: 'lab', elsewhere: 'place' };
    const fieldNames = { notes: 'thinking field', studies: 'constructed field', observatory: 'observatory', play: 'topological field', elsewhere: 'lived field' };
    const byKind = { notes: all.filter(r => r.kind === 'notes'), lab: all.filter(r => r.kind === 'lab'), elsewhere: all.filter(r => r.kind === 'elsewhere') };

    return all.map(record => {
      const layout = explicit.get(record.ref) || {};
      const groupItems = byKind[record.kind] || [];
      const localIndex = groupItems.findIndex(item => item.ref === record.ref);
      const localCount = Math.max(1, groupItems.length);
      const angle = (localIndex / localCount) * Math.PI * 2 - Math.PI / 2;
      const base = record.kind === 'notes' ? [.27, .33] : record.kind === 'lab' ? [.62, .48] : [.78, .72];
      const radiusX = record.kind === 'lab' ? .24 : .15;
      const radiusY = record.kind === 'lab' ? .31 : .19;
      const derivedX = Math.max(.08, Math.min(.92, base[0] + Math.cos(angle) * radiusX));
      const derivedY = Math.max(.10, Math.min(.88, base[1] + Math.sin(angle) * radiusY));
      const yearFromDate = Number(String(record.item.date || '').slice(0, 4));
      const year = Number.isFinite(yearFromDate) && yearFromDate > 0 ? yearFromDate : (layout.year || 2026);
      const topic = layout.topic || (record.item.tags || [])[0] || (record.kind === 'elsewhere' ? 'Life' : 'Method');
      const spatialField = layout.spatialField || (record.kind === 'lab' ? fieldNames[record.item.group || 'studies'] : fieldNames[record.kind]) || fieldNames.notes;
      return {
        ...layout,
        ref: record.ref,
        title: record.item.title,
        type: layout.type || kindType[record.kind] || 'note',
        year,
        topic,
        place: layout.place || (record.geography ? record.geography.label : 'Non-spatial'),
        spatialField,
        x: Number.isFinite(layout.x) ? layout.x : derivedX,
        y: Number.isFinite(layout.y) ? layout.y : derivedY,
        traceX: Number.isFinite(layout.traceX) ? layout.traceX : derivedX,
        traceY: Number.isFinite(layout.traceY) ? layout.traceY : derivedY,
        traceLinks: [...(layout.traceLinks || [])],
        sourceKind: record.kind,
        sourceId: record.id,
        geography: record.geography
      };
    });
  }

  window.GEOGEEK_MODEL = {
    locale,
    data,
    labels,
    pageNodes,
    siteEdges,
    collectionDefs,
    collections,
    recordIndex,
    atlasLayout,
    authoredLinks,
    geography,
    labelForCollection,
    hrefForRecord,
    detailForRecord,
    hrefForCollection,
    currentContext,
    siblings,
    atlasRecords
  };
})();
