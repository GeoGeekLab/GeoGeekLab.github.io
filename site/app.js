(() => {
  'use strict';

  const DATA_ROOT = window.GEOGEEK_DATA || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const locale = 'en';
  const data = DATA_ROOT.en || {};
  const ui = data.ui || {};
  const pageFile = location.pathname.split('/').pop() || 'index.html';
  const declaredPage = document.body?.dataset?.pageKey;
  const pageKey = declaredPage === 'record' ? 'record' : pageFile === 'field-notes.html' ? 'notes' : pageFile === 'lab.html' ? 'lab' : pageFile === 'atlas.html' ? 'atlas' : pageFile === 'elsewhere.html' ? 'elsewhere' : pageFile === 'commons.html' ? 'commons' : pageFile === 'record.html' ? 'record' : 'home';

  function setText(selector, value, root = document) {
    const node = $(selector, root);
    if (node && value != null) node.textContent = value;
  }


  const SCALE = {
    SITE: '1 : 250,000',
    POSITION: '1 : 100,000',
    COLLECTION: '1 : 25,000',
    RECORD: '1 : 2,500',
    DETAIL: '1 : 500'
  };

  function applyLocale() {
    document.documentElement.lang = 'en';
    document.body.dataset.locale = 'en';
    const appMeta = $('meta[name="application-name"]');
    if (appMeta) appMeta.content = 'GeoGeek';
    if (ui.pages?.[pageKey]?.title) document.title = ui.pages[pageKey].title;

    setText('.skip', ui.skip);
    const brand = $('.brand');
    if (brand) brand.setAttribute('aria-label', 'GeoGeek home');

    const nav = $('#primaryNav');
    if (nav) {
      nav.setAttribute('aria-label', ui.a11y?.primary || ('Primary navigation'));
      const labels = {
        'field-notes.html': ui.nav?.fieldNotes,
        'lab.html': ui.nav?.lab,
        'atlas.html': ui.nav?.atlas,
        'elsewhere.html': ui.nav?.elsewhere
      };
      $$('a', nav).forEach(link => {
        const href = link.getAttribute('href');
        if (labels[href]) link.textContent = labels[href];
      });
    }

    setText('#navToggle', ui.nav?.map);

    const index = $('#sheetIndex');
    if (index) {
      setText('.sheet-index-title', ui.sheet?.title, index);
      const homeLabels = { origin: ui.sheet?.origin, now: ui.sheet?.coordinates, 'field-notes': ui.sheet?.fieldNotes, lab: ui.sheet?.lab, atlas: ui.sheet?.atlas, elsewhere: ui.sheet?.elsewhere };
      $$('[data-sheet-link]', index).forEach(link => {
        const label = $('b', link);
        if (label && homeLabels[link.dataset.sheetLink]) label.textContent = homeLabels[link.dataset.sheetLink];
      });
      const globalLabels = {
        'index.html': ui.sheet?.origin,
        'commons.html': ui.sheet?.commons,
        '/commons.html': ui.sheet?.commons,
        'field-notes.html': ui.sheet?.fieldNotes,
        'lab.html': ui.sheet?.lab,
        'atlas.html': ui.sheet?.atlas,
        'elsewhere.html': ui.sheet?.elsewhere
      };
      $$('a[href]', index).forEach(link => {
        const label = $('b', link);
        const href = link.getAttribute('href');
        if (label && globalLabels[href]) label.textContent = globalLabels[href];
      });
      setText('.sheet-index-foot', index.classList.contains('home-index') ? ui.sheet?.homeFoot : pageKey === 'record' ? `${ui.scale?.levels?.RECORD || 'RECORD'} · ${ui.scale?.mode || 'RELATIVE'} 1 : 2,500` : pageKey === 'commons' ? ('COMMON FIELD · GEOGRAPHIC') : ui.sheet?.globalFoot, index);
      index.setAttribute('aria-label', index.classList.contains('home-index') ? 'Section index' : 'Site index');
    }

    const scale = $('.scale-ui');
    if (scale) {
      setText(':scope > span', ui.scale?.label, scale);
      setText('.scale-mode', ui.scale?.mode || ('RELATIVE'), scale);
      const order = ['SITE', 'POSITION', 'COLLECTION', 'RECORD', 'DETAIL'];
      $$('.scale-legend small', scale).forEach((node, index) => { node.textContent = ui.scale?.levels?.[order[index]] || order[index]; });
      scale.setAttribute('aria-label', ui.a11y?.scale || ('Relative information scale'));
    }

    const footerSpans = $$('.footer-meta > span');
    if (footerSpans[0]) footerSpans[0].textContent = ui.footer?.meta || '© 2026 GeoGeek';

    const archivePortal = ui.archivePortal;
    if (archivePortal) {
      setText('#wechatArchiveLabel', archivePortal.label);
      setText('#wechatArchiveTitle', archivePortal.title);
      setText('#wechatArchiveCopy', archivePortal.copy);
      setText('#wechatArchiveScan', archivePortal.scan);
      const archiveQr = $('.wechat-archive-code img');
      if (archiveQr && archivePortal.alt) archiveQr.alt = archivePortal.alt;
    }

    if (pageKey === 'home') {
      setText('.hero-tagline', ui.hero?.tagline);
      setText('.hero-origin-entry a', ui.hero?.origin);
      const heroOrigin = $('.hero-origin-entry a');
      if (heroOrigin) {
        heroOrigin.href = '/origin/';
        if (ui.hero?.originAria) heroOrigin.setAttribute('aria-label', ui.hero.originAria);
      }
      setText('.hero-edge-right', ui.hero?.right);
    } else {
      const pageCopy = ui.pages?.[pageKey];
      if (pageCopy) {
        setText('.page-title .eyebrow', pageCopy.eyebrow);
        setText('.page-title h1', pageCopy.heading);
        setText('.page-title .page-intro', pageCopy.intro);
      }
    }

    if (pageKey === 'notes') {
      const filters = ui.filters || {};
      $$('[data-note-filter]').forEach(button => {
        button.textContent = filters[button.dataset.noteFilter] || button.dataset.noteFilter;
      });
    }

    if (pageKey === 'lab') {
      setText('.instrument-principle span', ui.lab?.principleLabel || ('EXTENT / RESOLUTION / LIMIT'));
      setText('#labPrinciple', ui.lab?.principle);
      $('.lab-principle')?.setAttribute('aria-label', ui.a11y?.instrumentPrinciple || ('Instrument principle'));
      const conditions = $('#instrumentConditions');
      if (conditions) conditions.setAttribute('aria-label', 'Observation conditions');
      $('#instrumentClose')?.setAttribute('aria-label', ui.lab?.close || ('Close instrument'));
      setText('#instrumentReadout', `${ui.scale?.label || 'INFORMATION SCALE'} / ${ui.scale?.levels?.DETAIL || 'DETAIL'} · 1 : 500`);
      setText('#instrumentBoundary', ui.lab?.boundary);
    }

    if (pageKey === 'record') {
      $('.record-conditions')?.setAttribute('aria-label', ui.a11y?.recordConditions || ('Record conditions'));
    }

    if (pageKey === 'atlas') {
      $$('[data-projection]').forEach(button => {
        button.textContent = ui.atlas?.projectionNames?.[button.dataset.projection] || button.dataset.projection;
      });
      setText('.atlas-philosophy', ui.atlas?.philosophy);
      const tip = $('#atlasTip');
      if (tip) tip.innerHTML = `<span>${ui.atlas?.tipKicker || 'ATLAS'}</span><strong>${ui.atlas?.tipDefault || ''}</strong>`;
    }
  }

  function findRecord(ref) {
    const [kind, id] = String(ref || '').split(':');
    const collection = kind === 'notes' ? data.notes : kind === 'lab' ? data.lab : kind === 'elsewhere' ? data.elsewhere : null;
    const item = (collection || []).find(entry => entry.id === id);
    return item ? { kind, id, item } : null;
  }

  function recordUrl(ref) {
    return window.GEOGEEK_MODEL?.hrefForRecord?.(ref) || `record.html?ref=${encodeURIComponent(ref)}`;
  }

  function collectionHref(kind) {
    if (kind === 'notes') return 'field-notes.html';
    if (kind === 'lab') return 'lab.html';
    if (kind === 'elsewhere') return 'elsewhere.html';
    if (kind === 'atlas') return 'atlas.html';
    return 'index.html';
  }

  function detailUrl(ref) {
    return window.GEOGEEK_MODEL?.detailForRecord?.(ref) || null;
  }

  function initViewTransitions() {
    const prepare = event => {
      const link = event.target.closest?.('a[data-record-ref], a[data-transition-source]');
      if (!link) return;
      const title = $('h2, h3, strong', link) || link;
      title.style.viewTransitionName = 'record-title';
      if (link.dataset.recordRef) {
        try { sessionStorage.setItem('geogeek-record-origin', 'collection'); } catch {}
      }
    };
    document.addEventListener('pointerdown', prepare, true);
    document.addEventListener('click', prepare, true);
  }

  function initGeoField() {
    const canvas = $('#contourCanvas');
    const scaleText = $('#scaleText');
    const scaleLevel = $('#scaleLevel');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let dpr = 1;
    let width = innerWidth;
    let height = innerHeight;
    let pointerTarget = { x: .72, y: .40 };
    let pointer = { x: .72, y: .40 };
    let hover = { x: .72, y: .40, active: false };
    let targetZoom = .12;
    let zoom = targetZoom;
    let sectionScale = SCALE.SITE;
    let sectionLevel = 'SITE';
    let running = true;
    let rafId = 0;
    let lastDraw = 0;
    let dirty = true;

    const zoomFromScale = value => {
      const match = String(value).match(/[\d,]+$/);
      const denominator = match ? Number(match[0].replace(/,/g, '')) : 250000;
      const min = Math.log10(500);
      const max = Math.log10(250000);
      return Math.max(0, Math.min(1, 1 - (Math.log10(Math.max(500, denominator)) - min) / (max - min)));
    };

    const applyScale = (value, level, temporary = false) => {
      if (scaleText) scaleText.textContent = value;
      if (scaleLevel) scaleLevel.textContent = ui.scale?.levels?.[level] || level || '';
      window.GeoSemantic?.setActive?.(level);
      targetZoom = zoomFromScale(value);
      dirty = true;
      if (!temporary) {
        sectionScale = value;
        sectionLevel = level || '';
      }
    };
    const restoreScale = () => applyScale(sectionScale, sectionLevel, true);
    window.GeoScale = { apply: (level, temporary = true) => applyScale(SCALE[level] || SCALE.COLLECTION, level, temporary), restore: restoreScale };

    function resize() {
      width = innerWidth;
      height = innerHeight;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    }

    addEventListener('resize', resize, { passive: true });
    resize();

    addEventListener('pointermove', event => {
      pointerTarget.x = event.clientX / Math.max(1, width);
      pointerTarget.y = event.clientY / Math.max(1, height);
      dirty = true;
    }, { passive: true });

    function bindContourTargets() {
      $$('.contour-target, .preview-row, .note-row, .lab-row, .elsewhere-card').forEach(element => {
        if (element.dataset.contourBound) return;
        element.dataset.contourBound = '1';

        const focus = event => {
          const rect = element.getBoundingClientRect();
          const x = Number.isFinite(event?.clientX) ? event.clientX : rect.left + rect.width / 2;
          const y = Number.isFinite(event?.clientY) ? event.clientY : rect.top + rect.height / 2;
          hover = { x: x / width, y: y / height, active: true };
          element.style.setProperty('--geo-x', `${Math.max(0, Math.min(100, (x - rect.left) / Math.max(1, rect.width) * 100))}%`);
          element.style.setProperty('--geo-y', `${Math.max(0, Math.min(100, (y - rect.top) / Math.max(1, rect.height) * 100))}%`);
          applyScale(element.dataset.localScale || SCALE.RECORD, element.dataset.localLevel || 'RECORD', true);
          dirty = true;
        };

        element.addEventListener('pointerenter', focus);
        element.addEventListener('pointermove', focus, { passive: true });
        element.addEventListener('focusin', focus);
        element.addEventListener('pointerleave', () => { hover.active = false; restoreScale(); dirty = true; });
        element.addEventListener('focusout', () => { hover.active = false; restoreScale(); dirty = true; });
      });
    }
    window.bindContourTargets = bindContourTargets;

    const gaussian = (x, y, cx, cy, sx, sy, amplitude) => {
      const dx = (x - cx) / sx;
      const dy = (y - cy) / sy;
      return amplitude * Math.exp(-(dx * dx + dy * dy) * .5);
    };

    function scalarField(nx, ny) {
      const driftX = (pointer.x - .5) * .018;
      const driftY = (pointer.y - .5) * .012;
      let value =
        gaussian(nx, ny, .79 + driftX, .34 + driftY, .18, .13, 1.15) +
        gaussian(nx, ny, .18 - driftX * .6, .79 - driftY * .6, .12, .09, .72) +
        gaussian(nx, ny, .60, .69, .20, .18, .34) -
        gaussian(nx, ny, .57, .46, .16, .12, .26);
      value += .08 * Math.sin(nx * Math.PI * 3.2 + ny * Math.PI * 1.7);
      value += .045 * Math.cos(ny * Math.PI * 4.1 - nx * Math.PI * 1.3);
      if (hover.active) value += gaussian(nx, ny, hover.x, hover.y, .055, .045, .16 + zoom * .08);
      return value;
    }

    function edgePoint(edge, x0, y0, x1, y1, v0, v1, v2, v3, level) {
      const interp = (a, b, va, vb) => {
        const delta = vb - va;
        const t = Math.abs(delta) < 1e-9 ? .5 : Math.max(0, Math.min(1, (level - va) / delta));
        return a + (b - a) * t;
      };
      if (edge === 0) return [interp(x0, x1, v0, v1), y0];
      if (edge === 1) return [x1, interp(y0, y1, v1, v2)];
      if (edge === 2) return [interp(x1, x0, v2, v3), y1];
      return [x0, interp(y1, y0, v3, v0)];
    }

    const CASES = {
      1: [[3,0]], 2: [[0,1]], 3: [[3,1]], 4: [[1,2]],
      5: [[3,2],[0,1]], 6: [[0,2]], 7: [[3,2]], 8: [[2,3]],
      9: [[0,2]], 10: [[0,3],[1,2]], 11: [[1,2]], 12: [[1,3]],
      13: [[0,1]], 14: [[3,0]]
    };

    function drawReferenceGrid() {
      const spacing = Math.max(64, 126 - zoom * 54);
      const offsetX = ((pointer.x - .5) * 14) % spacing;
      const offsetY = ((pointer.y - .5) * 10) % spacing;
      ctx.lineWidth = .55;
      ctx.strokeStyle = `rgba(27,43,34,${.020 + zoom * .010})`;
      ctx.beginPath();
      for (let x = offsetX; x < width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = offsetY; y < height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();
    }

    function drawIsolines() {
      const cell = Math.max(22, 34 - zoom * 9);
      const cols = Math.ceil(width / cell) + 1;
      const rows = Math.ceil(height / cell) + 1;
      const values = new Float32Array(cols * rows);
      let min = Infinity;
      let max = -Infinity;

      for (let j = 0; j < rows; j += 1) {
        const ny = (j * cell) / Math.max(1, height);
        for (let i = 0; i < cols; i += 1) {
          const nx = (i * cell) / Math.max(1, width);
          const value = scalarField(nx, ny);
          values[j * cols + i] = value;
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }

      const bands = 6 + Math.round(zoom * 8);
      const low = min + (max - min) * .16;
      const high = max - (max - min) * .08;

      for (let band = 0; band < bands; band += 1) {
        const level = low + (high - low) * ((band + 1) / (bands + 1));
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j += 1) {
          for (let i = 0; i < cols - 1; i += 1) {
            const idx = j * cols + i;
            const v0 = values[idx];
            const v1 = values[idx + 1];
            const v2 = values[idx + cols + 1];
            const v3 = values[idx + cols];
            const code = (v0 >= level ? 1 : 0) | (v1 >= level ? 2 : 0) | (v2 >= level ? 4 : 0) | (v3 >= level ? 8 : 0);
            const pairs = CASES[code];
            if (!pairs) continue;

            const x0 = i * cell;
            const y0 = j * cell;
            const x1 = Math.min(width, x0 + cell);
            const y1 = Math.min(height, y0 + cell);

            pairs.forEach(([a, b]) => {
              const p0 = edgePoint(a, x0, y0, x1, y1, v0, v1, v2, v3, level);
              const p1 = edgePoint(b, x0, y0, x1, y1, v0, v1, v2, v3, level);
              ctx.moveTo(p0[0], p0[1]);
              ctx.lineTo(p1[0], p1[1]);
            });
          }
        }
        const major = band % 4 === 0;
        ctx.strokeStyle = `rgba(27,43,34,${major ? .070 + zoom * .010 : .032 + zoom * .009})`;
        ctx.lineWidth = major ? .82 : .58;
        ctx.stroke();
      }
    }

    function drawSurveyMark() {
      if (!hover.active) return;
      const x = hover.x * width;
      const y = hover.y * height;
      ctx.strokeStyle = 'rgba(166,70,36,.20)';
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y);
      ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12);
      ctx.stroke();
    }

    function render(time = performance.now()) {
      pointer.x += (pointerTarget.x - pointer.x) * .08;
      pointer.y += (pointerTarget.y - pointer.y) * .08;
      zoom += (targetZoom - zoom) * .08;

      const moving = Math.abs(pointerTarget.x - pointer.x) + Math.abs(pointerTarget.y - pointer.y) + Math.abs(targetZoom - zoom) > .001;
      if (dirty || moving || time - lastDraw > 220) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        drawReferenceGrid();
        drawIsolines();
        drawSurveyMark();
        lastDraw = time;
        dirty = false;
      }

      if (running) rafId = requestAnimationFrame(render);
    }

    const scaleSections = $$('[data-scale]');
    if (scaleSections.length) {
      const observer = new IntersectionObserver(entries => {
        const hit = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) applyScale(hit.target.dataset.scale, hit.target.dataset.scaleLevel || 'COLLECTION');
      }, { threshold: [.2, .4, .6, .8] });
      scaleSections.forEach(section => observer.observe(section));
      applyScale(scaleSections[0].dataset.scale, scaleSections[0].dataset.scaleLevel || 'SITE');
    }

    bindContourTargets();
    window.GeoField = {
      pause() {
        if (!running) return;
        running = false;
        cancelAnimationFrame(rafId);
        canvas.classList.add('is-paused');
      },
      resume() {
        if (running) return;
        running = true;
        canvas.classList.remove('is-paused');
        dirty = true;
        rafId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) window.GeoField.pause();
      else if (!document.body.classList.contains('instrument-open')) window.GeoField.resume();
    });
    rafId = requestAnimationFrame(render);
  }

  function initSheetIndex() {
    const index = $('#sheetIndex');
    if (!index) return;

    const homeOrigin = $('#origin');
    if (index.classList.contains('home-index')) document.body.dataset.currentSection = 'origin';
    if (index.classList.contains('home-index') && homeOrigin) {
      const reveal = new IntersectionObserver(entries => {
        const originVisible = entries[0]?.isIntersecting && entries[0].intersectionRatio > .18;
        index.classList.toggle('is-visible', !originVisible);
        document.body.classList.toggle('origin-active', originVisible);
      }, { threshold: [.18, .35, .6] });
      reveal.observe(homeOrigin);
    }

    const links = $$('[data-sheet-link]', index);
    if (!links.length) return;
    const targets = links.map(link => document.getElementById(link.dataset.sheetLink)).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const hit = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!hit) return;
      document.body.dataset.currentSection = hit.target.id;
      const collectionKey = hit.target.id === 'field-notes' ? 'notes' : hit.target.id === 'lab' ? 'lab' : hit.target.id === 'atlas' ? 'atlas' : hit.target.id === 'elsewhere' ? 'elsewhere' : null;
      window.GeoSemantic?.setCollection?.(collectionKey);
      links.forEach(link => {
        if (link.dataset.sheetLink === hit.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { threshold: [.18, .35, .55, .75], rootMargin: '-18% 0px -38% 0px' });
    targets.forEach(target => observer.observe(target));
  }



  function labPreviewKind(item) {
    const byId = { l01: 'terrain', l02: 'evidence', l03: 'worlds', l10: 'pulse', l11: 'figure', l12: 'world' };
    const byInstrument = { orbit: 'orbit', earth: 'earth', flow: 'flow', pulse: 'pulse', figure: 'figure', locate: 'locate', zone: 'zone', path: 'path' };
    return item.visual || byInstrument[item.instrument] || byId[item.id] || 'terrain';
  }

  function labPreviewMarkup(item) {
    const kind = labPreviewKind(item);
    const tagLine = item.title || (item.tags || []).slice(0, 3).join(' · ');
    if (kind === 'orbit') return `<div class="preview-art preview-orbit"><span class="orbit-globe"></span><i class="orbit-arc orbit-arc-a"></i><i class="orbit-arc orbit-arc-b"></i><i class="orbit-arc orbit-arc-c"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'earth') return `<div class="preview-art preview-earth"><span class="map mass a"></span><span class="map mass b"></span><span class="map mass c"></span><i class="marker m1"></i><i class="marker m2"></i><i class="marker m3"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'flow') return `<div class="preview-art preview-flow"><i class="stream s1"></i><i class="stream s2"></i><i class="stream s3"></i><i class="stream s4"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'pulse') return `<div class="preview-art preview-pulse"><span class="map mass a"></span><span class="map mass b"></span><span class="map mass c"></span><i class="quake q1"></i><i class="quake q2"></i><i class="quake q3"></i><i class="quake q4"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'figure') return `<div class="preview-art preview-figure"><div class="figure-panel raster"></div><div class="figure-panel vector"></div><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'world') return `<div class="preview-art preview-world"><span class="map mass a"></span><span class="map mass b"></span><span class="map mass c"></span><i class="graticule"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'locate') return `<div class="preview-art preview-game"><span class="map mass a"></span><span class="map mass b"></span><span class="map mass c"></span><i class="target-dot"></i><i class="crosshair"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'zone') return `<div class="preview-art preview-game preview-zone"><span class="map mass a"></span><span class="map mass b"></span><span class="map mass c"></span><i class="zone-fill"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'path') return `<div class="preview-art preview-game preview-path"><span class="map mass a"></span><span class="map mass b"></span><span class="map mass c"></span><i class="route-line"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'evidence') return `<div class="preview-art preview-evidence"><i class="node n1"></i><i class="node n2"></i><i class="node n3"></i><i class="node n4"></i><i class="edge e1"></i><i class="edge e2"></i><i class="edge e3"></i><b class="preview-stamp">${tagLine}</b></div>`;
    if (kind === 'worlds') return `<div class="preview-art preview-worlds"><div class="world-slice"></div><div class="world-slice"></div><div class="world-slice"></div><b class="preview-stamp">${tagLine}</b></div>`;
    return `<div class="preview-art preview-terrain"><i class="contour c1"></i><i class="contour c2"></i><i class="contour c3"></i><i class="contour c4"></i><b class="preview-stamp">${tagLine}</b></div>`;
  }


  function atlasItems() {
    const modelItems = window.GEOGEEK_MODEL?.atlasRecords?.();
    if (modelItems?.length) return modelItems.map(item => ({ ...item, id: item.ref }));
    const layouts = data.atlasLayout || [];
    const collections = {
      notes: data.notes || [],
      lab: data.lab || [],
      elsewhere: data.elsewhere || []
    };
    return layouts.map(layout => {
      const [collectionKey, recordId] = String(layout.ref || '').split(':');
      const record = (collections[collectionKey] || []).find(item => item.id === recordId) || {};
      const yearFromDate = Number(String(record.date || '').slice(0, 4));
      return {
        ...layout,
        id: layout.ref,
        title: displayRecordTitle(record.title || layout.ref),
        year: Number.isFinite(yearFromDate) && yearFromDate > 0 ? yearFromDate : (layout.year || 2026),
        sourceKind: collectionKey,
        sourceId: recordId
      };
    });
  }

  function initNotes() {
    const list = $('#noteList');
    if (!list || !data.notes) return;

    const seriesKey = $('#archiveSeriesKey');
    if (seriesKey) {
      const order = ['observation','scale','causality','representation','practice'];
      const labels = data.ui?.filters || {};
      seriesKey.innerHTML = order.map(key => {
        const count = data.notes.filter(note => note.seriesKey === key).length;
        return `<span><b>${String(count).padStart(2,'0')}</b>${labels[key] || key}</span>`;
      }).join('');
    }

    const render = (filter = 'all') => {
      const items = data.notes.filter(note => filter === 'all' || note.seriesKey === filter);
      list.innerHTML = items.map(note => `
        <a class="note-row archive-note-row contour-target" data-series="${note.seriesKey || ''}" data-record-ref="notes:${note.id}" data-transition-source data-local-scale="${SCALE.RECORD}" data-local-level="RECORD" id="${note.id}" href="${recordUrl(`notes:${note.id}`)}">
          <time>${note.date}</time><h2>${displayRecordTitle(note.title)}</h2><span class="note-meta">${note.series || note.type} · ${(note.tags || []).slice(0,2).join(' · ')} · ${note.read}</span><span class="arrow">↗</span>
        </a>`).join('');
      window.bindContourTargets?.();
    };

    $$('[data-note-filter]').forEach(button => button.addEventListener('click', () => {
      $$('[data-note-filter]').forEach(item => item.classList.toggle('is-active', item === button));
      render(button.dataset.noteFilter);
    }));
    render();
  }

  function renderLab() {
    const list = $('#labList');
    if (!list || !data.lab) return;
    const groups = ['studies', 'observatory', 'play'];
    list.innerHTML = groups.map(group => {
      const items = data.lab.filter(item => (item.group || 'studies') === group);
      if (!items.length) return '';
      return `
        <section class="lab-group-block">
          <div class="lab-group-label"><span>${ui.lab?.groups?.[group] || group}</span><i></i></div>
          <div class="project-grid">
            ${items.map(item => `
              <article class="project-card contour-target${item.instrument ? ' is-actionable' : ''}" data-record-ref="lab:${item.id}" data-detail-href="${item.instrument ? `lab.html?instrument=${encodeURIComponent(item.instrument)}#${item.id}` : `${recordUrl(`lab:${item.id}`)}#detail`}" data-local-scale="${SCALE.RECORD}" data-local-level="RECORD" id="${item.id}">
                <div class="project-visual project-visual-${labPreviewKind(item)}">${labPreviewMarkup(item)}</div>
                <div class="project-copy">
                  <div class="project-meta"><span>${item.status}</span><span>${(item.tags || []).slice(0, 3).join(' · ')}</span></div>
                  <h2>${item.title}</h2>
                  <p>${item.description}</p>
                  <div class="project-foot">
                    <span class="lab-coord">${item.coord}</span>
                    <div class="project-actions">
                      <a class="project-cta project-link" data-record-ref="lab:${item.id}" data-transition-source href="${recordUrl(`lab:${item.id}`)}"><span>${'RECORD'}</span><b>↗</b></a>
                      ${item.instrument ? `<button class="lab-enter project-cta" type="button" data-instrument="${item.instrument}"><span>${ui.lab?.enter || 'ENTER'}</span><b>↗</b></button>` : ''}
                    </div>
                  </div>
                </div>
              </article>`).join('')}
          </div>
        </section>`;
    }).join('');
    window.bindContourTargets?.();
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }));
    }
  }

  function displayRecordTitle(rawTitle) {
    return String(rawTitle || '').trim();
  }

  function calibrateArchiveReading(root) {
    if (!root) return;
    root.querySelectorAll(':scope > p').forEach(paragraph => {
      paragraph.classList.toggle('is-dense', paragraph.textContent.trim().length > 620);
    });
    root.querySelectorAll('.archive-figure img').forEach(image => {
      const figure = image.closest('.archive-figure');
      if (!figure) return;
      const apply = () => {
        const width = image.naturalWidth || 0;
        const height = image.naturalHeight || 0;
        if (!width || !height) return;
        const ratio = width / height;
        figure.classList.remove('is-portrait', 'is-compact', 'is-wide', 'is-ultrawide');
        if (ratio <= .82) figure.classList.add('is-portrait');
        else if (ratio >= 2.5) figure.classList.add('is-ultrawide');
        else if (ratio >= 1.75) figure.classList.add('is-wide');
        else if (width < 720) figure.classList.add('is-compact');
        const alt = (image.getAttribute('alt') || '').trim();
        if (!alt || /^(image|figure)$/i.test(alt)) {
          const caption = figure.nextElementSibling?.classList?.contains('archive-caption') ? figure.nextElementSibling.textContent.trim() : '';
          image.alt = caption ? caption.slice(0, 180) : ('Article figure');
        }
      };
      if (image.complete) apply();
      else image.addEventListener('load', apply, { once: true });
    });
  }

  function renderElsewhere() {
    const grid = $('#elsewhereGrid');
    if (!grid || !data.elsewhere) return;
    grid.innerHTML = data.elsewhere.map(item => `
      <a class="elsewhere-card contour-target" data-record-ref="elsewhere:${item.id}" data-transition-source data-local-scale="${SCALE.RECORD}" data-local-level="RECORD" id="${item.id}" href="${recordUrl(`elsewhere:${item.id}`)}">
        <div class="visual"></div>
        <div><div class="eyebrow">${item.kind}</div><h2>${item.title}</h2><p>${item.subtitle}</p><p class="elsewhere-meta">${item.meta}</p></div>
      </a>`).join('');
    window.bindContourTargets?.();
  }

  function renderRecord() {
    if (pageKey !== 'record') return;
    const ref = document.body?.dataset?.recordRef || new URLSearchParams(location.search).get('ref');
    const record = findRecord(ref);
    const titleNode = $('#recordTitle');
    const excerptNode = $('#recordExcerpt');
    const bodyNode = $('#recordBody');
    const metaNode = $('#recordMeta');
    const backNode = $('#recordBack');
    const actionsNode = $('#recordActions');
    if (!titleNode || !bodyNode || !metaNode) return;

    const recordUI = ui.record || {};
    setText('#recordConditionsLabel', recordUI.conditions || 'RECORD CONDITIONS');
    setText('#recordDetailLabel', recordUI.detail || 'DETAIL');

    if (!record) {
      titleNode.textContent = recordUI.unavailable || 'Record not found.';
      excerptNode.textContent = '';
      bodyNode.textContent = '';
      metaNode.innerHTML = '';
      if (backNode) backNode.href = 'index.html';
      return;
    }

    const { kind, item } = record;
    if (kind === 'lab' && item.instrument) {
      setText('#recordDetailLabel', ui.scale?.levels?.RECORD || 'RECORD');
      const detailSection = $('#detail');
      if (detailSection) {
        detailSection.dataset.scale = SCALE.RECORD;
        detailSection.dataset.scaleLevel = 'RECORD';
      }
    }
    const collectionLabel = kind === 'notes' ? ui.nav?.fieldNotes : kind === 'lab' ? ui.nav?.lab : ui.nav?.elsewhere;
    const backHref = collectionHref(kind);
    if (backNode) {
      backNode.href = backHref;
      backNode.textContent = `${recordUI.back || '← COLLECTION'} · ${collectionLabel || kind}`;
    }

    const kicker = kind === 'notes' ? item.type : kind === 'lab' ? item.status : item.kind;
    const excerpt = kind === 'notes' ? item.excerpt : kind === 'lab' ? item.description : item.subtitle;
    const body = kind === 'notes' ? (item.body || item.excerpt) : kind === 'lab' ? item.description : item.subtitle;
    setText('#recordKicker', `${kicker || 'RECORD'} / ${ui.scale?.levels?.RECORD || 'RECORD'}`);
    titleNode.textContent = displayRecordTitle(item.title);
    titleNode.style.viewTransitionName = 'record-title';
    excerptNode.textContent = excerpt || '';
    if (kind === 'notes' && item.bodyHtml) bodyNode.innerHTML = item.bodyHtml;
    else bodyNode.innerHTML = `<p>${body || ''}</p>`;
    if (kind === 'notes') calibrateArchiveReading(bodyNode);
    document.title = `${displayRecordTitle(item.title)} — GeoGeek`;
    $('#recordHeading')?.setAttribute('data-record-ref', ref);

    const labels = recordUI.labels || {};
    const values = recordUI.values || {};
    const geography = window.GEOGEEK_MODEL?.recordIndex?.get(ref)?.geography || null;
    const extentLabel = geography?.kind === 'extent' ? ('Global geographic extent') : geography?.kind === 'point' ? (geography.label || '') : '';
    let conditions = [];
    if (kind === 'notes') {
      conditions = [
        ['series', item.series],
        ['field', (item.tags || [])[0]],
        ['object', (item.tags || []).slice(1).join(' · ')],
        ['method', item.type],
        ['published', item.published || item.date],
        ['webEdition', item.webEdition],
        ['scale', values.scale || (ui.scale?.levels?.RECORD || 'Record')],
        ['source', item.source],
        ['status', item.status || values.noteStatus || 'Working note']
      ];
    } else if (kind === 'lab') {
      conditions = [
        ['field', (item.tags || [])[0]],
        ['object', item.coord],
        ['method', item.instrumentKicker || item.status],
        ['scale', values.scale || (ui.scale?.levels?.RECORD || 'Record')],
        ['extent', extentLabel],
        ['source', item.source || ('Browser-native')],
        ['status', item.status]
      ];
    } else {
      conditions = [
        ['field', values.livedField || 'Lived geography'],
        ['object', item.kind],
        ['method', item.meta],
        ['scale', values.scale || (ui.scale?.levels?.RECORD || 'Record')],
        ['status', values.open || 'Open record']
      ];
    }
    metaNode.innerHTML = conditions.filter(([, value]) => value).map(([key, value]) => `<div><dt>${labels[key] || key.toUpperCase()}</dt><dd>${value}</dd></div>`).join('');

    const actions = [`<a class="record-action secondary" href="${backHref}">${recordUI.returnCollection || 'RETURN TO COLLECTION ↗'}</a>`];
    if (kind === 'notes' && item.sourceUrl) actions.push(`<a class="record-action secondary" href="${item.sourceUrl}" target="_blank" rel="noreferrer">${recordUI.original || ('ORIGINAL WECHAT ↗')}</a>`);
    try {
      if (sessionStorage.getItem('geogeek-record-origin') === 'atlas') actions.unshift(`<a class="record-action secondary" href="atlas.html">${recordUI.returnAtlas || 'RETURN TO ATLAS ↗'}</a>`);
    } catch {}
    if (kind === 'lab' && item.instrument) actions.unshift(`<a class="record-action primary" href="lab.html?instrument=${encodeURIComponent(item.instrument)}#${item.id}">${recordUI.openInstrument || 'OPEN INSTRUMENT ↗'}</a>`);
    actionsNode.innerHTML = actions.join('');

    $$('#primaryNav a').forEach(link => link.removeAttribute('aria-current'));
    const navHref = collectionHref(kind);
    $(`#primaryNav a[href="${navHref}"]`)?.setAttribute('aria-current', 'page');
    $$('#sheetIndex a').forEach(link => link.removeAttribute('aria-current'));
    $(`#sheetIndex a[href="${navHref}"]`)?.setAttribute('aria-current', 'page');
  }

  function initCurrentCoordinates() {
    const workbench = $('.coordinates-workbench');
    const plot = $('#coordinatePlot');
    const canvas = $('#coordinateCanvas');
    if (!workbench || !plot || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stages = ['being', 'seeing', 'valuing', 'making'];
    const readouts = {
      being: ['BEING / ONTOLOGY', 'TO BE IS TO BE SOMEWHERE.', 'SITUATION · RELATION · BECOMING'],
      seeing: ['SEEING / EPISTEMOLOGY', 'TO SEE IS TO FRAME.', 'APPEARANCE · FRAME · LIMIT'],
      valuing: ['VALUING / AXIOLOGY', 'TO VALUE IS TO CHOOSE.', 'JUDGMENT · CHOICE · RESPONSIBILITY'],
      making: ['MAKING / PRAXIS', 'TO BUILD IS TO ALTER THE FIELD.', 'ACTION · POSSIBILITY · CONSEQUENCE']
    };

    const triggers = $$('[data-coordinate-trigger]', workbench);
    const articles = $$('[data-coordinate]', workbench);
    const readoutKicker = $('#coordinateReadoutKicker');
    const readout = $('#coordinateReadout');
    const probeReadout = $('#coordinateProbeReadout');
    const fieldStatus = $('#coordinateFieldStatus');
    const resetButton = $('#coordinateReset');

    const W = 640;
    const H = 440;
    const ink = 'rgba(21,32,25,';
    const soft = 'rgba(84,94,87,';
    const signal = 'rgba(166,70,36,';
    const paper = '#f6f4ee';

    const basePoints = [
      [152,132],[225,104],[309,126],[392,96],[478,143],
      [505,228],[441,306],[344,334],[245,307],[166,246]
    ];
    const edges = [
      [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,0],
      [1,9],[1,8],[2,8],[2,7],[3,6],[4,6],[5,7],[0,8]
    ];
    const mutableIndex = 6;

    let points = basePoints.map(point => [...point]);
    let activeStage = 'being';
    let changed = false;
    let dragging = false;
    let raf = 0;

    const drawBackdrop = (alpha = .12) => {
      ctx.save();
      ctx.strokeStyle = soft + alpha + ')';
      ctx.lineWidth = .75;
      ctx.setLineDash([2,4]);
      ctx.beginPath();
      ctx.moveTo(78,164);
      ctx.bezierCurveTo(188,102,352,92,556,174);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(92,274);
      ctx.bezierCurveTo(214,214,390,222,548,308);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(132,354);
      ctx.bezierCurveTo(248,302,414,315,520,360);
      ctx.stroke();
      ctx.restore();
    };

    const drawGrid = () => {
      ctx.save();
      ctx.strokeStyle = soft + '.105)';
      ctx.lineWidth = .7;
      for (let x = 104; x <= 536; x += 72) {
        ctx.beginPath();
        ctx.moveTo(x, 60);
        ctx.lineTo(x, 380);
        ctx.stroke();
      }
      for (let y = 76; y <= 364; y += 64) {
        ctx.beginPath();
        ctx.moveTo(78, y);
        ctx.lineTo(562, y);
        ctx.stroke();
      }
      ctx.strokeStyle = signal + '.26)';
      ctx.setLineDash([4,4]);
      ctx.strokeRect(125, 82, 390, 278);
      ctx.restore();
    };

    const drawRelations = (stage) => {
      ctx.save();
      edges.forEach(([a,b], index) => {
        const p1 = points[a];
        const p2 = points[b];
        const selectedEdge = a === mutableIndex || b === mutableIndex;
        const valueEdge = stage === 'valuing' && [3,4,5,6,7].includes(a) && [3,4,5,6,7].includes(b);
        ctx.strokeStyle = valueEdge ? signal + '.62)' : selectedEdge && stage === 'making' ? signal + '.46)' : soft + (stage === 'being' ? '.28)' : '.22)');
        ctx.lineWidth = valueEdge ? 1.25 : selectedEdge && stage === 'making' ? 1.15 : .82;
        if (index % 4 === 0 && stage === 'being') ctx.setLineDash([2,3]); else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      });
      ctx.restore();
    };

    const drawNodes = (stage) => {
      ctx.save();
      points.forEach((point, index) => {
        const [x,y] = point;
        const mutable = index === mutableIndex;
        const valued = stage === 'valuing' && [3,4,5,6,7].includes(index);
        ctx.beginPath();
        ctx.arc(x, y, mutable && stage === 'making' ? 5.4 : 3.8, 0, Math.PI * 2);
        ctx.fillStyle = valued || (mutable && stage === 'making') ? signal + '.92)' : ink + '.78)';
        ctx.fill();
        ctx.strokeStyle = paper;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        if (mutable && stage === 'making') {
          ctx.beginPath();
          ctx.arc(x, y, 13, 0, Math.PI * 2);
          ctx.strokeStyle = signal + '.42)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2,3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
      ctx.restore();
    };

    const drawBeing = () => {
      drawBackdrop(.18);
      drawRelations('being');
      drawNodes('being');
    };

    const drawSeeing = () => {
      drawBackdrop(.09);
      drawGrid();
      drawRelations('seeing');
      drawNodes('seeing');
      ctx.save();
      const focus = points[mutableIndex];
      ctx.strokeStyle = signal + '.42)';
      ctx.lineWidth = .9;
      ctx.setLineDash([2,3]);
      ctx.beginPath();
      ctx.moveTo(78, focus[1]);
      ctx.lineTo(562, focus[1]);
      ctx.moveTo(focus[0], 60);
      ctx.lineTo(focus[0], 380);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = signal + '.76)';
      ctx.font = '600 8px "IBM Plex Mono", monospace';
      ctx.fillText('SEEING / FRAMED', 408, 75);
      ctx.restore();
    };

    const drawValuing = () => {
      drawBackdrop(.07);
      drawRelations('valuing');
      drawNodes('valuing');
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(414, 219, 133, 145, -.08, 0, Math.PI * 2);
      ctx.fillStyle = signal + '.035)';
      ctx.fill();
      ctx.strokeStyle = signal + '.42)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5,4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = signal + '.78)';
      ctx.font = '600 8px "IBM Plex Mono", monospace';
      ctx.fillText('VALUING / CHOSEN', 385, 374);
      ctx.restore();
    };

    const drawMaking = () => {
      drawBackdrop(.08);
      drawRelations('making');
      drawNodes('making');
      ctx.save();
      const base = basePoints[mutableIndex];
      const current = points[mutableIndex];
      if (changed) {
        ctx.strokeStyle = soft + '.32)';
        ctx.lineWidth = .9;
        ctx.setLineDash([3,4]);
        ctx.beginPath();
        ctx.moveTo(base[0], base[1]);
        ctx.lineTo(current[0], current[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(base[0], base[1], 4, 0, Math.PI * 2);
        ctx.strokeStyle = soft + '.42)';
        ctx.stroke();
      }
      ctx.fillStyle = signal + '.82)';
      ctx.font = '600 8px "IBM Plex Mono", monospace';
      ctx.fillText(changed ? 'FIELD CHANGED' : 'ALTER THE FIELD', 394, 374);
      ctx.restore();
    };

    const draw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = plot.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.save();
        ctx.scale(rect.width / W, rect.height / H);

        if (activeStage === 'being') drawBeing();
        else if (activeStage === 'seeing') drawSeeing();
        else if (activeStage === 'valuing') drawValuing();
        else drawMaking();

        ctx.restore();
      });
    };

    const resize = () => {
      const rect = plot.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      draw();
    };

    const updateFieldState = () => {
      if (!fieldStatus) return;
      if (changed) {
        fieldStatus.textContent = 'FIELD / CHANGED';
      } else if (activeStage === 'being') {
        fieldStatus.textContent = 'BEING / SITUATED';
      } else if (activeStage === 'seeing') {
        fieldStatus.textContent = 'SEEING / FRAMED';
      } else if (activeStage === 'valuing') {
        fieldStatus.textContent = 'VALUING / CHOSEN';
      } else {
        fieldStatus.textContent = 'MAKING / POSSIBLE';
      }
      if (resetButton) resetButton.hidden = !changed;
    };

    const renderStage = stage => {
      if (!stages.includes(stage)) return;
      activeStage = stage;
      workbench.dataset.coordinateState = stage;
      triggers.forEach(trigger => {
        const active = trigger.dataset.coordinateTrigger === stage;
        trigger.classList.toggle('is-active', active);
        trigger.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      articles.forEach(article => article.classList.toggle('is-active', article.dataset.coordinate === stage));
      const copy = readouts[stage];
      if (readoutKicker) readoutKicker.textContent = copy[0];
      if (readout) readout.textContent = copy[1];
      if (probeReadout) probeReadout.textContent = copy[2];
      updateFieldState();
      draw();
    };

    const pointFromEvent = event => {
      const rect = plot.getBoundingClientRect();
      return [
        (event.clientX - rect.left) / Math.max(1, rect.width) * W,
        (event.clientY - rect.top) / Math.max(1, rect.height) * H
      ];
    };

    const moveMutablePoint = (x, y) => {
      points[mutableIndex] = [
        Math.max(118, Math.min(530, x)),
        Math.max(84, Math.min(356, y))
      ];
      const base = basePoints[mutableIndex];
      changed = Math.hypot(points[mutableIndex][0] - base[0], points[mutableIndex][1] - base[1]) > 2;
      updateFieldState();
      draw();
    };

    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => renderStage(trigger.dataset.coordinateTrigger));
    });

    plot.addEventListener('pointerdown', event => {
      if (activeStage !== 'making' || event.target.closest?.('button')) return;
      const point = pointFromEvent(event);
      const current = points[mutableIndex];
      if (Math.hypot(point[0] - current[0], point[1] - current[1]) > 30) return;
      dragging = true;
      workbench.dataset.dragging = 'true';
      plot.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    plot.addEventListener('pointermove', event => {
      if (!dragging || activeStage !== 'making') return;
      const point = pointFromEvent(event);
      moveMutablePoint(point[0], point[1]);
    });

    const stopDrag = event => {
      if (!dragging) return;
      dragging = false;
      delete workbench.dataset.dragging;
      if (event?.pointerId != null && plot.hasPointerCapture?.(event.pointerId)) {
        plot.releasePointerCapture?.(event.pointerId);
      }
    };

    plot.addEventListener('pointerup', stopDrag);
    plot.addEventListener('pointercancel', stopDrag);
    plot.addEventListener('lostpointercapture', stopDrag);

    plot.addEventListener('keydown', event => {
      if (activeStage !== 'making') return;
      const step = event.shiftKey ? 12 : 5;
      const current = points[mutableIndex];
      let x = current[0];
      let y = current[1];
      if (event.key === 'ArrowLeft') x -= step;
      else if (event.key === 'ArrowRight') x += step;
      else if (event.key === 'ArrowUp') y -= step;
      else if (event.key === 'ArrowDown') y += step;
      else return;
      event.preventDefault();
      moveMutablePoint(x, y);
    });

    resetButton?.addEventListener('click', () => {
      points = basePoints.map(point => [...point]);
      changed = false;
      updateFieldState();
      draw();
    });

    new ResizeObserver(resize).observe(plot);
    renderStage('being');
    resize();
  }
  applyLocale();
  initNotes();
  renderLab();
  renderElsewhere();
  renderRecord();
  initViewTransitions();
  initGeoField();
  initCurrentCoordinates();
  initSheetIndex();
  window.bindContourTargets?.();
})();
