(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const locale = (() => { try { return localStorage.getItem('geogeek-language') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; } })();

  function bindProjectProbe() {
    $$('.project-card').forEach(card => {
      let probe = $('.project-probe', card);
      if (!probe) {
        probe = document.createElement('div');
        probe.className = 'project-probe';
        probe.innerHTML = '<i></i><b></b><span></span>';
        const visual = $('.project-visual', card);
        visual?.appendChild(probe);
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
        const ny = ((1-y/r.height)*100).toFixed(0);
        const label = $('span', probe);
        if (label) label.textContent = locale === 'zh' ? `视域 ${nx} · ${ny}` : `VIEW ${nx} · ${ny}`;
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
      const art = $('.preview-art', host); art?.prepend(img);
    });
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
      for (let i=0;i<7;i++) {
        const p=document.createElement('i'); p.className='orbit-live-point';
        p.style.setProperty('--delay', `${-i*1.15}s`); p.style.setProperty('--phase', `${i*41}deg`);
        host.appendChild(p);
      }
    });
  }

  bindProjectProbe();
  earthPreview();
  pulsePreview();
  orbitMotion();
})();
