(() => {
  'use strict';

  const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const SIZE = 512;
  const TRIALS = [
    {
      id: 'three-regions', title: 'FORM THREE REGIONS', target: { type: 'components', value: 3 },
      peaks: [[.22,.30,.78,.10,.11],[.67,.28,.72,.11,.11],[.48,.72,.66,.11,.10]], noise:.01,
      domain:[.18,.68], start:.45, resolution:128,
      perturb:{ type:'resolution', from:128, to:32 }
    },
    {
      id: 'two-peaks', title: 'KEEP TWO PEAKS SEPARATE', target: { type: 'components', value: 2 },
      peaks: [[.41,.50,.78,.07,.14],[.59,.50,.75,.07,.14]], noise:0,
      domain:[.62,.76], start:.69, resolution:128,
      perturb:{ type:'smoothing', from:0, to:3 }
    },
    {
      id: 'small-island', title: 'KEEP THE SMALL ISLAND', target: { type: 'components', value: 2 },
      peaks: [[.34,.55,.84,.16,.16],[.735,.315,.58,.025,.025]], noise:0,
      domain:[.36,.56], start:.50, resolution:128,
      perturb:{ type:'resolution', from:128, to:16 }
    }
  ];

  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  function fieldValue(spec, x, y) {
    let value = 0;
    spec.peaks.forEach(([cx,cy,a,sx,sy]) => {
      const dx=(x-cx)/sx, dy=(y-cy)/sy;
      value += a * Math.exp(-.5 * (dx*dx + dy*dy));
    });
    value += spec.noise * (Math.sin((x*19.7 + y*7.3) * Math.PI) + Math.cos((y*17.1 - x*5.9) * Math.PI)) * .5;
    return clamp(value, 0, 1);
  }

  function sample(spec, n) {
    const values = new Float32Array(n*n);
    for (let y=0;y<n;y++) for (let x=0;x<n;x++) values[y*n+x] = fieldValue(spec,(x+.5)/n,(y+.5)/n);
    return values;
  }

  function smooth(values, n, radius) {
    if (!radius) return values;
    let src = Float32Array.from(values), dst = new Float32Array(values.length);
    for (let pass=0; pass<2; pass++) {
      for (let y=0;y<n;y++) for (let x=0;x<n;x++) {
        let sum=0,count=0;
        for (let oy=-radius;oy<=radius;oy++) for (let ox=-radius;ox<=radius;ox++) {
          const xx=x+ox, yy=y+oy;
          if (xx>=0&&xx<n&&yy>=0&&yy<n) { sum+=src[yy*n+xx]; count++; }
        }
        dst[y*n+x]=sum/count;
      }
      [src,dst]=[dst,src];
    }
    return src;
  }

  function measure(values, n, threshold, contour) {
    let inside=0;
    values.forEach(v => { if (v >= threshold) inside++; });
    let perimeter=0;
    (contour?.coordinates || []).forEach(poly => poly.forEach(ring => {
      for (let i=1;i<ring.length;i++) perimeter += Math.hypot(ring[i][0]-ring[i-1][0], ring[i][1]-ring[i-1][1]);
    }));
    return { components: contour?.coordinates?.length || 0, area: inside/(n*n), perimeter: perimeter/n };
  }

  async function mountBound({ signal, stage } = {}) {
    const GeoPlay = window.GeoPlay;
    if (!GeoPlay?.core || !GeoPlay?.shell || !GeoPlay?.trace) throw new Error('GeoPlay runtime incomplete.');
    GeoPlay.core.ensureStyle('play/play.css?v=20261002b', 'play');
    await GeoPlay.core.loadScript(D3_CDN, 'd3');
    if (signal?.aborted) return () => {};

    const d3=window.d3;
    const shell=GeoPlay.shell.create(stage,{kind:'bound',triad:'FIELD / THRESHOLD / SCALE'});
    const machine=GeoPlay.core.createStateMachine({initial:'observe',onChange:s=>shell.setState(s)});
    let trialIndex=0, threshold=0, resolution=128, smoothing=0, values=null, contour=null, result=null, before=null;

    const wrap=document.createElement('div'); wrap.className='bound-stage';
    const canvas=document.createElement('canvas'); canvas.width=SIZE; canvas.height=SIZE; canvas.className='bound-canvas';
    const svg=d3.select(wrap).append('svg').attr('class','bound-contours').attr('viewBox',`0 0 ${SIZE} ${SIZE}`);
    wrap.prepend(canvas); shell.field.appendChild(wrap);
    const ctx=canvas.getContext('2d');

    function renderField() {
      const image=ctx.createImageData(resolution,resolution);
      for(let i=0;i<values.length;i++) {
        const v=values[i], c=Math.round(18 + v*118);
        image.data[i*4]=c*.74; image.data[i*4+1]=c*.86; image.data[i*4+2]=c*.79; image.data[i*4+3]=255;
      }
      const off=document.createElement('canvas'); off.width=resolution; off.height=resolution;
      off.getContext('2d').putImageData(image,0,0);
      ctx.imageSmoothingEnabled=true; ctx.clearRect(0,0,SIZE,SIZE); ctx.drawImage(off,0,0,SIZE,SIZE);
    }

    function compute() {
      const spec=TRIALS[trialIndex];
      const raw=sample(spec,resolution); values=smooth(raw,resolution,smoothing);
      contour=d3.contours().size([resolution,resolution]).thresholds([threshold])(Array.from(values))[0] || {type:'MultiPolygon',coordinates:[]};
      result=measure(values,resolution,threshold,contour);
      renderField();
      const path=d3.geoPath(d3.geoIdentity().scale(SIZE/resolution));
      svg.selectAll('*').remove();
      svg.append('path').datum(contour).attr('class','bound-region').attr('d',path);
      svg.append('path').datum(contour).attr('class','bound-line').attr('d',path);
    }

    function sliderMarkup(spec) {
      return `<label class="bound-slider-label"><span>THRESHOLD</span><input class="bound-slider" type="range" min="${spec.domain[0]}" max="${spec.domain[1]}" step="0.005" value="${threshold}"></label>`;
    }

    function drawTrial() {
      const spec=TRIALS[trialIndex]; machine.set('observe'); threshold=spec.start; resolution=spec.resolution; smoothing=0; before=null;
      compute();
      shell.setTask(`<div class="play-kicker">FIELD</div><div class="play-pair"><span>TASK</span><strong>${spec.title}</strong></div>${sliderMarkup(spec)}<p>Move the rule. Read the geometry before the metrics.</p>`);
      const slider=shell.task.querySelector('.bound-slider');
      slider.addEventListener('input',()=>{ threshold=Number(slider.value); compute(); });
      shell.setReadout('');
      shell.setConditions([['FIELD','SYNTHETIC SCALAR'],['RESOLUTION',`${resolution} × ${resolution}`],['SMOOTHING','NONE'],['RULE','F(x,y) ≥ τ']]);
      shell.setFieldNote(`FIELD ${trialIndex+1} / ${TRIALS.length} · GEOMETRY FIRST, NUMBER SECOND`);
      shell.setActions([{label:'COMMIT',onClick:commit}]); requestAnimationFrame(()=>machine.set('judge'));
    }

    function commit() {
      if(machine.state!=='judge') return;
      machine.set('commit'); before={...result,resolution,smoothing,threshold};
      const target=TRIALS[trialIndex].target;
      const met=result.components===target.value;
      machine.set('compare');
      shell.setReadout(`<div class="play-kicker">${met?'CONDITION MET':'OBSERVED'}</div><div class="play-metrics"><div class="play-metric"><span>THRESHOLD</span><strong>${threshold.toFixed(3)}</strong></div><div class="play-metric"><span>COMPONENTS</span><strong>${result.components}</strong></div><div class="play-metric"><span>AREA</span><strong>${(result.area*100).toFixed(1)}%</strong></div></div>`);
      if(!met) { shell.setActions([{label:'REVISE',onClick:()=>{machine.set('judge');shell.setReadout('');shell.setActions([{label:'COMMIT',onClick:commit}]);}}]); return; }
      shell.setActions([{label:'CHANGE ONE CONDITION →',onClick:perturb}]);
    }

    function perturb() {
      machine.set('perturb'); const spec=TRIALS[trialIndex], p=spec.perturb;
      if(p.type==='resolution') resolution=p.to; else smoothing=p.to;
      compute();
      const perimeterChange=before.perimeter ? (result.perimeter-before.perimeter)/before.perimeter*100 : 0;
      const areaChange=before.area ? (result.area-before.area)/before.area*100 : 0;
      shell.setConditions([['THRESHOLD',`${threshold.toFixed(3)} · UNCHANGED`],[p.type==='resolution'?'RESOLUTION':'SMOOTHING',`${p.from} → ${p.to}`],['FIELD SOURCE','UNCHANGED']]);
      shell.setReadout(`<div class="play-kicker">EFFECT</div><div class="play-metrics"><div class="play-metric"><span>COMPONENTS</span><strong>${before.components} → ${result.components}</strong></div><div class="play-metric"><span>AREA</span><strong>${areaChange>=0?'+':''}${areaChange.toFixed(1)}%</strong></div><div class="play-metric"><span>PERIMETER</span><strong>${perimeterChange>=0?'+':''}${perimeterChange.toFixed(1)}%</strong></div></div>`);
      GeoPlay.trace.append({play:'bound',trialId:spec.id,judgment:{threshold:before.threshold},relation:{target:spec.target},result:{components:before.components,area:before.area},conditions:{before:{resolution:before.resolution,smoothing:before.smoothing},after:{resolution,smoothing}},effect:{components:[before.components,result.components],areaChange,perimeterChange}});
      shell.setFieldNote('SAME FIELD SOURCE · SAME THRESHOLD · ONE CONDITION CHANGED');
      shell.setActions([{label:trialIndex<TRIALS.length-1?'NEXT FIELD →':'VIEW TRACE →',onClick:()=>{ if(trialIndex<TRIALS.length-1){trialIndex++;drawTrial();}else showTrace(); }}]);
    }

    function showTrace() {
      machine.set('trace');
      const records=GeoPlay.trace.forPlay('bound').slice(-TRIALS.length);
      shell.field.innerHTML=`<div class="play-trace-field"><div class="play-kicker">YOUR TRACE</div><strong class="play-trace-title">BOUND</strong><p>Boundary is a result of a field, a rule, and an observation condition.</p></div>`;
      shell.setTask('<div class="play-kicker">TRACE</div><div class="play-pair"><strong>FIELD / THRESHOLD / SCALE</strong></div>');
      shell.setReadout(`<div class="play-metrics">${records.map(r=>`<div class="play-metric"><span>${r.trialId.toUpperCase().replaceAll('-',' ')}</span><strong>${r.effect.components?.join(' → ') || '—'} COMPONENTS</strong><em>${r.conditions.before.resolution!==r.conditions.after.resolution?'RESOLUTION CHANGED':'SMOOTHING CHANGED'}</em></div>`).join('')}</div>`);
      shell.setConditions([['TRACE','LOCAL ONLY'],['SCORE','NONE']]); shell.setActions([]);
    }

    drawTrial();
    return ()=>{ stage.innerHTML=''; };
  }

  function register() { const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{}; mounts.zone=mountBound; }
  window.GeoPlayBound={register,mount:mountBound}; register();
})();