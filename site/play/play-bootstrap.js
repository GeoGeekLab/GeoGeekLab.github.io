(() => {
  'use strict';

  const root = window.GEOGEEK_DATA?.en;
  const labUI = root?.ui?.lab;

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

  function alignPlayContent() {
    if (!root || !labUI) return;

    updateItem('locate', {
      status:'Play', title:'Orient', tags:['Point','Reference','Error'],
      description:'Estimate one place from another, then reveal distance and bearing residuals in a reference-centered field.',
      coord:'reference / bearing / distance', instrumentKicker:'PLAY / POINT / REFERENCE / ERROR',
      source:'Natural Earth · spherical great-circle model'
    });
    updateItem('zone', {
      status:'Play', title:'Bound', tags:['Field','Threshold','Scale'],
      description:'Cut a continuous field with a rule, then change sampling or smoothing and watch the region change.',
      coord:'field / threshold / components', instrumentKicker:'PLAY / FIELD / THRESHOLD / SCALE',
      source:'Deterministic procedural scalar fields · d3-contour'
    });
    updateItem('path', {
      status:'Play', title:'Connect', tags:['Node','Edge','Reachability'],
      description:'Build a route under one relation, then change the edge rule without moving the places.',
      coord:'node / edge / hops', instrumentKicker:'PLAY / NODE / EDGE / REACHABILITY',
      source:'Natural Earth · authored relation graphs'
    });

    let project = root.lab.find(entry => entry.instrument === 'project');
    if (!project) {
      project = {
        id:'l13', type:'Play', status:'Play', instrument:'project', title:'Project',
        tags:['Surface','Projection','Distortion'],
        description:'Make a spatial judgment before the representation is declared, then change projection or viewpoint.',
        coord:'surface / projection / distortion', instrumentKicker:'PLAY / SURFACE / PROJECTION / DISTORTION',
        source:'Natural Earth · D3 geographic projections'
      };
      root.lab.push(project);
    }

    labUI.conditions = labUI.conditions || {};
    labUI.conditions.locate = [['FIELD','Reference-centered world'],['PROJECTION','Azimuthal Equidistant'],['MEASURE','Great-circle distance · initial bearing'],['LIMIT','Spherical Earth · authored place pairs']];
    labUI.conditions.zone = [['FIELD','Deterministic synthetic scalar'],['RULE','F(x,y) ≥ threshold'],['CONDITION','Resolution · smoothing'],['LIMIT','Region depends on sampling + preprocessing']];
    labUI.conditions.path = [['NODES','Authored country set'],['RELATION','Land border · point-distance threshold'],['PATH','Unweighted hops'],['LIMIT','Relation definition constructs topology']];
    labUI.conditions.project = [['GEOMETRY','Natural Earth 1:110m'],['SURFACE','Spherical model'],['PROJECTIONS','Mercator · Equal Earth · Azimuthal Equidistant · Orthographic'],['LIMIT','No projection preserves every relation']];

    alignCard('locate',{title:'Orient',meta:'Point · Reference · Error',copy:'Estimate one place from another. Commit first; reveal the relation second.',coord:'reference / bearing / distance',stamp:'POINT / REFERENCE / ERROR'});
    alignCard('zone',{title:'Bound',meta:'Field · Threshold · Scale',copy:'A boundary appears when a rule cuts a field. Change one condition and inspect the effect.',coord:'field / threshold / scale',stamp:'FIELD / THRESHOLD / SCALE'});
    const pathCard=alignCard('path',{title:'Connect',meta:'Node · Edge · Reachability',copy:'Build a path, change the relation, and watch the graph reorganize without moving the places.',coord:'node / edge / hops',stamp:'NODE / EDGE / REACHABILITY'});

    if (!document.querySelector('[data-instrument="project"]') && pathCard) {
      const clone=pathCard.cloneNode(true);
      clone.id='l13';
      clone.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      const trigger=clone.querySelector('[data-instrument]');
      if (trigger) trigger.dataset.instrument='project';
      pathCard.parentElement?.appendChild(clone);
      alignCard('project',{title:'Project',meta:'Surface · Projection · Distortion',copy:'Judge size, route, and viewpoint before the representation is revealed.',coord:'surface / projection / distortion',stamp:'SURFACE / PROJECTION / DISTORTION'});
    }

    const playBlock=document.querySelector('[data-instrument="locate"]')?.closest('.lab-group-block');
    if (playBlock && !playBlock.querySelector('.play-proposition')) {
      const p=document.createElement('p');p.className='play-proposition';p.textContent='CHANGE THE RULE. WATCH THE WORLD CHANGE.';
      playBlock.insertBefore(p,playBlock.firstElementChild?.nextSibling || playBlock.firstChild);
    }
  }

  alignPlayContent();

  // Trace replaces ORIENT's field contents. Restart by remounting instead of
  // attempting to reuse detached SVG state.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.play-shell[data-play-kind="orient"][data-play-state="trace"] .play-action.is-secondary');
    if (!button || button.textContent.trim() !== 'RESTART ORIENT') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.GeoInstruments?.openByKind?.('locate', { updateUrl:false });
  }, true);
})();