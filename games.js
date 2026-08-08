(() => {
  'use strict';

  const registry = window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const TOPOJSON_CDN = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const WORLD_ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';

  const CITIES = [
    { en: 'Beijing', zh: '北京', lat: 39.9042, lon: 116.4074 },
    { en: 'Tokyo', zh: '东京', lat: 35.6762, lon: 139.6503 },
    { en: 'Cairo', zh: '开罗', lat: 30.0444, lon: 31.2357 },
    { en: 'Nairobi', zh: '内罗毕', lat: -1.2921, lon: 36.8219 },
    { en: 'Sydney', zh: '悉尼', lat: -33.8688, lon: 151.2093 },
    { en: 'São Paulo', zh: '圣保罗', lat: -23.5505, lon: -46.6333 },
    { en: 'Mexico City', zh: '墨西哥城', lat: 19.4326, lon: -99.1332 },
    { en: 'Istanbul', zh: '伊斯坦布尔', lat: 41.0082, lon: 28.9784 },
    { en: 'Cape Town', zh: '开普敦', lat: -33.9249, lon: 18.4241 },
    { en: 'Delhi', zh: '德里', lat: 28.6139, lon: 77.2090 },
    { en: 'Lima', zh: '利马', lat: -12.0464, lon: -77.0428 },
    { en: 'Paris', zh: '巴黎', lat: 48.8566, lon: 2.3522 },
    { en: 'Jakarta', zh: '雅加达', lat: -6.2088, lon: 106.8456 },
    { en: 'Vancouver', zh: '温哥华', lat: 49.2827, lon: -123.1207 },
    { en: 'Buenos Aires', zh: '布宜诺斯艾利斯', lat: -34.6037, lon: -58.3816 }
  ];

  const COUNTRIES = [
    ['076', 'Brazil', '巴西'], ['124', 'Canada', '加拿大'], ['484', 'Mexico', '墨西哥'], ['032', 'Argentina', '阿根廷'],
    ['036', 'Australia', '澳大利亚'], ['156', 'China', '中国'], ['356', 'India', '印度'], ['392', 'Japan', '日本'],
    ['250', 'France', '法国'], ['276', 'Germany', '德国'], ['380', 'Italy', '意大利'], ['724', 'Spain', '西班牙'],
    ['818', 'Egypt', '埃及'], ['710', 'South Africa', '南非'], ['404', 'Kenya', '肯尼亚'], ['566', 'Nigeria', '尼日利亚'],
    ['360', 'Indonesia', '印度尼西亚'], ['792', 'Türkiye', '土耳其'], ['764', 'Thailand', '泰国'], ['578', 'Norway', '挪威'],
    ['752', 'Sweden', '瑞典'], ['682', 'Saudi Arabia', '沙特阿拉伯'], ['364', 'Iran', '伊朗'], ['496', 'Mongolia', '蒙古'],
    ['152', 'Chile', '智利'], ['604', 'Peru', '秘鲁'], ['170', 'Colombia', '哥伦比亚'], ['862', 'Venezuela', '委内瑞拉'],
    ['398', 'Kazakhstan', '哈萨克斯坦'], ['554', 'New Zealand', '新西兰']
  ].map(([id, en, zh]) => ({ id, en, zh }));

  const PATH_PAIRS = [
    [{ id: '620', en: 'Portugal', zh: '葡萄牙' }, { id: '616', en: 'Poland', zh: '波兰' }],
    [{ id: '724', en: 'Spain', zh: '西班牙' }, { id: '642', en: 'Romania', zh: '罗马尼亚' }],
    [{ id: '250', en: 'France', zh: '法国' }, { id: '300', en: 'Greece', zh: '希腊' }],
    [{ id: '276', en: 'Germany', zh: '德国' }, { id: '191', en: 'Croatia', zh: '克罗地亚' }],
    [{ id: '040', en: 'Austria', zh: '奥地利' }, { id: '528', en: 'Netherlands', zh: '荷兰' }]
  ];

  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    const existing = [...document.scripts].find(script => script.src === src);
    if (existing) return new Promise((resolve, reject) => {
      if (window[globalName]) return resolve(window[globalName]);
      existing.addEventListener('load', () => resolve(window[globalName]), { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(window[globalName]);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  let geoPromise = null;
  function loadGeography(signal) {
    if (!geoPromise) {
      geoPromise = Promise.all([loadScript(D3_CDN, 'd3'), loadScript(TOPOJSON_CDN, 'topojson')])
        .then(async () => {
          const response = await fetch(WORLD_ATLAS, { mode: 'cors' });
          if (!response.ok) throw new Error(`world-atlas ${response.status}`);
          const topology = await response.json();
          const collection = topology.objects.countries;
          const countries = window.topojson.feature(topology, collection);
          return { topology, collection, countries };
        })
        .catch(error => { geoPromise = null; throw error; });
    }
    return geoPromise.then(value => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return value;
    });
  }

  function normId(value) {
    const raw = String(value ?? '');
    return /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw;
  }

  function shuffle(values) {
    const arr = [...values];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function fmt(template, values) {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template || '');
  }

  function localName(item, locale) { return locale === 'zh' ? item.zh : item.en; }

  function compass(bearing, locale) {
    const labels = locale === 'zh'
      ? ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
      : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return `${labels[Math.round(bearing / 45) % 8]} ${String(Math.round(bearing)).padStart(3, '0')}°`;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const toRad = deg => deg * Math.PI / 180;
    const p1 = toRad(lat1); const p2 = toRad(lat2);
    const dp = toRad(lat2 - lat1); const dl = toRad(lon2 - lon1);
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function bearingTo(lat1, lon1, lat2, lon2) {
    const r = deg => deg * Math.PI / 180;
    const y = Math.sin(r(lon2 - lon1)) * Math.cos(r(lat2));
    const x = Math.cos(r(lat1)) * Math.sin(r(lat2)) - Math.sin(r(lat1)) * Math.cos(r(lat2)) * Math.cos(r(lon2 - lon1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function gameReferences(locale) {
    const lead = locale === 'zh' ? '玩法参照' : 'Game references';
    return `<div class="game-references"><span>${lead}</span><a href="https://geogames.io/" target="_blank" rel="noreferrer">GeoGames ↗</a><a href="https://www.geoheroes.com/" target="_blank" rel="noreferrer">GeoHeroes ↗</a></div>`;
  }

  async function createWorld(stage, signal) {
    const geo = await loadGeography(signal);
    const d3 = window.d3;
    const width = 1000; const height = 520;
    const svg = d3.select(stage).append('svg')
      .attr('class', 'game-map')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', 'Interactive world map');
    const projection = d3.geoNaturalEarth1().fitExtent([[22, 22], [width - 22, height - 22]], geo.countries);
    const path = d3.geoPath(projection);
    svg.append('path').datum({ type: 'Sphere' }).attr('class', 'game-sphere').attr('d', path);
    svg.append('path').datum(d3.geoGraticule10()).attr('class', 'game-graticule').attr('d', path);
    const countryLayer = svg.append('g').attr('class', 'game-countries');
    const countryPaths = countryLayer.selectAll('path').data(geo.countries.features).join('path')
      .attr('d', path)
      .attr('data-country-id', d => normId(d.id));
    return { ...geo, d3, svg, projection, path, countryPaths, width, height };
  }

  function shell(stage, ui, locale, kind) {
    const g = ui.lab?.games || {};
    const copy = g[kind] || {};
    stage.innerHTML = `
      <div class="game-layout">
        <div class="game-map-wrap" id="gameMapWrap"><div class="instrument-loading"><span>⌁</span><strong>${locale === 'zh' ? '正在展图…' : 'Drawing the field…'}</strong></div></div>
        <aside class="game-panel">
          <div class="orbit-panel-label">${locale === 'zh' ? '地理推演' : 'SPATIAL EXERCISE'}</div>
          <strong>${copy.title || ''}</strong>
          <div class="game-statline"><span id="gameRound">—</span><span>${g.score || 'SCORE'} <b id="gameScore">0</b></span></div>
          <div class="game-prompt" id="gamePrompt">—</div>
          <p class="game-hint" id="gameHint">${copy.hint || ''}</p>
          <div class="game-feedback" id="gameFeedback" aria-live="polite"></div>
          <button class="game-next" id="gameNext" type="button" disabled>${g.next || 'NEXT'}</button>
          ${gameReferences(locale)}
        </aside>
      </div>`;
    return {
      g, copy,
      map: $('#gameMapWrap', stage), round: $('#gameRound', stage), score: $('#gameScore', stage), prompt: $('#gamePrompt', stage),
      hint: $('#gameHint', stage), feedback: $('#gameFeedback', stage), next: $('#gameNext', stage)
    };
  }

  async function mountLocate({ signal, stage, ui, locale }) {
    const dom = shell(stage, ui, locale, 'locate');
    let world;
    try { dom.map.innerHTML = ''; world = await createWorld(dom.map, signal); }
    catch (error) {
      if (!signal?.aborted) dom.map.innerHTML = `<div class="instrument-error"><strong>${locale === 'zh' ? '世界底图暂不可达。' : 'World geometry unavailable.'}</strong><p>world-atlas · jsDelivr</p></div>`;
      return () => {};
    }
    if (signal?.aborted) return () => {};

    const rounds = shuffle(CITIES).slice(0, 5);
    let roundIndex = 0; let score = 0; let answered = false;
    const overlay = world.svg.append('g').attr('class', 'game-overlay');

    function renderRound() {
      answered = false;
      overlay.selectAll('*').remove();
      const target = rounds[roundIndex];
      dom.round.textContent = fmt(dom.g.rounds || 'ROUND {round} / {total}', { round: roundIndex + 1, total: rounds.length });
      dom.score.textContent = String(score);
      dom.prompt.textContent = fmt(dom.copy.prompt || 'Locate {target}', { target: localName(target, locale) });
      dom.feedback.textContent = '';
      dom.next.disabled = true;
      dom.next.textContent = roundIndex === rounds.length - 1 ? (dom.g.replay || 'REPLAY') : (dom.g.next || 'NEXT');
    }

    world.svg.on('click', event => {
      if (answered) return;
      const point = world.d3.pointer(event, world.svg.node());
      const lonlat = world.projection.invert(point);
      if (!lonlat) return;
      const [lon, lat] = lonlat;
      const target = rounds[roundIndex];
      const distance = haversine(lat, lon, target.lat, target.lon);
      const bearing = bearingTo(lat, lon, target.lat, target.lon);
      const gained = Math.max(0, Math.round(1000 * Math.exp(-distance / 1800)));
      score += gained; answered = true;
      dom.score.textContent = String(score);
      dom.feedback.textContent = fmt(dom.copy.result || '{distance} km · {bearing}', { distance: Math.round(distance), bearing: compass(bearing, locale) });
      dom.next.disabled = false;

      const targetXY = world.projection([target.lon, target.lat]);
      overlay.append('path').datum({ type: 'LineString', coordinates: [[lon, lat], [target.lon, target.lat]] }).attr('class', 'game-answer-line').attr('d', world.path);
      overlay.append('circle').attr('class', 'game-guess-point').attr('cx', point[0]).attr('cy', point[1]).attr('r', 5);
      overlay.append('circle').attr('class', 'game-target-point').attr('cx', targetXY[0]).attr('cy', targetXY[1]).attr('r', 6);
    });

    dom.next.addEventListener('click', () => {
      if (roundIndex >= rounds.length - 1) { roundIndex = 0; score = 0; rounds.splice(0, rounds.length, ...shuffle(CITIES).slice(0, 5)); }
      else roundIndex += 1;
      renderRound();
    });
    renderRound();
    return () => { world.svg.on('click', null); stage.innerHTML = ''; };
  }

  async function mountZone({ signal, stage, ui, locale }) {
    const dom = shell(stage, ui, locale, 'zone');
    let world;
    try { dom.map.innerHTML = ''; world = await createWorld(dom.map, signal); }
    catch (error) {
      if (!signal?.aborted) dom.map.innerHTML = `<div class="instrument-error"><strong>${locale === 'zh' ? '世界底图暂不可达。' : 'World geometry unavailable.'}</strong><p>world-atlas · jsDelivr</p></div>`;
      return () => {};
    }
    if (signal?.aborted) return () => {};

    const availableIds = new Set(world.countries.features.map(feature => normId(feature.id)));
    let rounds = shuffle(COUNTRIES.filter(country => availableIds.has(country.id))).slice(0, 6);
    let roundIndex = 0; let score = 0; let attempts = 3; let done = false;

    function resetClasses() { world.countryPaths.classed('is-correct is-wrong is-target', false); }
    function renderRound() {
      done = false; attempts = 3; resetClasses();
      const target = rounds[roundIndex];
      dom.round.textContent = fmt(dom.g.rounds || 'ROUND {round} / {total}', { round: roundIndex + 1, total: rounds.length });
      dom.score.textContent = String(score);
      dom.prompt.textContent = fmt(dom.copy.prompt || 'Find {target}', { target: localName(target, locale) });
      dom.feedback.textContent = `${dom.g.attempts || 'ATTEMPTS'} · ${attempts}`;
      dom.next.disabled = true;
      dom.next.textContent = roundIndex === rounds.length - 1 ? (dom.g.replay || 'REPLAY') : (dom.g.next || 'NEXT');
    }

    world.countryPaths.on('click', function(event, feature) {
      if (done) return;
      const id = normId(feature.id);
      const target = rounds[roundIndex];
      if (id === target.id) {
        done = true;
        const gained = attempts === 3 ? 1000 : attempts === 2 ? 650 : 350;
        score += gained;
        world.d3.select(this).classed('is-correct', true);
        dom.score.textContent = String(score);
        dom.feedback.textContent = dom.copy.correct || 'FOUND';
        dom.next.disabled = false;
      } else {
        attempts -= 1;
        const node = world.d3.select(this);
        node.classed('is-wrong', true);
        setTimeout(() => node.classed('is-wrong', false), 450);
        if (attempts <= 0) {
          done = true;
          world.countryPaths.filter(d => normId(d.id) === target.id).classed('is-target', true);
          dom.feedback.textContent = dom.copy.wrong || 'Not this field.';
          dom.next.disabled = false;
        } else {
          dom.feedback.textContent = `${dom.copy.wrong || 'Not this field.'} · ${dom.g.attempts || 'ATTEMPTS'} ${attempts}`;
        }
      }
    });

    dom.next.addEventListener('click', () => {
      if (roundIndex >= rounds.length - 1) { roundIndex = 0; score = 0; rounds = shuffle(COUNTRIES.filter(country => availableIds.has(country.id))).slice(0, 6); }
      else roundIndex += 1;
      renderRound();
    });
    renderRound();
    return () => { world.countryPaths.on('click', null); stage.innerHTML = ''; };
  }

  async function mountPath({ signal, stage, ui, locale }) {
    const dom = shell(stage, ui, locale, 'path');
    let world;
    try { dom.map.innerHTML = ''; world = await createWorld(dom.map, signal); }
    catch (error) {
      if (!signal?.aborted) dom.map.innerHTML = `<div class="instrument-error"><strong>${locale === 'zh' ? '世界底图暂不可达。' : 'World geometry unavailable.'}</strong><p>world-atlas · jsDelivr</p></div>`;
      return () => {};
    }
    if (signal?.aborted) return () => {};

    const geometries = world.collection.geometries;
    const neighbors = window.topojson.neighbors(geometries);
    const idToIndex = new Map(geometries.map((geometry, index) => [normId(geometry.id), index]));
    const availablePairs = PATH_PAIRS.filter(([a, b]) => idToIndex.has(a.id) && idToIndex.has(b.id));
    let rounds = shuffle(availablePairs).slice(0, 4);
    let roundIndex = 0; let score = 0; let route = []; let done = false; let shortest = Infinity;

    function shortestDistance(startId, targetId) {
      const start = idToIndex.get(startId); const target = idToIndex.get(targetId);
      if (!Number.isInteger(start) || !Number.isInteger(target)) return Infinity;
      const queue = [[start, 0]]; const seen = new Set([start]);
      while (queue.length) {
        const [current, distance] = queue.shift();
        if (current === target) return distance;
        for (const next of neighbors[current] || []) {
          if (!seen.has(next)) { seen.add(next); queue.push([next, distance + 1]); }
        }
      }
      return Infinity;
    }

    function updateMap() {
      const [start, target] = rounds[roundIndex];
      const routeSet = new Set(route);
      world.countryPaths
        .classed('is-start', d => normId(d.id) === start.id)
        .classed('is-target', d => normId(d.id) === target.id)
        .classed('is-route', d => routeSet.has(normId(d.id)) && normId(d.id) !== start.id && normId(d.id) !== target.id)
        .classed('is-current', d => normId(d.id) === route[route.length - 1] && normId(d.id) !== target.id);
    }

    function renderRound() {
      done = false;
      const [start, target] = rounds[roundIndex];
      route = [start.id]; shortest = shortestDistance(start.id, target.id);
      dom.round.textContent = fmt(dom.g.rounds || 'ROUND {round} / {total}', { round: roundIndex + 1, total: rounds.length });
      dom.score.textContent = String(score);
      dom.prompt.textContent = fmt(dom.copy.prompt || '{start} → {target}', { start: localName(start, locale), target: localName(target, locale) });
      dom.feedback.textContent = locale === 'zh' ? '越界 · 0' : 'CROSSINGS · 0';
      dom.next.disabled = true;
      dom.next.textContent = roundIndex === rounds.length - 1 ? (dom.g.replay || 'REPLAY') : (dom.g.next || 'NEXT');
      updateMap();
    }

    world.countryPaths.on('click', function(event, feature) {
      if (done) return;
      const id = normId(feature.id);
      const currentId = route[route.length - 1];
      if (id === currentId) return;
      const currentIndex = idToIndex.get(currentId); const nextIndex = idToIndex.get(id);
      if (!Number.isInteger(currentIndex) || !Number.isInteger(nextIndex) || !(neighbors[currentIndex] || []).includes(nextIndex)) {
        const node = world.d3.select(this); node.classed('is-wrong', true); setTimeout(() => node.classed('is-wrong', false), 420);
        dom.feedback.textContent = dom.copy.invalid || 'No shared land border.';
        return;
      }
      route.push(id); updateMap();
      const [, target] = rounds[roundIndex];
      if (id === target.id) {
        done = true;
        const steps = route.length - 1;
        const efficiency = Number.isFinite(shortest) && shortest > 0 ? Math.min(1, shortest / steps) : 0;
        score += Math.round(1000 * efficiency);
        dom.score.textContent = String(score);
        dom.feedback.textContent = fmt(dom.copy.done || 'Shortest path: {best} crossings · yours: {steps}.', { best: shortest, steps });
        dom.next.disabled = false;
      } else {
        dom.feedback.textContent = `${locale === 'zh' ? '越界' : 'CROSSINGS'} · ${route.length - 1}`;
      }
    });

    dom.next.addEventListener('click', () => {
      if (roundIndex >= rounds.length - 1) { roundIndex = 0; score = 0; rounds = shuffle(availablePairs).slice(0, 4); }
      else roundIndex += 1;
      renderRound();
    });
    renderRound();
    return () => { world.countryPaths.on('click', null); stage.innerHTML = ''; };
  }

  Object.assign(registry, { locate: mountLocate, zone: mountZone, path: mountPath });
})();
