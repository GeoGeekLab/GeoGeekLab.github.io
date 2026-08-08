(() => {
  'use strict';

  const DATA_ROOT = window.GEOGEEK_DATA || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const readLocale = () => {
    try { return localStorage.getItem('geogeek-language') === 'zh' ? 'zh' : 'en'; }
    catch { return 'en'; }
  };
  const locale = readLocale();
  const data = DATA_ROOT[locale] || DATA_ROOT.en || {};
  const ui = data.ui || {};
  const pageFile = location.pathname.split('/').pop() || 'index.html';
  const pageKey = pageFile === 'field-notes.html' ? 'notes' : pageFile === 'lab.html' ? 'lab' : pageFile === 'atlas.html' ? 'atlas' : pageFile === 'elsewhere.html' ? 'elsewhere' : 'home';

  function setText(selector, value, root = document) {
    const node = $(selector, root);
    if (node && value != null) node.textContent = value;
  }

  function setAll(selector, values, root = document) {
    $$(selector, root).forEach((node, index) => {
      if (values[index] != null) node.textContent = values[index];
    });
  }

  const SCALE = {
    SITE: '1 : 250,000',
    POSITION: '1 : 100,000',
    COLLECTION: '1 : 25,000',
    RECORD: '1 : 2,500',
    DETAIL: '1 : 500'
  };


  function applyLocale() {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.body.dataset.locale = locale;
    const appMeta = $('meta[name="application-name"]');
    if (appMeta) appMeta.content = 'GeoGeek';
    if (ui.pages?.[pageKey]?.title) document.title = ui.pages[pageKey].title;

    setText('.skip', ui.skip);
    const brand = $('.brand');
    if (brand) brand.setAttribute('aria-label', locale === 'zh' ? 'GeoGeek 首页' : 'GeoGeek home');

    const nav = $('#primaryNav');
    if (nav) {
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
      let langButton = $('#langSwitch', nav);
      if (!langButton) {
        langButton = document.createElement('button');
        langButton.id = 'langSwitch';
        langButton.className = 'lang-switch';
        langButton.type = 'button';
        nav.appendChild(langButton);
      }
      langButton.textContent = ui.switchLabel || (locale === 'en' ? '中文' : 'EN');
      langButton.setAttribute('aria-label', locale === 'en' ? '切换为中文' : 'Switch to English');
      langButton.addEventListener('click', () => {
        try { localStorage.setItem('geogeek-language', locale === 'en' ? 'zh' : 'en'); } catch {}
        location.reload();
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
      setText('.sheet-index-foot', index.classList.contains('home-index') ? ui.sheet?.homeFoot : ui.sheet?.globalFoot, index);
      index.setAttribute('aria-label', locale === 'zh' ? '图幅索引' : (index.classList.contains('home-index') ? 'Section index' : 'Site index'));
    }

    const scale = $('.scale-ui');
    if (scale) {
      setText(':scope > span', ui.scale?.label, scale);
      const order = ['SITE', 'POSITION', 'COLLECTION', 'RECORD', 'DETAIL'];
      $$('.scale-legend small', scale).forEach((node, index) => { node.textContent = ui.scale?.levels?.[order[index]] || order[index]; });
      scale.setAttribute('aria-label', locale === 'zh' ? '观测尺度' : 'Scale of view');
    }
    const coord = $('#cursorCoord');
    if (coord) coord.dataset.label = ui.cursorDatum || 'VIEWPORT DATUM';

    const footerSpans = $$('.footer-meta > span');
    if (footerSpans[0]) footerSpans[0].textContent = ui.footer?.slogan || '';
    if (footerSpans[1]) footerSpans[1].textContent = ui.footer?.meta || '';

    if (pageKey === 'home') {
      setText('.hero-eyebrow', ui.hero?.eyebrow);
      setText('.hero-tagline', ui.hero?.tagline);
      setAll('.hero-lexicon span', ui.hero?.lexicon || []);
      setText('.hero-edge-left', ui.hero?.left);
      setText('.hero-edge-right', ui.hero?.right);

      const sectionKeys = ['now', 'notes', 'lab', 'atlas', 'elsewhere'];
      const sectionIds = ['#now', '#field-notes', '#lab', '#atlas', '#elsewhere'];
      sectionIds.forEach((selector, index) => {
        const section = $(selector);
        const copy = ui.home?.[sectionKeys[index]];
        if (!section || !copy) return;
        setText('.section-label', copy.label, section);
        setText('.section-head h2', copy.title, section);
        setText('.section-head p', copy.subtitle, section);
      });

      const cards = $$('#now .now-grid article');
      (ui.home?.now?.cards || []).forEach((card, index) => {
        const node = cards[index];
        if (!node) return;
        setText('span', card.label, node);
        setText('h3', card.title, node);
        setText('p', card.text, node);
      });

      const labRows = $$('#lab .preview-row');
      if (labRows[0]) {
        setText('time', ui.home?.lab?.prototype, labRows[0]);
        setText('strong', ui.home?.lab?.prototypeTitle, labRows[0]);
        setText('small', ui.home?.lab?.prototypeMeta, labRows[0]);
      }
      if (labRows[1]) {
        setText('time', ui.home?.lab?.method, labRows[1]);
        setText('strong', ui.home?.lab?.methodTitle, labRows[1]);
        setText('small', ui.home?.lab?.methodMeta, labRows[1]);
      }
      setText('.atlas-caption', ui.home?.atlas?.caption);
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
      const close = $('.reader-close');
      if (close) close.setAttribute('aria-label', ui.reader?.close || 'Close');
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

  function initNavigation() {
    const toggle = $('#navToggle');
    const nav = $('#primaryNav');
    if (!toggle || !nav) return;

    const close = () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = ui.nav?.map || 'Map';
    };

    toggle.addEventListener('click', () => {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? (ui.nav?.close || 'Close') : (ui.nav?.map || 'Map');
    });
    $$('.nav-links a', nav).forEach(link => link.addEventListener('click', close));
    addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }

  function initGeoField() {
    const canvas = $('#contourCanvas');
    const coord = $('#cursorCoord');
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
      targetZoom = zoomFromScale(value);
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
    }

    addEventListener('resize', resize, { passive: true });
    resize();

    addEventListener('pointermove', event => {
      pointerTarget.x = event.clientX / Math.max(1, width);
      pointerTarget.y = event.clientY / Math.max(1, height);
      if (!coord) return;

      const lon = pointerTarget.x * 360 - 180;
      const lat = 90 - pointerTarget.y * 180;
      coord.style.transform = `translate(${event.clientX + 17}px, ${event.clientY + 17}px)`;
      coord.firstChild && (coord.firstChild.textContent = '');
      coord.dataset.value = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
      coord.textContent = coord.dataset.value;
      coord.classList.add('is-active');
    }, { passive: true });
    addEventListener('pointerleave', () => coord?.classList.remove('is-active'));

    function bindContourTargets() {
      $$('.contour-target, .preview-row, .note-row, .lab-row, .life-tile, .elsewhere-card').forEach(element => {
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
        };

        element.addEventListener('pointerenter', focus);
        element.addEventListener('pointermove', focus, { passive: true });
        element.addEventListener('focusin', focus);
        element.addEventListener('pointerleave', () => { hover.active = false; restoreScale(); });
        element.addEventListener('focusout', () => { hover.active = false; restoreScale(); });
      });
    }
    window.bindContourTargets = bindContourTargets;

    function contour(cx, cy, rx, ry, scale, phase, time, alpha) {
      ctx.beginPath();
      for (let i = 0; i <= 200; i += 1) {
        const angle = i / 200 * Math.PI * 2;
        let ripple = Math.sin(angle * 3 + phase) * .028 + Math.sin(angle * 7 - phase * 1.3) * .010 + Math.sin(angle * 11 + phase * .4) * .004;
        if (!reduced) ripple += Math.sin(time * .00012 + phase) * .003;
        let x = cx + Math.cos(angle) * rx * (scale + ripple);
        let y = cy + Math.sin(angle) * ry * (scale + ripple);

        if (hover.active) {
          const hx = hover.x * width;
          const hy = hover.y * height;
          const dx = x - hx;
          const dy = y - hy;
          const distance = Math.hypot(dx, dy);
          const force = Math.max(0, 1 - distance / 220) * 12;
          if (distance > 1) {
            x -= dx / distance * force;
            y -= dy / distance * force;
          }
        }
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(27,43,34,${alpha})`;
      ctx.lineWidth = .62;
      ctx.stroke();
    }

    function drawGraticule() {
      const spacing = 92 + zoom * 92;
      const offsetX = ((pointer.x - .5) * 18) % spacing;
      const offsetY = ((pointer.y - .5) * 12) % spacing;
      ctx.lineWidth = .55;
      ctx.strokeStyle = `rgba(27,43,34,${.022 + zoom * .009})`;
      ctx.beginPath();
      for (let x = offsetX; x < width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = offsetY; y < height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();

      if (!reduced) {
        const x = pointer.x * width;
        const y = pointer.y * height;
        ctx.strokeStyle = 'rgba(166,70,36,.075)';
        ctx.beginPath();
        ctx.moveTo(x, Math.max(0, y - 36)); ctx.lineTo(x, Math.min(height, y + 36));
        ctx.moveTo(Math.max(0, x - 36), y); ctx.lineTo(Math.min(width, x + 36), y);
        ctx.stroke();
      }
    }

    function drawLocalSurvey(time) {
      if (!hover.active) return;
      const hx = hover.x * width;
      const hy = hover.y * height;
      for (let ring = 0; ring < 5; ring += 1) {
        const base = 28 + ring * 16 + zoom * 8;
        ctx.beginPath();
        for (let i = 0; i <= 90; i += 1) {
          const angle = i / 90 * Math.PI * 2;
          const wobble = Math.sin(angle * 3 + ring * .72 + time * .00018) * 2.2 + Math.sin(angle * 7 - ring) * .8;
          const rx = base + wobble;
          const ry = base * .68 + wobble * .55;
          const x = hx + Math.cos(angle) * rx;
          const y = hy + Math.sin(angle) * ry;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = ring === 0 ? 'rgba(166,70,36,.22)' : `rgba(27,43,34,${.075 - ring * .009})`;
        ctx.lineWidth = ring === 0 ? .9 : .65;
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(166,70,36,.18)';
      ctx.beginPath();
      ctx.moveTo(hx - 10, hy); ctx.lineTo(hx + 10, hy);
      ctx.moveTo(hx, hy - 10); ctx.lineTo(hx, hy + 10);
      ctx.stroke();
    }

    function draw(time) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      pointer.x += (pointerTarget.x - pointer.x) * .03;
      pointer.y += (pointerTarget.y - pointer.y) * .03;
      zoom += (targetZoom - zoom) * .035;
      drawGraticule();

      const terrainScale = 1 + zoom * .48;
      const detail = Math.round(zoom * 5);
      const unit = Math.min(width, height);
      const reliefs = [
        { cx: width * .79 + (pointer.x - .5) * 16, cy: height * .34 + (pointer.y - .5) * 10, rx: unit * .38 * terrainScale, ry: unit * .22 * terrainScale, n: 8 + detail },
        { cx: width * .16 - (pointer.x - .5) * 8, cy: height * .81 - (pointer.y - .5) * 7, rx: unit * .21 * terrainScale, ry: unit * .13 * terrainScale, n: 5 + Math.floor(detail * .6) }
      ];
      reliefs.forEach((relief, reliefIndex) => {
        for (let band = 0; band < relief.n; band += 1) {
          contour(relief.cx, relief.cy, relief.rx, relief.ry, .34 + band * (.088 - zoom * .012), band * .61 + reliefIndex, time, .010 + band * .0022);
        }
      });
      drawLocalSurvey(time);
      if (running) rafId = requestAnimationFrame(draw);
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
        rafId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) window.GeoField.pause();
      else if (!document.body.classList.contains('instrument-open')) window.GeoField.resume();
    });
    rafId = requestAnimationFrame(draw);
  }

  function initSheetIndex() {
    const index = $('#sheetIndex');
    if (!index) return;

    const homeOrigin = $('#origin');
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

  function renderHome() {
    const latest = $('#latestNotes');
    if (latest && data.notes) {
      latest.innerHTML = data.notes.slice(0, 3).map(note => `
        <a class="preview-row contour-target" data-local-scale="${SCALE.RECORD}" data-local-level="RECORD" href="field-notes.html#${note.id}">
          <time>${note.date}</time><strong>${note.title}</strong><small>${note.type.toUpperCase()} · ${note.read}</small>
        </a>`).join('');
    }

    const homeProjects = $('#homeProjects');
    if (homeProjects && data.lab) {
      const picks = data.lab.filter(item => item.featured).slice(0, 4);
      homeProjects.innerHTML = picks
        .map(item => `
          <article class="project-card project-card-home contour-target${item.instrument ? ' is-actionable' : ''}" data-local-scale="${item.instrument ? SCALE.DETAIL : SCALE.RECORD}" data-local-level="${item.instrument ? 'DETAIL' : 'RECORD'}" id="home-${item.id}">
            <div class="project-visual project-visual-${labPreviewKind(item)}">${labPreviewMarkup(item)}</div>
            <div class="project-copy">
              <div class="project-meta"><span>${item.status}</span><span>${(item.tags || []).slice(0, 2).join(' · ')}</span></div>
              <h3>${item.title}</h3>
              <p>${item.description}</p>
              <a class="project-cta" href="lab.html#${item.id}">${item.instrument ? (locale === 'zh' ? '入作器' : 'Explore instrument') : (locale === 'zh' ? '查看条目' : 'View item')} <b>↗</b></a>
            </div>
          </article>`).join('');
    }

    const homeAtlas = $('#homeAtlas');
    if (homeAtlas && data.atlas) {
      data.atlas.forEach(item => {
        const dot = document.createElement('span');
        dot.className = `atlas-dot ${item.type === 'lab' ? 'square' : item.type === 'place' ? 'cross' : item.type === 'photo' ? 'photo' : ''}`;
        dot.style.left = `${item.x * 100}%`;
        dot.style.top = `${item.y * 100}%`;
        dot.title = item.title;
        homeAtlas.appendChild(dot);
      });
    }

    const life = $('#lifePreview');
    if (life && data.elsewhere) {
      life.innerHTML = data.elsewhere.map(item => `
        <a class="life-tile contour-target" data-local-scale="${SCALE.RECORD}" data-local-level="RECORD" href="elsewhere.html#${item.id}">
          <span class="kind">${item.kind}</span>
          <div><h3>${item.title}</h3><p>${item.subtitle}</p><small>${item.meta}</small></div>
        </a>`).join('');
    }
  }

  function initNotes() {
    const list = $('#noteList');
    const dialog = $('#reader');
    if (!list || !data.notes) return;

    const bindReaders = () => {
      if (!dialog) return;
      if (!dialog.dataset.scaleBound) {
        dialog.dataset.scaleBound = '1';
        dialog.addEventListener('close', () => window.GeoScale?.restore());
      }
      $$('[data-note]', list).forEach(button => button.addEventListener('click', () => {
        const note = data.notes.find(item => item.id === button.dataset.note);
        if (!note) return;
        $('#readerKicker').textContent = note.type;
        $('#readerTitle').textContent = note.title;
        $('#readerMeta').textContent = `${note.date} · ${note.tags.join(' · ')} · ${note.read}`;
        $('#readerExcerpt').textContent = note.excerpt;
        $('#readerBody').textContent = note.body || ui.reader?.fallback || '';
        window.GeoScale?.apply('DETAIL');
        dialog.showModal();
      }));
    };

    const render = (filter = 'all') => {
      const items = data.notes.filter(note => filter === 'all' || note.typeKey === filter);
      list.innerHTML = items.map(note => `
        <button class="note-row contour-target" data-local-scale="${SCALE.RECORD}" data-local-level="RECORD" id="${note.id}" data-note="${note.id}">
          <time>${note.date}</time><h2>${note.title}</h2><span class="note-meta">${note.type} · ${note.tags.join(' · ')} · ${note.read}</span><span class="arrow">↗</span>
        </button>`).join('');
      bindReaders();
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
              <article class="project-card contour-target${item.instrument ? ' is-actionable' : ''}" data-local-scale="${item.instrument ? SCALE.DETAIL : SCALE.RECORD}" data-local-level="${item.instrument ? 'DETAIL' : 'RECORD'}" id="${item.id}">
                <div class="project-visual project-visual-${labPreviewKind(item)}">${labPreviewMarkup(item)}</div>
                <div class="project-copy">
                  <div class="project-meta"><span>${item.status}</span><span>${(item.tags || []).slice(0, 3).join(' · ')}</span></div>
                  <h2>${item.title}</h2>
                  <p>${item.description}</p>
                  <div class="project-foot">
                    <span class="lab-coord">${item.coord}</span>
                    ${item.instrument ? `<button class="lab-enter project-cta" type="button" data-instrument="${item.instrument}"><span>${ui.lab?.enter || 'ENTER'}</span><b>↗</b></button>` : `<span class="project-cta project-link">${locale === 'zh' ? '观其形' : 'Read as form'}</span>`}
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

  function renderElsewhere() {
    const grid = $('#elsewhereGrid');
    if (!grid || !data.elsewhere) return;
    grid.innerHTML = data.elsewhere.map(item => `
      <article class="elsewhere-card contour-target" data-local-scale="${SCALE.RECORD}" data-local-level="RECORD" id="${item.id}">
        <div class="visual"></div>
        <div><div class="eyebrow">${item.kind}</div><h2>${item.title}</h2><p>${item.subtitle}</p><p class="elsewhere-meta">${item.meta}</p></div>
      </article>`).join('');
    window.bindContourTargets?.();
  }

  function initAtlas() {
    const stage = $('#atlasStage');
    if (!stage || !data.atlas) return;

    const tip = $('#atlasTip');
    const status = $('#atlasStatus');
    const guides = $('#atlasGuides');
    const links = $('#atlasLinks');
    const explain = $('#atlasExplain');
    const items = data.atlas;
    const typeOrder = { note: 0, lab: 1, place: 2, photo: 3 };
    const typeX = { note: .14, lab: .39, place: .65, photo: .86 };
    const relationLabel = ui.atlas?.relationLabels || { space: 'FIELD', time: 'SUCCESSION', type: 'FORM', topic: 'AFFINITY', trace: 'TRAJECTORY' };
    const projectionLabel = ui.atlas?.projectionNames || { space: 'SPACE', time: 'TIME', type: 'TYPE', topic: 'TOPIC', trace: 'TRACE' };
    const typeLabel = ui.atlas?.typeLabels || { note: 'NOTE', lab: 'LAB', place: 'PLACE', photo: 'PHOTO' };
    const explanation = ui.atlas?.explanations || {};

    const topics = [...new Set(items.map(item => item.topic))];
    const topicCenters = {};
    topics.forEach((topic, index) => {
      const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(topics.length))));
      const row = Math.floor(index / columns);
      const column = index % columns;
      topicCenters[topic] = [.16 + column * (.68 / Math.max(1, columns - 1)), .25 + row * .42];
    });

    function position(item, mode) {
      if (mode === 'space') return [item.x, item.y];
      if (mode === 'time') {
        const years = items.map(value => value.year);
        const min = Math.min(...years);
        const max = Math.max(...years);
        const span = Math.max(1, max - min);
        const sameYear = items.filter(value => value.year === item.year);
        const index = sameYear.indexOf(item);
        return [.12 + ((item.year - min) / span) * .76, .22 + (typeOrder[item.type] ?? 0) * .17 + (index % 2) * .035];
      }
      if (mode === 'type') {
        const sameType = items.filter(value => value.type === item.type).sort((a, b) => a.year - b.year);
        const index = sameType.indexOf(item);
        return [typeX[item.type] || .5, .18 + (index + 1) / (sameType.length + 1) * .66];
      }
      if (mode === 'topic') {
        const center = topicCenters[item.topic] || [.5, .5];
        const sameTopic = items.filter(value => value.topic === item.topic);
        const index = sameTopic.indexOf(item);
        const angle = index / Math.max(1, sameTopic.length) * Math.PI * 2 - Math.PI / 2;
        const radius = sameTopic.length > 1 ? .055 : 0;
        return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
      }
      if (mode === 'trace') {
        return [Number.isFinite(item.traceX) ? item.traceX : item.x, Number.isFinite(item.traceY) ? item.traceY : item.y];
      }
      return [item.x, item.y];
    }

    const nodes = items.map(item => {
      const node = document.createElement('button');
      node.className = 'atlas-node';
      node.dataset.type = item.type;
      node.setAttribute('aria-label', item.title);
      stage.appendChild(node);

      const activate = () => {
        tip.innerHTML = `<span>${typeLabel[item.type] || item.type} · ${item.topic} · ${item.year}<br>${item.place}</span><strong>${item.title}</strong>`;
        nodes.forEach(element => element.classList.remove('is-active'));
        node.classList.add('is-active');
        window.GeoScale?.apply('RECORD');
      };
      const release = () => window.GeoScale?.restore();
      node.addEventListener('mouseenter', activate);
      node.addEventListener('focus', activate);
      node.addEventListener('click', activate);
      node.addEventListener('mouseleave', release);
      node.addEventListener('blur', release);
      return node;
    });

    function renderGuides(mode) {
      guides.innerHTML = '';
      const add = (text, x, y) => {
        const guide = document.createElement('span');
        guide.className = 'atlas-guide';
        guide.textContent = text;
        guide.style.left = `${x * 100}%`;
        guide.style.top = `${y * 100}%`;
        guides.appendChild(guide);
      };
      if (mode === 'space') {
        const fields = [...new Set(items.map(item => item.spatialField))];
        fields.forEach(field => {
          const group = items.filter(item => item.spatialField === field);
          const x = group.reduce((sum, item) => sum + item.x, 0) / group.length;
          const y = Math.max(.08, group.reduce((sum, item) => sum + item.y, 0) / group.length - .10);
          add(field, x, y);
        });
      } else if (mode === 'time') {
        const years = [...new Set(items.map(item => item.year))].sort();
        const min = Math.min(...years);
        const max = Math.max(...years);
        const span = Math.max(1, max - min);
        years.forEach(year => add(String(year), .12 + ((year - min) / span) * .76, .10));
      } else if (mode === 'type') {
        Object.entries(typeX).forEach(([type, x]) => add(typeLabel[type] || type, x, .10));
      } else if (mode === 'topic') {
        Object.entries(topicCenters).forEach(([topic, [x, y]]) => add(topic, x, y - .10));
      } else if (mode === 'trace') {
        add(ui.atlas?.traceStart || 'BEGIN', .12, .14);
        add(ui.atlas?.traceNow || 'NOW', .90, .14);
      }
    }

    function edgePairs(mode) {
      const pairs = [];
      const add = (a, b) => { if (a !== b) pairs.push([a, b]); };

      if (mode === 'time') {
        const order = items.map((item, index) => [item, index]).sort((a, b) => a[0].year - b[0].year || a[1] - b[1]).map(entry => entry[1]);
        order.slice(0, -1).forEach((index, offset) => add(index, order[offset + 1]));
        return pairs;
      }

      if (mode === 'type') {
        [...new Set(items.map(item => item.type))].forEach(type => {
          const group = items.map((item, index) => [item, index]).filter(([item]) => item.type === type).sort((a, b) => a[0].year - b[0].year);
          group.slice(0, -1).forEach((entry, offset) => add(entry[1], group[offset + 1][1]));
        });
        return pairs;
      }

      if (mode === 'trace') {
        const byId = new Map(items.map((item, index) => [item.id, index]));
        items.forEach((item, index) => {
          (item.traceLinks || []).forEach(targetId => {
            const target = byId.get(targetId);
            if (Number.isInteger(target)) add(index, target);
          });
        });
        return pairs;
      }

      const key = mode === 'space' ? 'spatialField' : 'topic';
      [...new Set(items.map(item => item[key]))].forEach(value => {
        const group = items.map((item, index) => [item, index]).filter(([item]) => item[key] === value);
        for (let i = 0; i < group.length; i += 1) {
          for (let j = i + 1; j < group.length; j += 1) add(group[i][1], group[j][1]);
        }
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

    function layout(mode) {
      items.forEach((item, index) => {
        const [x, y] = position(item, mode);
        nodes[index].style.left = `${x * 100}%`;
        nodes[index].style.top = `${y * 100}%`;
      });
      status.textContent = (ui.atlas?.status || 'PROJECTION / {projection} · EDGE / {relation}').replace('{projection}', projectionLabel[mode] || mode.toUpperCase()).replace('{relation}', relationLabel[mode] || '');
      stage.dataset.mode = mode;
      $$('[data-projection]').forEach(button => button.classList.toggle('is-active', button.dataset.projection === mode));
      renderGuides(mode);
      explain.textContent = explanation[mode] || '';
      clearTimeout(layout.timer);
      layout.timer = setTimeout(() => drawLinks(mode), reduced ? 0 : 800);
      layout.mode = mode;
    }

    $$('[data-projection]').forEach(button => button.addEventListener('click', () => layout(button.dataset.projection)));
    addEventListener('resize', () => layout.mode && drawLinks(layout.mode), { passive: true });
    layout('space');
  }

  applyLocale();
  initNavigation();
  renderHome();
  initGeoField();
  initSheetIndex();
  initNotes();
  renderLab();
  renderElsewhere();
  initAtlas();
  window.bindContourTargets?.();
})();
