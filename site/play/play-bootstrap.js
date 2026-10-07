(() => {
  'use strict';

  const root = window.GEOGEEK_DATA?.en;
  const labUI = root?.ui?.lab;
  const TRACE_KEY = 'geogeek.play.trace.v1';

  function updateItem(kind, patch) {
    const item = root?.lab?.find(entry => entry.instrument === kind);
    if (item) Object.assign(item, patch);
    return item;
  }

  const PLAY_KINDS = new Set(['locate','zone','path','project','light']);

  function ensurePlayFallbackLinks() {
    PLAY_KINDS.forEach(kind => {
      const trigger = document.querySelector(`[data-instrument="${kind}"]`);
      if (!trigger) return;
      const card = trigger.closest('.project-card');
      const href = card?.dataset.detailHref || `lab.html?instrument=${encodeURIComponent(kind)}#${card?.id || ''}`;

      if (trigger instanceof HTMLAnchorElement) {
        trigger.href = href;
        trigger.dataset.playFallback = 'true';
        return;
      }

      const link = document.createElement('a');
      [...trigger.attributes].forEach(attribute => {
        if (attribute.name === 'type') return;
        link.setAttribute(attribute.name, attribute.value);
      });
      link.href = href;
      link.dataset.playFallback = 'true';
      link.innerHTML = trigger.innerHTML;
      trigger.replaceWith(link);
    });
  }

  function alignCard(kind, { title, meta, copy, coord, stamp }) {
    const trigger = document.querySelector(`[data-instrument="${kind}"]`);
    const card = trigger?.closest('.project-card');
    if (!card) return null;
    const spans = card.querySelectorAll('.project-meta span');
    if (spans[0]) spans[0].textContent = 'Play';
    if (spans[1]) spans[1].textContent = meta;
    const heading = card.querySelector('h2');
    const paragraph = card.querySelector('.project-copy > p');
    const coordNode = card.querySelector('.lab-coord');
    const stampNode = card.querySelector('.preview-stamp');
    if (heading) heading.textContent = title;
    if (paragraph) paragraph.textContent = copy;
    if (coordNode) coordNode.textContent = coord;
    if (stampNode) stampNode.textContent = stamp;
    card.dataset.instrumentKind = kind;
    return card;
  }

  function previewMarkup(kind) {
    if (kind === 'locate') return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><circle class="pp-extent" cx="160" cy="90" r="70"/><circle class="pp-node" cx="160" cy="90" r="4"/><line class="pp-judgment" x1="160" y1="90" x2="228" y2="48"/><circle class="pp-node" cx="228" cy="48" r="4"/><line class="pp-signal" x1="228" y1="48" x2="252" y2="73"/><circle class="pp-signal-fill" cx="252" cy="73" r="4"/></svg>';
    if (kind === 'zone') return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><path class="pp-field" d="M28 137 C62 55 121 42 153 101 C186 48 252 50 292 132"/><path class="pp-signal" d="M73 124 C83 84 116 67 151 79 C191 65 226 82 245 119 C216 142 179 147 142 139 C111 144 88 138 73 124Z"/><path class="pp-edge" d="M86 114 C112 91 146 89 174 98 C199 105 220 117 242 129"/></svg>';
    if (kind === 'path') return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><g class="pp-edge"><line x1="52" y1="124" x2="110" y2="78"/><line x1="110" y1="78" x2="174" y2="108"/><line x1="174" y1="108" x2="258" y2="62"/><line x1="110" y1="78" x2="217" y2="54"/></g><g class="pp-node-group"><circle cx="52" cy="124" r="5"/><circle cx="110" cy="78" r="5"/><circle cx="174" cy="108" r="5"/><circle cx="217" cy="54" r="5"/><circle cx="258" cy="62" r="5"/></g><path class="pp-signal" d="M52 124 L110 78 L217 54 L258 62"/><line class="pp-judgment" x1="174" y1="108" x2="258" y2="62"/></svg>';
    if (kind === 'light') return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><circle class="pp-signal-fill" cx="253" cy="39" r="10"/><line class="pp-signal" x1="245" y1="48" x2="172" y2="95"/><line class="pp-judgment" x1="172" y1="95" x2="89" y2="58"/><path class="pp-field" d="M22 105 C86 99 136 110 196 104 C242 99 276 105 299 103 L299 160 L22 160 Z"/><path class="pp-edge" d="M172 98 C162 125 150 137 132 150 C166 140 201 121 230 101"/></svg>';
    return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><path class="pp-world" d="M33 92 C70 42 126 35 159 67 C191 34 251 44 288 91 C256 139 197 147 160 116 C123 148 65 139 33 92Z"/><path class="pp-field" d="M52 92 C91 62 126 59 160 71 C196 55 233 63 270 92 C232 119 196 126 160 113 C124 127 88 120 52 92Z"/><path class="pp-signal" d="M39 92 C83 116 123 121 160 116 C202 109 244 100 283 91"/></svg>';
  }

  function setPreview(card, kind) {
    const visual = card?.querySelector('.project-visual');
    if (!visual) return;
    visual.className = `project-visual play-preview play-preview-${kind}`;
    visual.innerHTML = `${previewMarkup(kind)}<span class="preview-stamp">${kind === 'locate' ? 'SPATIAL INSTINCT' : kind === 'zone' ? 'DECISION / CONSEQUENCE' : kind === 'path' ? 'PLAN / RULE / ADAPT' : kind === 'light' ? 'SOURCE / PATH / OBSERVER' : 'TRANSFORM / INVARIANT'}</span>`;
  }

  function alignPlayContent() {
    if (!root || !labUI) return;

    updateItem('locate', {status:'Play',title:'Orient',tags:['Instinct','Confidence','Error'],description:'Place a spatial relation from intuition, commit confidence, then reveal the shape of your error.',coord:'perceive / commit / calibrate',instrumentKicker:'PLAY / SPATIAL INSTINCT',source:'Natural Earth · spherical great-circle model'});
    updateItem('zone', {status:'Play',title:'Bound',tags:['Decision','Boundary','Uncertainty'],description:'Draw one unsafe region, change observation resolution, then decide whether your line still holds.',coord:'draw / disturb / defend',instrumentKicker:'PLAY / DECISION / CONSEQUENCE',source:'Deterministic procedural risk + population fields'});
    updateItem('path', {status:'Play',title:'Connect',tags:['Plan','Rule','Adapt'],description:'Plan a route, lock it, then adapt when the definition of connection changes.',coord:'plan / rule / adapt',instrumentKicker:'PLAY / PLAN / RULE / ADAPT',source:'Natural Earth · land-border and distance graphs'});
    updateItem('project', {status:'Play',title:'Project',tags:['Predict','Transform','Invariant'],description:'Predict first, then drag the representation and watch the same geography change appearance.',coord:'predict / transform / reveal',instrumentKicker:'PLAY / TRANSFORM / INVARIANT',source:'Natural Earth · D3 geographic projections'});
    updateItem('light', {status:'Play',title:'Light',tags:['Light','Ocean Color','Mechanism'],description:'Break the light path. Remove scattering, backscatter, or reflection and observe what remains.',coord:'source / path / observer',instrumentKicker:'PLAY / SOURCE / PATH / OBSERVER',source:'GeoGeek Water as Spectrum · conceptual Rayleigh + Fresnel teaching paths'});

    labUI.conditions = labUI.conditions || {};
    labUI.conditions.locate = [['FIELD','Reference-centered world'],['INPUT','Spatial estimate + confidence'],['REVEAL','Distance + bearing residual'],['LIMIT','Descriptive calibration · no score']];
    labUI.conditions.zone = [['FIELD','Procedural risk + population'],['DECISION','One closed boundary'],['OBSERVATION','96 × 96 → 24 × 24'],['LIMIT','Trade-off, not one correct line']];
    labUI.conditions.path = [['NODES','Authored country set'],['RULE A','Shared land border'],['RULE B','Distance threshold'],['GOAL','Adapt toward fewer hops']];
    labUI.conditions.project = [['SURFACE','Spherical geography'],['AREA','Mercator → Equal Earth'],['ROUTE','Mercator → Tokyo-centered azimuthal'],['RULE','Representation changes · geography stays']];
    labUI.conditions.light = [['WATER','Rrs · 400–700 nm · 1 nm'],['ATMOSPHERE','Conceptual Rayleigh path'],['SURFACE','Fixed-angle Fresnel path'],['LIMIT','No TOA radiance · no BRDF · display color illustrative']];

    const orientCard=alignCard('locate',{title:'Orient',meta:'Instinct · Confidence · Error',copy:'Test your spatial instinct. Place the relation, set confidence, then see your error.',coord:'perceive / commit / calibrate',stamp:'SPATIAL INSTINCT'});
    const boundCard=alignCard('zone',{title:'Bound',meta:'Decision · Boundary · Uncertainty',copy:'Draw one unsafe region. Change the observation, then keep or redraw your line.',coord:'draw / disturb / defend',stamp:'DECISION / CONSEQUENCE'});
    const pathCard=alignCard('path',{title:'Connect',meta:'Plan · Rule · Adapt',copy:'Plan a route. Lock it. Then adapt when the connection rule changes.',coord:'plan / rule / adapt',stamp:'PLAN / RULE / ADAPT'});
    setPreview(orientCard,'locate'); setPreview(boundCard,'zone'); setPreview(pathCard,'path');

    const projectCard=alignCard('project',{title:'Project',meta:'Predict · Transform · Invariant',copy:'Predict first. Drag the projection and watch the same world change shape.',coord:'predict / transform / reveal',stamp:'TRANSFORM / INVARIANT'});
    setPreview(projectCard,'project');
    const lightCard=alignCard('light',{title:'Light',meta:'Light · Ocean Color · Mechanism',copy:'Break the light path. Remove scattering, backscatter, or reflection and observe what remains.',coord:'source / path / observer',stamp:'SOURCE / PATH / OBSERVER'});
    setPreview(lightCard,'light');

    const playBlock=document.querySelector('[data-instrument="locate"]')?.closest('.lab-group-block');
    if (playBlock && !playBlock.querySelector('.play-proposition')) {
      const p=document.createElement('p');
      p.className='play-proposition';
      p.textContent='PERCEIVE. DIVIDE. CONNECT. REPRESENT. TRACE.';
      playBlock.insertBefore(p,playBlock.firstElementChild?.nextSibling || playBlock.firstChild);
    }
    renderSpatialTrace();
  }

  function readTrace() {
    try { const value=JSON.parse(localStorage.getItem(TRACE_KEY)||'[]'); return Array.isArray(value)?value:[]; } catch { return []; }
  }

  function renderSpatialTrace() {
    const playBlock=document.querySelector('[data-instrument="locate"]')?.closest('.lab-group-block');
    if (!playBlock) return;
    const records=readTrace();
    const names={orient:'ORIENT',bound:'BOUND',connect:'CONNECT',project:'PROJECT',light:'LIGHT'};
    const groups=new Map();
    records.forEach(record=>{if(names[record.play])groups.set(record.play,(groups.get(record.play)||0)+1);});
    let node=playBlock.querySelector('.spatial-trace-summary');
    if (groups.size<2) { node?.remove(); return; }
    if (!node) { node=document.createElement('div');node.className='spatial-trace-summary';playBlock.appendChild(node); }
    const rows=[...groups].map(([play,count])=>`<span><b>${names[play]}</b><em>${count} COMMITTED TRACE${count===1?'':'S'}</em></span>`).join('');
    node.innerHTML=`<div><small>YOUR SPATIAL TRACE / ${String(groups.size).padStart(2,'0')} INSTRUMENTS</small><strong>NOT A SCORE. A RECORD OF WHAT CHANGED.</strong></div><p>${rows}</p>`;
  }

  ensurePlayFallbackLinks();
  alignPlayContent();
  document.getElementById('instrumentDialog')?.addEventListener('close',renderSpatialTrace);
  window.addEventListener('storage',event=>{if(event.key===TRACE_KEY)renderSpatialTrace();});

  // If the dedicated Play runtime is unavailable, preserve the anchor's native
  // navigation instead of letting the generic instrument loader swallow it.
  window.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-play-fallback="true"][data-instrument]');
    if (!link || window.GeoModules?.__geoSpatialPlayRuntime) return;
    event.stopPropagation();
  }, true);

  document.addEventListener('click', event => {
    const button = event.target.closest?.('.play-shell[data-play-kind="orient"][data-play-state="trace"] .play-action.is-secondary');
    if (!button || button.textContent.trim() !== 'RESTART ORIENT') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.GeoInstruments?.openByKind?.('locate', { updateUrl:false });
  }, true);
})();