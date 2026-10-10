(() => {
  'use strict';

  function create({ shell, d3, land, nodes, puzzle, graphApi, callbacks = {} } = {}) {
    if (!shell?.viewport || !d3 || !puzzle || !graphApi) throw new Error('Connect view requires shell, d3, puzzle, and graph API.');

    shell.viewport.innerHTML = `<div class="connect-v2-stage">
      <div class="connect-v2-map-heading" aria-hidden="true"><span>NETWORK / GEOGRAPHIC RELATIONS</span><strong>SCHEMATIC CONNECTIONS ON MERCATOR MAP</strong></div>
      <svg class="connect-v2-map" viewBox="0 0 1000 650" role="img" aria-label="Connect network map: select connected places with pointer or keyboard"></svg>
      <div class="connect-v2-map-key" aria-label="Route and edge legend">
        <span><i class="key-current"></i>NEW / CURRENT ROUTE</span>
        <span class="key-original-wrap"><i class="key-original"></i>LOCKED ORIGINAL · DASHED</span>
        <span class="key-added-wrap"><i class="key-added"></i>NEW EDGE · SOLID</span>
        <span class="key-removed-wrap"><i class="key-removed"></i>REMOVED EDGE · DASHED</span>
      </div></div>`;
    const svg = d3.select(shell.viewport.querySelector('.connect-v2-map'));
    const projection = d3.geoMercator().fitExtent([[90,90],[910,570]],{
      type:'MultiPoint',
      coordinates:puzzle.nodes.map(id => [nodes[id].lon,nodes[id].lat])
    });
    const geoPath = d3.geoPath(projection);

    svg.append('path').datum(land).attr('class','connect-v2-land').attr('d',geoPath);
    const edgeLayer = svg.append('g').attr('class','connect-v2-edges');
    const ghostLayer = svg.append('g').attr('class','connect-v2-route-ghost');
    const routeLayer = svg.append('g').attr('class','connect-v2-route');
    const invalidLayer = svg.append('g').attr('class','connect-v2-invalid-layer');
    const nodeLayer = svg.append('g').attr('class','connect-v2-nodes');

    const point = id => projection([nodes[id].lon,nodes[id].lat]);
    const segment = ([a,b]) => {
      const p1=point(a), p2=point(b);
      return { a,b,x1:p1[0],y1:p1[1],x2:p2[0],y2:p2[1],key:graphApi.edgeKey(a,b) };
    };
    const routeSegments = route => (route || []).slice(1).map((id,index) => segment([route[index],id]));

    function unionEdges(snapshot) {
      const current = snapshot.graph?.edges || [];
      if (!snapshot.previousGraph) return current.map(segment);
      const byKey = new Map();
      snapshot.previousGraph.edges.forEach(edge => byKey.set(graphApi.edgeKey(...edge),{ edge, was:true, now:false }));
      current.forEach(edge => {
        const key=graphApi.edgeKey(...edge);
        const item=byKey.get(key) || { edge, was:false, now:false };
        item.now=true;
        byKey.set(key,item);
      });
      return [...byKey.entries()].map(([key,item]) => ({ ...segment(item.edge), key, was:item.was, now:item.now }));
    }

    function renderEdges(snapshot) {
      const data=unionEdges(snapshot);
      edgeLayer.selectAll('line').data(data,d=>d.key).join(
        enter => enter.append('line')
          .attr('x1',d=>d.x1).attr('y1',d=>d.y1).attr('x2',d=>d.x2).attr('y2',d=>d.y2)
          .attr('class','connect-v2-edge'),
        update => update,
        exit => exit.remove()
      )
        .attr('x1',d=>d.x1).attr('y1',d=>d.y1).attr('x2',d=>d.x2).attr('y2',d=>d.y2)
        .attr('class',d => {
          let cls='connect-v2-edge';
          if (snapshot.previousGraph) {
            if (d.was && !d.now) cls += ' is-removed';
            if (!d.was && d.now) cls += ' is-added';
          }
          return cls;
        });
    }

    function renderRoutes(snapshot) {
      const ghost = ['transforming','adapting','routeReady2','result'].includes(snapshot.state)
        ? routeSegments(snapshot.originalRoute)
        : [];
      ghostLayer.selectAll('line').data(ghost,d=>d.key).join('line')
        .attr('class','connect-v2-route-line is-ghost')
        .attr('x1',d=>d.x1).attr('y1',d=>d.y1).attr('x2',d=>d.x2).attr('y2',d=>d.y2);

      routeLayer.selectAll('line').data(routeSegments(snapshot.route),d=>`${d.key}-${d.a}`).join('line')
        .attr('class','connect-v2-route-line')
        .attr('x1',d=>d.x1).attr('y1',d=>d.y1).attr('x2',d=>d.x2).attr('y2',d=>d.y2);
    }

    function renderNodes(snapshot) {
      const editable=['planning','routeReady','adapting','routeReady2'].includes(snapshot.state);
      const current=snapshot.route[snapshot.route.length-1];
      const available=editable ? (snapshot.graph?.adjacency?.get(current) || new Set()) : new Set();
      const routeSet=new Set(snapshot.route);
      const data=puzzle.nodes.map(id => ({ id, ...nodes[id], xy:point(id) }));
      const joined=nodeLayer.selectAll('g.connect-v2-node').data(data,d=>d.id).join(enter => {
        const g=enter.append('g')
          .attr('class','connect-v2-node')
          .attr('role','button')
          .attr('data-keyboard-activation','1')
          .on('click',(event,d)=>{
            if(event.currentTarget.getAttribute('aria-disabled')==='true') return;
            callbacks.onNode?.(d.id);
          })
          .on('keydown',(event,d)=>{
            if(event.key!=='Enter' && event.key!==' ') return;
            if(event.currentTarget.getAttribute('aria-disabled')==='true') return;
            event.preventDefault();
            callbacks.onNode?.(d.id);
          });
        g.append('circle').attr('r',11);
        g.append('circle').attr('class','connect-v2-node-ring').attr('r',18);
        g.append('text').attr('class','connect-v2-node-code').attr('y',-23).attr('text-anchor','middle');
        return g;
      });

      joined
        .attr('transform',d=>`translate(${d.xy[0]},${d.xy[1]})`)
        .attr('tabindex',editable?0:-1)
        .attr('aria-disabled',editable?'false':'true')
        .attr('aria-label',d=>`${d.label}${d.id===puzzle.target?', destination':''}`)
        .attr('class',d=>{
          let cls='connect-v2-node';
          if(!editable) cls+=' is-disabled';
          if(d.id===puzzle.source) cls+=' is-source';
          if(d.id===puzzle.target) cls+=' is-target';
          if(d.id===current) cls+=' is-current';
          if(routeSet.has(d.id)) cls+=' is-route';
          if(available.has(d.id) && d.id!==current) cls+=' is-available';
          return cls;
        });
      joined.select('.connect-v2-node-code').text(d=>d.id);
    }

    function actionButton(label,onClick,{secondary=false,disabled=false}={}) {
      const button=document.createElement('button');
      button.type='button';
      button.className=`connect-v2-action${secondary?' is-secondary':''}`;
      button.textContent=label;
      button.disabled=disabled;
      button.addEventListener('click',onClick);
      return button;
    }

    function renderHud(snapshot) {
      const hops=Math.max(0,snapshot.route.length-1);
      const changed=Boolean(snapshot.previousGraph);
      const originalHops=snapshot.firstHops;
      const optimal=snapshot.state==='result' && snapshot.changedBest ? snapshot.changedBest.length-1 : null;
      const earlier=graphApi.edgeSet(snapshot.previousGraph);
      const current=graphApi.edgeSet(snapshot.graph);
      const added=[...current].filter(key=>!earlier.has(key)).length;
      const removed=[...earlier].filter(key=>!current.has(key)).length;
      const original=(snapshot.originalRoute || []).join(' → ');
      const route=snapshot.route.join(' → ');
      shell.hud.innerHTML = `
        <div class="connect-v2-goal"><span>ROUTE / MISSION</span><strong>${nodes[puzzle.source].label.toUpperCase()} → ${nodes[puzzle.target].label.toUpperCase()}</strong></div>
        <div class="connect-v2-stat"><span>HOPS / LIMIT</span><strong>${hops} / ${puzzle.maxHops}</strong></div>
        <section class="connect-v2-evidence" aria-label="Connection rule and route evidence">
          <span class="connect-v2-evidence-label">NETWORK RULE</span>
          <h2>${snapshot.rule.label}</h2>
          <p>${snapshot.rule.type==='shared-border'
            ? 'Only land-border adjacency makes a legal step; touching country boundaries form the graph.'
            : 'A legal step connects places with great-circle separation at most 1,200 km. This does not mean the drawn line is a flight route.'}</p>
          <div class="connect-v2-evidence-pair"><span>EDGE CONDITION</span><strong>${snapshot.rule.type==='shared-border'?'SHARED LAND BORDER':'≤ 1,200 KM GREAT CIRCLE'}</strong></div>
          <div class="connect-v2-evidence-pair"><span>PATH / CURRENT</span><strong>${route}</strong></div>
          ${changed ? `<div class="connect-v2-evidence-pair"><span>ORIGINAL LOCKED / ${originalHops} HOPS</span><strong>${original}</strong></div>
              <div class="connect-v2-edge-deltas"><div><span>NEW CONNECTIONS</span><strong>+${added}</strong></div><div><span>REMOVED CONNECTIONS</span><strong>−${removed}</strong></div></div>
              <div class="connect-v2-evidence-pair"><span>OLD ROUTE UNDER NEW RULE</span><strong>${snapshot.oldRouteValid?'STILL VALID':'BROKEN'}</strong></div>`
            : '<div class="connect-v2-evidence-pair"><span>ORIGINAL ROUTE</span><strong>NOT YET LOCKED</strong></div>'}
          ${changed && snapshot.state==='result' ? `<div class="connect-v2-evidence-pair is-result"><span>BEFORE → AFTER / HOPS</span><strong>${originalHops} → ${snapshot.finalHops}</strong></div>
              <div class="connect-v2-evidence-pair is-result"><span>OPTIMAL / MINIMUM HOPS</span><strong>${optimal===null?'UNAVAILABLE':optimal}</strong></div>
              <p class="connect-v2-comparison-note">${optimal===snapshot.finalHops?'Current route achieves the shortest possible number of hops.':'Current route is valid but not the shortest possible.'}</p>`
            : ''}
          <p class="connect-v2-method-note">The geographical background locates nodes; line segments show graph edges, not measured travel paths.</p>
        </section>
        <section class="connect-v2-node-legend" aria-label="Network node states"><span>NODE STATES</span><div><i class="is-start"></i>START · RING</div><div><i class="is-current"></i>CURRENT · FILLED</div><div><i class="is-next"></i>AVAILABLE · DASHED</div><div><i class="is-goal"></i>GOAL · TARGET RING</div></section>`;
    }

    function renderOverlay(snapshot) {
      shell.overlay.innerHTML='';
      const panel=document.createElement('div');
      panel.className='connect-v2-overlay-panel';

      if (snapshot.state === 'planning' || snapshot.state === 'routeReady') {
        panel.innerHTML='<span class="connect-v2-task-kicker">ROUTE 01 / BUILD</span><h2>Connect the places</h2><p>Choose a legal adjacent place on the map. Reach the destination within the hop limit, then lock your path.</p>';
        const actions=document.createElement('div');
        actions.className='connect-v2-actions';
        if(snapshot.route.length>1) actions.appendChild(actionButton('UNDO',callbacks.onUndo,{secondary:true}));
        if(snapshot.state==='routeReady') actions.appendChild(actionButton('LOCK ROUTE',callbacks.onLock));
        panel.appendChild(actions);
      } else if (snapshot.state === 'locked') {
        panel.innerHTML=`<span class="connect-v2-task-kicker">ROUTE 01 / LOCKED</span><h2>${snapshot.firstHops} hops recorded</h2><p>Your original route will remain visible when the connection rule changes.</p>`;
        panel.appendChild(actionButton('CHANGE THE RULE',callbacks.onRuleChange));
      } else if (snapshot.state === 'transforming') {
        panel.classList.add('is-center','is-rule-change');
        panel.innerHTML=`<span class="connect-v2-task-kicker">RULE CHANGE / OBSERVE</span><strong>${snapshot.rule.label}</strong><p>Solid additions and dashed removals update the graph. Your locked route is retained for comparison.</p>`;
      } else if (snapshot.state === 'adapting' || snapshot.state === 'routeReady2') {
        panel.innerHTML=`<span class="connect-v2-task-kicker">ROUTE 02 / REVISE</span><h2>${snapshot.oldRouteValid?'Can you do better?':'Your old route broke.'}</h2><p>${snapshot.oldRouteValid?'Find a shorter route under the new rule.':'Build a new valid route under the new rule.'} The dashed path is your locked original.</p>`;
        const actions=document.createElement('div');
        actions.className='connect-v2-actions';
        if(snapshot.route.length>1) actions.appendChild(actionButton('UNDO',callbacks.onUndo,{secondary:true}));
        if(snapshot.state==='routeReady2') actions.appendChild(actionButton('LOCK ROUTE',callbacks.onFinalLock));
        panel.appendChild(actions);
      } else if (snapshot.state === 'result') {
        const optimal=snapshot.changedBest ? snapshot.changedBest.length-1 : null;
        const optimalLabel=optimal===snapshot.finalHops?'OPTIMAL':`BEST POSSIBLE ${optimal ?? '—'}`;
        panel.classList.add('is-center','is-result');
        panel.innerHTML=`<span class="connect-v2-task-kicker">RESULT / COMPARE</span><div class="connect-v2-result-number">${snapshot.finalHops} HOPS</div><strong>${optimalLabel}</strong><p>${puzzle.insight[0]} ${puzzle.insight[1]}</p>`;
        panel.appendChild(actionButton('PLAY AGAIN',callbacks.onRestart,{secondary:true}));
      }

      const invalid=document.createElement('p');
      invalid.className='connect-v2-error';
      invalid.setAttribute('role','status');
      invalid.setAttribute('aria-live','polite');
      panel.appendChild(invalid);
      shell.overlay.appendChild(panel);
    }

    function render(snapshot) {
      shell.setState(snapshot.state);
      shell.setStatus(snapshot.state === 'transforming' ? 'RULE CHANGING' : '');
      renderEdges(snapshot);
      renderRoutes(snapshot);
      renderNodes(snapshot);
      renderHud(snapshot);
      renderOverlay(snapshot);
      shell.root.dataset.connectRule=snapshot.rule.type;
      shell.root.dataset.connectComparison=snapshot.previousGraph?'true':'false';
    }

    function showInvalid({ from, to, reason }) {
      if (!from || !to) return;
      const message=reason==='MOVE_LIMIT'?'MOVE LIMIT':'NO VALID CONNECTION';
      const a=point(from), b=point(to);
      shell.setStatus(message);
      const status=shell.overlay.querySelector('.connect-v2-error');
      if(status) {
        status.textContent=reason==='MOVE_LIMIT'
          ? 'MOVE LIMIT — route unchanged. Undo or choose a shorter legal sequence.'
          : `NO VALID CONNECTION — ${from} → ${to} is not legal under ${shell.root.dataset.connectRule==='shared-border'?'the shared land-border rule':'the 1,200 km great-circle rule'}. Route unchanged.`;
      }
      invalidLayer.selectAll('*').remove();
      invalidLayer.append('line')
        .attr('class','connect-v2-invalid-edge')
        .attr('x1',a[0]).attr('y1',a[1]).attr('x2',b[0]).attr('y2',b[1]);
      const label=invalidLayer.append('text')
        .attr('class','connect-v2-invalid-label')
        .attr('x',(a[0]+b[0])/2).attr('y',(a[1]+b[1])/2-10)
        .attr('text-anchor','middle')
        .text(message);
      requestAnimationFrame(()=>invalidLayer.classed('is-visible',true));
      window.setTimeout(()=>{
        invalidLayer.classed('is-visible',false);
        shell.setStatus('');
        window.setTimeout(()=>invalidLayer.selectAll('*').remove(),220);
      },650);
      return label;
    }

    return { render, showInvalid };
  }

  window.GeoPlayConnectView = { create };
})();