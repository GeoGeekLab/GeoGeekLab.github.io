(() => {
  'use strict';

  function create({ shell, d3, land, nodes, puzzle, graphApi, callbacks = {} } = {}) {
    if (!shell?.viewport || !d3 || !puzzle || !graphApi) throw new Error('Connect view requires shell, d3, puzzle, and graph API.');

    shell.viewport.innerHTML = '<div class="connect-v2-stage"><svg class="connect-v2-map" viewBox="0 0 1000 650" role="img" aria-label="Connect network map"></svg></div>';
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
      if (snapshot.state !== 'transforming' || !snapshot.previousGraph) return current.map(segment);
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
          if (snapshot.state === 'transforming') {
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
      const current=snapshot.route[snapshot.route.length-1];
      const available=snapshot.graph?.adjacency?.get(current) || new Set();
      const routeSet=new Set(snapshot.route);
      const data=puzzle.nodes.map(id => ({ id, ...nodes[id], xy:point(id) }));
      const joined=nodeLayer.selectAll('g.connect-v2-node').data(data,d=>d.id).join(enter => {
        const g=enter.append('g')
          .attr('class','connect-v2-node')
          .attr('role','button')
          .attr('tabindex',0)
          .attr('data-keyboard-activation','1')
          .on('click',(_,d)=>callbacks.onNode?.(d.id))
          .on('keydown',(event,d)=>{
            if(event.key!=='Enter' && event.key!==' ') return;
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
        .attr('aria-label',d=>`${d.label}${d.id===puzzle.target?', destination':''}`)
        .attr('class',d=>{
          let cls='connect-v2-node';
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
      shell.hud.innerHTML = `
        <div class="connect-v2-goal"><span>GOAL</span><strong>${nodes[puzzle.source].label.toUpperCase()} → ${nodes[puzzle.target].label.toUpperCase()}</strong></div>
        <div class="connect-v2-stat"><span>HOPS</span><strong>${hops} / ${puzzle.maxHops}</strong></div>
        <div class="connect-v2-stat"><span>RULE</span><strong>${snapshot.rule.label}</strong></div>`;
    }

    function renderOverlay(snapshot) {
      shell.overlay.innerHTML='';
      const panel=document.createElement('div');
      panel.className='connect-v2-overlay-panel';

      if (snapshot.state === 'planning' || snapshot.state === 'routeReady') {
        panel.innerHTML='<p>BUILD A ROUTE THROUGH VALID CONNECTIONS.</p>';
        const actions=document.createElement('div');
        actions.className='connect-v2-actions';
        if(snapshot.route.length>1) actions.appendChild(actionButton('UNDO',callbacks.onUndo,{secondary:true}));
        if(snapshot.state==='routeReady') actions.appendChild(actionButton('LOCK ROUTE',callbacks.onLock));
        panel.appendChild(actions);
      } else if (snapshot.state === 'locked') {
        panel.innerHTML=`<div class="connect-v2-result-number">${snapshot.firstHops} HOPS</div><p>ROUTE LOCKED.</p>`;
        panel.appendChild(actionButton('CHANGE THE RULE',callbacks.onRuleChange));
      } else if (snapshot.state === 'transforming') {
        panel.classList.add('is-center','is-rule-change');
        panel.innerHTML=`<span>RULE CHANGE</span><strong>${snapshot.rule.label}</strong>`;
      } else if (snapshot.state === 'adapting' || snapshot.state === 'routeReady2') {
        panel.innerHTML=`<strong>${snapshot.oldRouteValid?'CAN YOU DO BETTER?':'YOUR OLD ROUTE BROKE.'}</strong><p>${snapshot.oldRouteValid?'Find a shorter route under the new rule.':'Build a new valid route under the new rule.'}</p>`;
        const actions=document.createElement('div');
        actions.className='connect-v2-actions';
        if(snapshot.route.length>1) actions.appendChild(actionButton('UNDO',callbacks.onUndo,{secondary:true}));
        if(snapshot.state==='routeReady2') actions.appendChild(actionButton('LOCK ROUTE',callbacks.onFinalLock));
        panel.appendChild(actions);
      } else if (snapshot.state === 'result') {
        const optimal=snapshot.changedBest ? snapshot.changedBest.length-1 : null;
        const optimalLabel=optimal===snapshot.finalHops?'OPTIMAL':`BEST POSSIBLE ${optimal ?? '—'}`;
        panel.classList.add('is-center','is-result');
        panel.innerHTML=`<div class="connect-v2-result-number">${snapshot.finalHops} HOPS</div><strong>${optimalLabel}</strong><p>${puzzle.insight[0]}<br>${puzzle.insight[1]}</p>`;
        panel.appendChild(actionButton('PLAY AGAIN',callbacks.onRestart,{secondary:true}));
      }

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
    }

    function showInvalid({ from, to, reason }) {
      if (!from || !to) return;
      const a=point(from), b=point(to);
      invalidLayer.selectAll('*').remove();
      invalidLayer.append('line')
        .attr('class','connect-v2-invalid-edge')
        .attr('x1',a[0]).attr('y1',a[1]).attr('x2',b[0]).attr('y2',b[1]);
      const label=invalidLayer.append('text')
        .attr('class','connect-v2-invalid-label')
        .attr('x',(a[0]+b[0])/2).attr('y',(a[1]+b[1])/2-10)
        .attr('text-anchor','middle')
        .text(reason==='MOVE_LIMIT'?'MOVE LIMIT':'NO CONNECTION');
      requestAnimationFrame(()=>invalidLayer.classed('is-visible',true));
      window.setTimeout(()=>{
        invalidLayer.classed('is-visible',false);
        window.setTimeout(()=>invalidLayer.selectAll('*').remove(),220);
      },650);
      return label;
    }

    return { render, showInvalid };
  }

  window.GeoPlayConnectView = { create };
})();