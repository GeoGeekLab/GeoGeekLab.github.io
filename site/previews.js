(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const locale = (() => { try { return localStorage.getItem('geogeek-language') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; } })();
  const NATURAL_EARTH = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_0_countries.json';
  const NS = 'http://www.w3.org/2000/svg';

  function bindProjectProbe() {
    $$('.project-card').forEach(card => {
      let probe = $('.project-probe', card);
      if (!probe) {
        probe = document.createElement('div');
        probe.className = 'project-probe';
        probe.innerHTML = '<i></i><b></b><span></span>';
        $('.project-visual', card)?.appendChild(probe);
      }
      card.addEventListener('pointermove', event => {
        const visual = $('.project-visual', card);
        if (!visual) return;
        const r = visual.getBoundingClientRect();
        const x = Math.max(0, Math.min(r.width, event.clientX-r.left));
        const y = Math.max(0, Math.min(r.height, event.clientY-r.top));
        visual.style.setProperty('--probe-x', `${x}px`);
        visual.style.setProperty('--probe-y', `${y}px`);
        const nx = ((x/r.width)*100).toFixed(0);
        const ny = ((y/r.height)*100).toFixed(0);
        const label = $('span', probe);
        if (label) label.textContent = locale === 'zh' ? `幅面 X${nx} · Y${ny}` : `SHEET X${nx} · Y${ny}`;
      });
    });
  }

  function earthPreview() {
    $$('.project-visual-earth').forEach(host => {
      if ($('.live-earth-preview', host)) return;
      const img = document.createElement('img');
      img.className = 'live-earth-preview';
      img.alt = locale === 'zh' ? 'NASA Terra 真彩色地球观测预览' : 'NASA Terra true-color Earth observation preview';
      const d = new Date(); d.setUTCDate(d.getUTCDate()-2);
      const date = d.toISOString().slice(0,10);
      const params = new URLSearchParams({ service:'WMS', version:'1.1.1', request:'GetMap', layers:'MODIS_Terra_CorrectedReflectance_TrueColor', styles:'', format:'image/jpeg', transparent:'false', srs:'EPSG:4326', bbox:'-180,-90,180,90', width:'1200', height:'600', time:date });
      img.src = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${params.toString()}`;
      const art = $('.preview-art', host);
      art?.prepend(img);
      const stamp = $('.preview-stamp', host);
      if (stamp) stamp.textContent = `MODIS TERRA / ${date} / EPSG:4326`;
    });
  }

  const project = ([lon,lat]) => [((Number(lon)+180)/360)*1000, ((90-Number(lat))/180)*500];

  function ringPath(ring) {
    let d = '';
    let lastX = null;
    (ring || []).forEach(coord => {
      const [x,y] = project(coord);
      const jump = lastX != null && Math.abs(x-lastX) > 420;
      d += `${lastX == null || jump ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
      lastX = x;
    });
    return d;
  }

  function geometryPath(geometry) {
    if (!geometry) return '';
    if (geometry.type === 'Polygon') return geometry.coordinates.map(ringPath).join(' ');
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap(poly => poly.map(ringPath)).join(' ');
    return '';
  }

  function featureName(feature) {
    const p = feature?.properties || {};
    return String(p.ADMIN || p.NAME_LONG || p.NAME || '').toLowerCase();
  }


  function appendWorld(host, world, kind) {
    const art = $('.preview-art', host);
    if (!art || $('.preview-geo-svg', art)) return;
    const svg = document.createElementNS(NS,'svg');
    svg.setAttribute('class','preview-geo-svg');
    svg.setAttribute('viewBox','0 0 1000 500');
    svg.setAttribute('aria-hidden','true');
    const features = world.features || [];
    features.forEach(feature => {
      const path = document.createElementNS(NS,'path');
      path.setAttribute('d', geometryPath(feature.geometry));
      path.setAttribute('class','geo-land');
      svg.appendChild(path);
    });

    if (kind === 'zone') {
      const target = features.find(f => featureName(f).includes('japan'));
      if (target) {
        const path=document.createElementNS(NS,'path');
        path.setAttribute('d',geometryPath(target.geometry));
        path.setAttribute('class','geo-zone');
        svg.appendChild(path);
      }
    }

    if (kind === 'locate') {
      const [x,y]=project([139.6917,35.6895]);
      const point=document.createElementNS(NS,'circle');
      point.setAttribute('cx',x); point.setAttribute('cy',y); point.setAttribute('r','6'); point.setAttribute('class','geo-point');
      svg.appendChild(point);
      const h=document.createElementNS(NS,'path');
      h.setAttribute('d',`M${x-16},${y}L${x+16},${y}M${x},${y-16}L${x},${y+16}`);
      h.setAttribute('class','geo-route');
      svg.appendChild(h);
    }

    if (kind === 'path') {
      // Representative points for three mutually adjacent steps: France → Germany → Poland.
      const points=[[2.35,48.86],[13.405,52.52],[21.0122,52.2297]].map(project);
      if (points.length > 1) {
        const path=document.createElementNS(NS,'path');
        path.setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '));
        path.setAttribute('class','geo-route');
        svg.appendChild(path);
        points.forEach(([x,y])=>{ const c=document.createElementNS(NS,'circle'); c.setAttribute('cx',x); c.setAttribute('cy',y); c.setAttribute('r','4'); c.setAttribute('class','geo-point'); svg.appendChild(c); });
      }
    }

    art.prepend(svg);
    host.classList.add('has-geo-specimen');
    const stamp=$('.preview-stamp',host);
    if (stamp) {
      const labels={
        world:'NATURAL EARTH / 1:110m',
        pulse:'USGS / 24H',
        locate: locale==='zh' ? '样本 / 东京 · 北纬 35.69°' : 'SPECIMEN / TOKYO 35.69°N',
        zone: locale==='zh' ? '样本 / 日本' : 'SPECIMEN / JAPAN',
        path: locale==='zh' ? '样本 / 法→德→波' : 'SPECIMEN / FR→DE→PL'
      };
      if (labels[kind]) stamp.textContent=labels[kind];
    }
  }

  async function geographicSpecimens() {
    const hosts = $$('.project-visual-world, .project-visual-pulse, .project-visual-locate, .project-visual-zone, .project-visual-path');
    if (!hosts.length) return;
    try {
      const res=await fetch(NATURAL_EARTH,{mode:'cors'});
      if(!res.ok) return;
      const world=await res.json();
      hosts.forEach(host=>{
        const kind = ['world','pulse','locate','zone','path'].find(k=>host.classList.contains(`project-visual-${k}`));
        if(kind) appendWorld(host,world,kind);
      });
    } catch {}
  }

  async function pulsePreview() {
    const hosts = $$('.project-visual-pulse');
    if (!hosts.length) return;
    try {
      const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', { mode:'cors' });
      if (!res.ok) return;
      const json = await res.json();
      const events = (json.features || []).filter(f => Array.isArray(f.geometry?.coordinates)).slice(0,70);
      hosts.forEach(host => {
        const art = $('.preview-art', host); if (!art || $('.live-pulse-layer', art)) return;
        const layer = document.createElement('div'); layer.className='live-pulse-layer';
        events.forEach(f => {
          const [lon, lat] = f.geometry.coordinates;
          const mag = Number(f.properties?.mag || 0);
          const dot=document.createElement('i');
          dot.className='live-pulse-dot';
          dot.style.left=`${((lon+180)/360)*100}%`;
          dot.style.top=`${((90-lat)/180)*100}%`;
          dot.style.width=dot.style.height=`${Math.max(3, 3+mag*1.25)}px`;
          layer.appendChild(dot);
        });
        art.appendChild(layer);
      });
    } catch {}
  }

  function orbitMotion() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('.project-visual-orbit .preview-orbit').forEach(host => {
      const stamp=$('.preview-stamp',host);
      if(stamp) stamp.textContent=locale==='zh' ? '轨道场 / 活动星目' : 'ORBITAL FIELD / ACTIVE CATALOG';
      for (let i=0;i<7;i++) {
        const p=document.createElement('i'); p.className='orbit-live-point';
        p.style.setProperty('--delay', `${-i*1.15}s`); p.style.setProperty('--phase', `${i*41}deg`);
        host.appendChild(p);
      }
    });
  }

  bindProjectProbe();
  earthPreview();
  geographicSpecimens();
  pulsePreview();
  orbitMotion();
})();
