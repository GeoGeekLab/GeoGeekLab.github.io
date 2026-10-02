(() => {
  'use strict';

  const ENHANCED = 'orbitEnhancedV3';
  const EARTH_RADIUS_KM = 6371.0088;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function ensureStyle() {
    if (document.querySelector('link[data-orbit-enhancements-v3]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./orbital-lab-v3.css?v=20261002b', import.meta.url).href;
    link.dataset.orbitEnhancementsV3 = '1';
    document.head.appendChild(link);
  }

  function dispatchWheel(canvas, deltaY) {
    canvas.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY,
      deltaMode: 0,
      clientX: canvas.getBoundingClientRect().left + canvas.clientWidth / 2,
      clientY: canvas.getBoundingClientRect().top + canvas.clientHeight / 2,
    }));
  }

  function clickIfNeeded(root, selector, desired) {
    const button = $(selector, root);
    if (!button) return;
    const active = button.classList.contains('is-active');
    if (active !== desired) button.click();
  }

  function applyPreset(root, preset) {
    const defs = {
      relations: { graticule:true, shells:true, orbit:true, ground:true },
      trace: { graticule:false, shells:false, orbit:true, ground:true },
      field: { graticule:true, shells:true, orbit:false, ground:false },
      clean: { graticule:false, shells:false, orbit:false, ground:false },
    };
    const config = defs[preset];
    if (!config) return;
    Object.entries(config).forEach(([key, desired]) => clickIfNeeded(root, `[data-layer="${key}"]`, desired));
  }

  function stepTime(root, hours) {
    const range = $('#orbitTimeRange', root);
    if (!range) return;
    const min = Number(range.min || -12);
    const max = Number(range.max || 12);
    const next = clamp(Number(range.value || 0) + Number(hours), min, max);
    range.value = String(next);
    range.dispatchEvent(new Event('input', { bubbles:true }));
  }

  function mapEventForCoordinate(canvas, lat, lon) {
    const r = canvas.getBoundingClientRect();
    const x = r.left + ((Number(lon) + 180) / 360) * r.width;
    const y = r.top + ((90 - Number(lat)) / 180) * r.height;
    canvas.dispatchEvent(new MouseEvent('click', {
      bubbles:true,
      cancelable:true,
      clientX:x,
      clientY:y,
      view:window,
    }));
  }

  function formatCoord(value, positive, negative) {
    return `${Math.abs(value).toFixed(3)}° ${value >= 0 ? positive : negative}`;
  }

  function updateStationInputs(canvas, latInput, lonInput, lat, lon) {
    latInput.value = Number(lat).toFixed(4);
    lonInput.value = Number(lon).toFixed(4);
    const card = canvas.closest('.orbit-card');
    const title = $('#orbitObserverTitle', card);
    if (title) title.title = `${formatCoord(lat,'N','S')} · ${formatCoord(lon,'E','W')}`;
  }

  function stationFromPointer(canvas, event) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const x = clamp((event.clientX - r.left) / r.width, 0, 1);
    const y = clamp((event.clientY - r.top) / r.height, 0, 1);
    return { lon:x * 360 - 180, lat:90 - y * 180 };
  }

  function parseSelectedPosition(root) {
    const text = $('#orbitPosition', root)?.textContent || '';
    const altitudeText = $('#orbitAltitude', root)?.textContent || '';
    const parts = text.match(/([\d.]+)°\s*([NS]).*?([\d.]+)°\s*([EW])/i);
    const alt = Number((altitudeText.match(/[-\d.]+/) || [])[0]);
    if (!parts || !Number.isFinite(alt)) return null;
    const lat = Number(parts[1]) * (parts[2].toUpperCase() === 'S' ? -1 : 1);
    const lon = Number(parts[3]) * (parts[4].toUpperCase() === 'W' ? -1 : 1);
    return { lat, lon, altitude:alt };
  }

  function destinationPoint(latDeg, lonDeg, angularDistance, bearing) {
    const lat1 = latDeg * Math.PI / 180;
    const lon1 = lonDeg * Math.PI / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance)
      + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const lon2 = lon1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );
    let lon = lon2 * 180 / Math.PI;
    lon = ((lon + 540) % 360) - 180;
    return [lon, lat2 * 180 / Math.PI];
  }

  function solarPosition(ms) {
    const d = new Date(ms);
    const start = Date.UTC(d.getUTCFullYear(), 0, 0);
    const day = Math.floor((d.getTime() - start) / 86400000);
    const hour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    const gamma = 2 * Math.PI / 365 * (day - 1 + (hour - 12) / 24);
    const eq = 229.18 * (
      0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
    );
    const dec =
      0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
    let lon = 15 * (12 - hour - eq / 60);
    lon = ((lon + 540) % 360) - 180;
    return { lon, lat:dec * 180 / Math.PI };
  }

  function drawRelationOverlay(root, canvas, overlay) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const width = Math.round(r.width * dpr);
    const height = Math.round(r.height * dpr);
    if (overlay.width !== width || overlay.height !== height) {
      overlay.width = width;
      overlay.height = height;
    }
    const ctx = overlay.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,r.width,r.height);

    const timeRange = $('#orbitTimeRange', root);
    const offsetHours = Number(timeRange?.value || 0);
    const sun = solarPosition(Date.now() + offsetHours * 3600000);
    const sunX = (sun.lon + 180) / 360 * r.width;
    const sunY = (90 - sun.lat) / 180 * r.height;

    ctx.fillStyle = 'rgba(225,198,111,.82)';
    ctx.beginPath();
    ctx.arc(sunX,sunY,2.5,0,Math.PI*2);
    ctx.fill();

    if (Math.abs(sun.lat) > .01) {
      ctx.strokeStyle = 'rgba(225,198,111,.34)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath();
      let started = false;
      let lastX = null;
      const sunLon = sun.lon * Math.PI / 180;
      const sunLat = sun.lat * Math.PI / 180;
      for (let lon=-180; lon<=180; lon+=2) {
        const lat = Math.atan(-Math.cos(lon * Math.PI / 180 - sunLon) / Math.tan(sunLat)) * 180 / Math.PI;
        if (!Number.isFinite(lat) || Math.abs(lat)>90) continue;
        const x = (lon + 180) / 360 * r.width;
        const y = (90 - lat) / 180 * r.height;
        if (!started || (lastX != null && Math.abs(x-lastX)>r.width*.4)) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
        started = true;
        lastX = x;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const selected = parseSelectedPosition(root);
    if (selected && selected.altitude > 0) {
      const alpha = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + selected.altitude));
      ctx.strokeStyle = 'rgba(209,99,57,.72)';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      let lastX = null;
      for (let i=0;i<=180;i+=1) {
        const [lon,lat] = destinationPoint(selected.lat,selected.lon,alpha,i/180*Math.PI*2);
        const x = (lon + 180) / 360 * r.width;
        const y = (90 - lat) / 180 * r.height;
        if (i===0 || (lastX != null && Math.abs(x-lastX)>r.width*.45)) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
        lastX = x;
      }
      ctx.stroke();
    }
  }

  function selectedCatalogId(root) {
    const href = $('#orbitSourceObject', root)?.href || '';
    try {
      const id = new URL(href).searchParams.get('CATNR');
      return id || null;
    } catch {
      return null;
    }
  }

  async function copyDeepLink(root, button) {
    const id = selectedCatalogId(root);
    if (!id) return;
    const url = new URL(location.href);
    url.searchParams.set('sat', id);
    try {
      await navigator.clipboard.writeText(url.href);
      button.textContent = 'COPIED';
    } catch {
      button.textContent = 'COPY FAILED';
    }
    setTimeout(() => { button.textContent = 'COPY LINK'; }, 1200);
  }

  function restoreDeepLink(root) {
    const id = new URL(location.href).searchParams.get('sat');
    const search = $('#orbitSearch', root);
    if (!id || !search) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (!document.contains(root) || attempts > 30) {
        clearInterval(timer);
        return;
      }
      search.value = id;
      search.dispatchEvent(new Event('input', { bubbles:true }));
      const result = $('[data-search-index]', $('#orbitSearchResults', root));
      if (result) {
        result.click();
        clearInterval(timer);
      }
    }, 180);
  }

  function sanitizeOrbitStatus(root) {
    const dialog = root.closest('.instrument-dialog');
    const badge = $('.instrument-status', dialog || document);
    if (!badge) return null;
    const sanitize = () => {
      if (/\bDEMO\b/i.test(badge.textContent || '')) {
        badge.dataset.state = 'error';
        badge.textContent = 'STATUS / UNAVAILABLE';
      }
    };
    sanitize();
    const observer = new MutationObserver(sanitize);
    observer.observe(badge, { childList:true, characterData:true,subtree:true });
    return observer;
  }

  function enhance(root) {
    if (!root || root.dataset[ENHANCED]) return;
    root.dataset[ENHANCED] = '1';
    ensureStyle();

    const stage = $('.orbit-stage', root);
    const canvas = $('.orbit-canvas', root);
    const panel = $('.orbit-panel', root);
    const groundCanvas = $('.orbit-ground-map', root);
    if (!stage || !canvas || !panel || !groundCanvas) return;

    stage.tabIndex = 0;
    stage.setAttribute('aria-label', 'Interactive orbital field. Drag to rotate, scroll or pinch to zoom, keyboard controls available.');
    stage.classList.add('orbit-stage-enhanced');

    const tools = document.createElement('div');
    tools.className = 'orbit-camera-tools orbit-enhancement-tools';
    tools.setAttribute('aria-label','Camera controls');
    tools.innerHTML = '<button type="button" data-orbit-zoom="in" aria-label="Zoom in">+</button><span>ZOOM</span><button type="button" data-orbit-zoom="out" aria-label="Zoom out">−</button><button type="button" data-orbit-fit>FIT</button><button type="button" data-orbit-help aria-expanded="false">?</button>';
    stage.appendChild(tools);

    const help = document.createElement('div');
    help.className = 'orbit-help orbit-enhancement-help';
    help.hidden = true;
    help.innerHTML = '<strong>FIELD CONTROLS</strong><div><kbd>DRAG</kbd><span>rotate field</span></div><div><kbd>SCROLL / PINCH</kbd><span>zoom</span></div><div><kbd>+ / −</kbd><span>zoom</span></div><div><kbd>ARROWS</kbd><span>rotate by drag-equivalent steps</span></div><div><kbd>F</kbd><span>focus selected object</span></div><div><kbd>R</kbd><span>reset field</span></div><div><kbd>SPACE</kbd><span>play / pause time</span></div><div><kbd>N</kbd><span>return to now</span></div><div><kbd>ESC</kbd><span>clear selection</span></div>';
    stage.appendChild(help);

    const viewCard = document.createElement('section');
    viewCard.className = 'orbit-card orbit-enhancement-card';
    viewCard.innerHTML = '<div class="orbit-card-head"><div><span>FIELD PRESETS</span><strong>Read the same catalog through different relations.</strong></div><em>VIEW</em></div><div class="orbit-preset-row"><button type="button" data-orbit-preset="relations" class="is-active">RELATIONS</button><button type="button" data-orbit-preset="trace">TRACE</button><button type="button" data-orbit-preset="field">FIELD</button><button type="button" data-orbit-preset="clean">CLEAN</button></div><div class="orbit-step-row"><span>TIME STEP</span><button type="button" data-orbit-step="-6">−6H</button><button type="button" data-orbit-step="-1">−1H</button><button type="button" data-orbit-step="1">+1H</button><button type="button" data-orbit-step="6">+6H</button></div>';
    const fieldCard = $$(':scope > .orbit-card', panel)[1];
    if (fieldCard?.nextSibling) panel.insertBefore(viewCard, fieldCard.nextSibling);
    else panel.appendChild(viewCard);

    const relationCard = groundCanvas.closest('.orbit-card');
    const station = document.createElement('div');
    station.className = 'orbit-station-editor';
    station.innerHTML = '<label>LAT<input type="number" inputmode="decimal" min="-90" max="90" step="0.0001" data-station-lat placeholder="35.6895"></label><label>LON<input type="number" inputmode="decimal" min="-180" max="180" step="0.0001" data-station-lon placeholder="139.6917"></label><button type="button" data-station-set>SET</button><button type="button" data-station-locate>MY LOCATION</button>';
    const stats = $('.orbit-ground-stats', relationCard);
    relationCard?.insertBefore(station, stats || null);
    const latInput = $('[data-station-lat]', station);
    const lonInput = $('[data-station-lon]', station);

    const wrap = groundCanvas.parentElement;
    if (wrap) {
      wrap.style.position = 'relative';
      const overlay = document.createElement('canvas');
      overlay.className = 'orbit-ground-overlay';
      overlay.setAttribute('aria-hidden','true');
      wrap.appendChild(overlay);
      const legend = document.createElement('span');
      legend.className = 'orbit-ground-relation-legend';
      legend.textContent = 'SUN / TERMINATOR · SELECTED GEOMETRIC HORIZON';
      wrap.appendChild(legend);
      const draw = () => {
        if (document.contains(root)) drawRelationOverlay(root,groundCanvas,overlay);
      };
      draw();
      const interval = setInterval(draw,650);
      root._orbitOverlayInterval = interval;
    }

    const actions = $('.orbit-actions', root);
    if (actions && !$('.orbit-copy-link',actions)) {
      const copy = document.createElement('button');
      copy.type='button';
      copy.className='orbit-copy-link';
      copy.textContent='COPY LINK';
      copy.addEventListener('click',()=>copyDeepLink(root,copy));
      actions.insertBefore(copy, actions.lastElementChild || null);
    }

    tools.addEventListener('click', event => {
      const zoom = event.target.closest('[data-orbit-zoom]');
      if (zoom) {
        dispatchWheel(canvas, zoom.dataset.orbitZoom === 'in' ? -180 : 180);
        stage.focus({preventScroll:true});
        return;
      }
      if (event.target.closest('[data-orbit-fit]')) {
        const equator = $('[data-view="equator"]',root);
        equator?.click();
        return;
      }
      const helpButton = event.target.closest('[data-orbit-help]');
      if (helpButton) {
        help.hidden = !help.hidden;
        helpButton.setAttribute('aria-expanded',String(!help.hidden));
      }
    });

    viewCard.addEventListener('click',event=>{
      const preset=event.target.closest('[data-orbit-preset]');
      if(preset) {
        applyPreset(root,preset.dataset.orbitPreset);
        $$('[data-orbit-preset]',viewCard).forEach(b=>b.classList.toggle('is-active',b===preset));
        return;
      }
      const step=event.target.closest('[data-orbit-step]');
      if(step) stepTime(root,Number(step.dataset.orbitStep));
    });

    const wheelForward = event => {
      if (event.target === canvas || event.target.closest('.orbit-panel,input,button,a')) return;
      event.preventDefault();
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
      dispatchWheel(canvas, clamp(event.deltaY * multiplier,-240,240));
    };
    stage.addEventListener('wheel',wheelForward,{passive:false,capture:true});

    const touches = new Map();
    let pinchDistance = null;
    canvas.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch') return;
      touches.set(event.pointerId,[event.clientX,event.clientY]);
      if(touches.size===2) {
        const values=[...touches.values()];
        pinchDistance=Math.hypot(values[1][0]-values[0][0],values[1][1]-values[0][1]);
      }
    },true);
    canvas.addEventListener('pointermove',event=>{
      if(event.pointerType!=='touch'||!touches.has(event.pointerId)) return;
      touches.set(event.pointerId,[event.clientX,event.clientY]);
      if(touches.size===2) {
        const values=[...touches.values()];
        const next=Math.hypot(values[1][0]-values[0][0],values[1][1]-values[0][1]);
        if(pinchDistance&&next>0) {
          event.preventDefault();
          event.stopPropagation();
          dispatchWheel(canvas,clamp((pinchDistance-next)*3,-220,220));
          pinchDistance=next;
        }
      }
    },true);
    const releaseTouch=event=>{touches.delete(event.pointerId);if(touches.size<2)pinchDistance=null;};
    canvas.addEventListener('pointerup',releaseTouch,true);
    canvas.addEventListener('pointercancel',releaseTouch,true);

    stage.addEventListener('keydown',event=>{
      const tag=document.activeElement?.tagName?.toLowerCase();
      if(tag==='input'||tag==='button'||tag==='a') return;
      if(event.key==='+'||event.key==='=') {event.preventDefault();dispatchWheel(canvas,-180);}
      else if(event.key==='-'||event.key==='_') {event.preventDefault();dispatchWheel(canvas,180);}
      else if(event.key.toLowerCase()==='f') {event.preventDefault();$('#orbitFocus',root)?.click();}
      else if(event.key.toLowerCase()==='r') {event.preventDefault();$('[data-view="equator"]',root)?.click();}
      else if(event.key.toLowerCase()==='n') {event.preventDefault();$('#orbitNow',root)?.click();}
      else if(event.key===' ') {event.preventDefault();$('#orbitPlay',root)?.click();}
      else if(event.key==='Escape') {
        event.preventDefault();
        if(!help.hidden) {
          help.hidden=true;
          $('[data-orbit-help]',tools)?.setAttribute('aria-expanded','false');
        } else {
          canvas.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));
        }
      } else if(event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='ArrowUp'||event.key==='ArrowDown') {
        event.preventDefault();
        const r=canvas.getBoundingClientRect();
        const from={x:r.left+r.width/2,y:r.top+r.height/2};
        const dx=event.key==='ArrowLeft'?-28:event.key==='ArrowRight'?28:0;
        const dy=event.key==='ArrowUp'?-22:event.key==='ArrowDown'?22:0;
        canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:997,pointerType:'mouse',button:0,clientX:from.x,clientY:from.y}));
        canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:997,pointerType:'mouse',buttons:1,clientX:from.x+dx,clientY:from.y+dy}));
        canvas.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:997,pointerType:'mouse',button:0,clientX:from.x+dx,clientY:from.y+dy}));
      }
    });

    groundCanvas.addEventListener('click',event=>{
      const stationPoint=stationFromPointer(groundCanvas,event);
      if(stationPoint) updateStationInputs(groundCanvas,latInput,lonInput,stationPoint.lat,stationPoint.lon);
    },true);

    $('[data-station-set]',station)?.addEventListener('click',()=>{
      const lat=Number(latInput.value);
      const lon=Number(lonInput.value);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180) {
        station.classList.add('has-error');
        return;
      }
      station.classList.remove('has-error');
      mapEventForCoordinate(groundCanvas,lat,lon);
    });

    $('[data-station-locate]',station)?.addEventListener('click',event=>{
      const button=event.currentTarget;
      if(!navigator.geolocation) {
        button.textContent='UNAVAILABLE';
        return;
      }
      button.textContent='LOCATING…';
      navigator.geolocation.getCurrentPosition(
        pos=>{
          const lat=pos.coords.latitude;
          const lon=pos.coords.longitude;
          updateStationInputs(groundCanvas,latInput,lonInput,lat,lon);
          mapEventForCoordinate(groundCanvas,lat,lon);
          button.textContent='MY LOCATION';
        },
        ()=>{
          button.textContent='PERMISSION NEEDED';
          setTimeout(()=>{button.textContent='MY LOCATION';},1600);
        },
        {enableHighAccuracy:false,timeout:8000,maximumAge:600000}
      );
    });

    const selectedName=$('#orbitSelectedName',root);
    if(selectedName) {
      const selectedObserver=new MutationObserver(()=>{
        const id=selectedCatalogId(root);
        if(!id) return;
        const url=new URL(location.href);
        url.searchParams.set('sat',id);
        history.replaceState(null,'',url);
      });
      selectedObserver.observe(selectedName,{childList:true,characterData:true,subtree:true});
      root._orbitSelectedObserver=selectedObserver;
    }

    root._orbitStatusObserver=sanitizeOrbitStatus(root);
    restoreDeepLink(root);
  }

  function scan() {
    $$('.orbit-v2').forEach(enhance);
  }

  ensureStyle();
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('pagehide',()=>{
    observer.disconnect();
    $$('.orbit-v2').forEach(root=>{
      clearInterval(root._orbitOverlayInterval);
      root._orbitSelectedObserver?.disconnect?.();
      root._orbitStatusObserver?.disconnect?.();
    });
  },{once:true});
})();
