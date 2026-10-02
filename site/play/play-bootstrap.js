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
    if (kind === 'locate') return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><circle class="pp-extent" cx="160" cy="90" r="70"/><circle class="pp-node" cx="160" cy="90" r="4"/><line class="pp-judgment" x1="160" y1="90" x2="232" y2="54"/><line class="pp-signal" x1="160" y1="90" x2="250" y2="72"/><circle class="pp-signal-fill" cx="250" cy="72" r="4"/></svg>';
    if (kind === 'zone') return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><path class="pp-field" d="M36 128 C72 46 130 54 154 104 C178 40 246 45 282 128"/><path class="pp-signal" d="M58 116 C91 76 121 79 145 111 M176 108 C207 69 244 74 267 116"/></svg>';
    if (kind === 'path') return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><g class="pp-edge"><line x1="55" y1="120" x2="112" y2="74"/><line x1="112" y1="74" x2="176" y2="105"/><line x1="176" y1="105" x2="258" y2="60"/><line x1="112" y1="74" x2="218" y2="55"/></g><g class="pp-node-group"><circle cx="55" cy="120" r="5"/><circle cx="112" cy="74" r="5"/><circle cx="176" cy="105" r="5"/><circle cx="218" cy="55" r="5"/><circle cx="258" cy="60" r="5"/></g><line class="pp-signal" x1="55" y1="120" x2="218" y2="55"/></svg>';
    return '<svg class="play-preview-svg" viewBox="0 0 320 180" aria-hidden="true"><path class="pp-world" d="M31 92 C69 38 127 35 158 67 C191 34 254 45 289 91 C257 140 195 148 160 115 C126 148 65 140 31 92Z"/><ellipse class="pp-tissot" cx="83" cy="62" rx="10" ry="18"/><ellipse class="pp-tissot" cx="160" cy="92" rx="13" ry="13"/><ellipse class="pp-tissot" cx="241" cy="57" rx="9" ry="20"/><path class="pp-signal" d="M40 92 C82 116 121 121 160 115 C203 110 245 101 282 91"/></svg>';
  }

  function setPreview(card, kind) {
    const visual = card?.querySelector('.project-visual');
    if (!visual) return;
    visual.className = `project-visual play-preview play-preview-${kind}`;
    visual.innerHTML = `${previewMarkup(kind)}<span class="preview-stamp">${kind === 'locate' ? 'POINT / REFERENCE / ERROR' : kind === 'zone' ? 'FIELD / THRESHOLD / SCALE' : kind === 'path' ? 'NODE / EDGE / REACHABILITY' : 'SURFACE / PROJECTION / DISTORTION'}</span>`;
  }

  function alignPlayContent() {
    if (!root || !labUI) return;

    updateItem('locate', {status:'Play',title:'Orient',tags:['Point','Reference','Error'],description:'Estimate one place from another, then reveal distance and bearing residuals in a reference-centered field.',coord:'reference / bearing / distance',instrumentKicker:'PLAY / POINT / REFERENCE / ERROR',source:'Natural Earth · spherical great-circle model'});
    updateItem('zone', {status:'Play',title:'Bound',tags:['Field','Threshold','Scale'],description:'Cut a continuous field with a rule, then change sampling or smoothing and watch the region change.',coord:'field / threshold / components',instrumentKicker:'PLAY / FIELD / THRESHOLD / SCALE',source:'Deterministic procedural scalar fields · d3-contour'});
    updateItem('path', {status:'Play',title:'Connect',tags:['Node','Edge','Reachability'],description:'Build a route under one relation, then change the edge rule without moving the places.',coord:'node / edge / hops',instrumentKicker:'PLAY / NODE / EDGE / REACHABILITY',source:'Natural Earth · authored relation graphs'});

    let project = root.lab.find(entry => entry.instrument === 'project');
    if (!project) {
      project = {id:'l13',type:'Play',status:'Play',instrument:'project',title:'Project',tags:['Surface','Projection','Distortion'],description:'Make a spatial judgment before the representation is declared, then change projection or viewpoint.',coord:'surface / projection / distortion',instrumentKicker:'PLAY / SURFACE / PROJECTION / DISTORTION',source:'Natural Earth · D3 geographic projections'};
      root.lab.push(project);
    }

    labUI.conditions = labUI.conditions || {};
    labUI.conditions.locate = [['FIELD','Reference-centered world'],['PROJECTION','Azimuthal Equidistant'],['MEASURE','Great-circle distance · initial bearing'],['LIMIT','Spherical Earth · authored place pairs']];
    labUI.conditions.zone = [['FIELD','Deterministic synthetic scalar'],['RULE','F(x,y) ≥ threshold'],['CONDITION','Resolution · smoothing'],['LIMIT','Region depends on sampling + preprocessing']];
    labUI.conditions.path = [['NODES','Authored country set'],['RELATION','Land border · point-distance threshold'],['PATH','Unweighted hops'],['LIMIT','Relation definition constructs topology']];
    labUI.conditions.project = [['GEOMETRY','Natural Earth 1:110m'],['SURFACE','Spherical model'],['PROJECTIONS','Mercator · Equal Earth · Azimuthal Equidistant · Orthographic'],['LIMIT','No projection preserves every relation']];

    const orientCard=alignCard('locate',{title:'Orient',meta:'Point · Reference · Error',copy:'Estimate one place from another. Commit first; reveal the relation second.',coord:'reference / bearing / distance',stamp:'POINT / REFERENCE / ERROR'});
    const boundCard=alignCard('zone',{title:'Bound',meta:'Field · Threshold · Scale',copy:'A boundary appears when a rule cuts a field. Change one condition and inspect the effect.',coord:'field / threshold / scale',stamp:'FIELD / THRESHOLD / SCALE'});
    const pathCard=alignCard('path',{title:'Connect',meta:'Node · Edge · Reachability',copy:'Build a path, change the relation, and watch the graph reorganize without moving the places.',coord:'node / edge / hops',stamp:'NODE / EDGE / REACHABILITY'});
    setPreview(orientCard,'locate'); setPreview(boundCard,'zone'); setPreview(pathCard,'path');

    if (!document.querySelector('[data-instrument="project"]') && pathCard) {
      const clone=pathCard.cloneNode(true);
      clone.id='l13';
      clone.dataset.recordRef='lab:l13';
      clone.dataset.detailHref='lab.html?instrument=project#l13';
      clone.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      clone.querySelectorAll('[data-record-ref]').forEach(node=>node.dataset.recordRef='lab:l13');
      clone.querySelectorAll('.project-link').forEach(node=>node.remove());
      const trigger=clone.querySelector('[data-instrument]');
      if (trigger) trigger.dataset.instrument='project';
      pathCard.parentElement?.appendChild(clone);
    }
    const projectCard=alignCard('project',{title:'Project',meta:'Surface · Projection · Distortion',copy:'Judge size, route, and viewpoint before the representation is revealed.',coord:'surface / projection / distortion',stamp:'SURFACE / PROJECTION / DISTORTION'});
    setPreview(projectCard,'project');

    const playBlock=document.querySelector('[data-instrument="locate"]')?.closest('.lab-group-block');
    if (playBlock && !playBlock.querySelector('.play-proposition')) {
      const p=document.createElement('p');p.className='play-proposition';p.textContent='CHANGE THE RULE. WATCH THE WORLD CHANGE.';
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
    const names={orient:'ORIENT',bound:'BOUND',connect:'CONNECT',project:'PROJECT'};
    const groups=new Map();
    records.forEach(record=>{if(names[record.play])groups.set(record.play,(groups.get(record.play)||0)+1);});
    let node=playBlock.querySelector('.spatial-trace-summary');
    if (groups.size<2) { node?.remove(); return; }
    if (!node) { node=document.createElement('div');node.className='spatial-trace-summary';playBlock.appendChild(node); }
    const rows=[...groups].map(([play,count])=>`<span><b>${names[play]}</b><em>${count} COMMITTED TRACE${count===1?'':'S'}</em></span>`).join('');
    node.innerHTML=`<div><small>YOUR SPATIAL TRACE / ${String(groups.size).padStart(2,'0')} INSTRUMENTS</small><strong>NOT A SCORE. A RECORD OF WHAT CHANGED.</strong></div><p>${rows}</p>`;
  }

  alignPlayContent();
  document.getElementById('instrumentDialog')?.addEventListener('close',renderSpatialTrace);
  window.addEventListener('storage',event=>{if(event.key===TRACE_KEY)renderSpatialTrace();});

  document.addEventListener('click', event => {
    const button = event.target.closest?.('.play-shell[data-play-kind="orient"][data-play-state="trace"] .play-action.is-secondary');
    if (!button || button.textContent.trim() !== 'RESTART ORIENT') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.GeoInstruments?.openByKind?.('locate', { updateUrl:false });
  }, true);
})();