/* Earth Pulse / comparison and interaction layer v2.
 * Uses the active v1 data model. No implicit external queries or demo records.
 */
(() => {
  'use strict';
  if (window.GeoPulseWorkflowV2) return;
  const NS = 'http://www.w3.org/2000/svg';
  const style = document.createElement('link');
  style.rel='stylesheet';
  style.href=new URL('./pulse-workflow-v2.css?v=20261008b', import.meta.url).href;
  style.dataset.pulseWorkflowV2Style='1';
  if (!document.querySelector('link[data-pulse-workflow-v2-style]')) document.head.appendChild(style);
  const EARTH_R = 6371.0088;
  const DAY = 86400000;
  const $$ = (query,root=document) => [...root.querySelectorAll(query)];
  const $ = (query,root=document) => root.querySelector(query);
  const fmt = new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
  const utc = time => Number.isFinite(time) ? new Date(time).toISOString().replace('T',' ').slice(0,16)+' UTC' : '—';
  const datetimeValue = time => new Date(Math.floor(time/60000)*60000).toISOString().slice(0,16);
  const dateTime = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||'') ? Date.parse(value+':00Z') : NaN;
  const coordinate = (v,pos,neg) => Math.abs(v).toFixed(2)+'°'+(v<0?neg:pos);
  const latLon = event => coordinate(event.lat,'N','S')+' / '+coordinate(event.lon,'E','W');
  const num = val => val == null ? '—' : fmt.format(val);
  const node = (tag,attrs={},text) => {
    const item = document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([key,value]) => item.setAttribute(key,String(value)));
    if(text != null) item.textContent = String(text);
    return item;
  };
  const select = key => '[data-pc="'+key+'"]';
  const active = new WeakMap();

  function median(input) {
    const values = input.filter(Number.isFinite).sort((a,b)=>a-b);
    if (!values.length) return null;
    const i = Math.floor(values.length/2);
    return values.length%2 ? values[i] : (values[i-1]+values[i])/2;
  }

  function periodStats(records,durationMs) {
    const mags = records.map(e=>e.mag).filter(Number.isFinite);
    return {
      count:records.length,
      maxMagnitude:mags.length?Math.max(...mags):null,
      medianDepth:median(records.map(e=>e.depth)),
      recordsPerHour:durationMs>0 ? records.length/(durationMs/3600000):null
    };
  }

  function groupGrid(events,resolution) {
    const bins = new Map();
    for (const event of events) {
      const ix = Math.max(0,Math.min(360/resolution-1,Math.floor((event.lon+180)/resolution)));
      const iy = Math.max(0,Math.min(180/resolution-1,Math.floor((event.lat+90)/resolution)));
      const key = ix+':'+iy;
      if (!bins.has(key)) {
        const west = -180 + ix*resolution;
        const east = west+resolution;
        const south = -90 + iy*resolution;
        const north = south+resolution;
        const area = EARTH_R*EARTH_R*(resolution*Math.PI/180)*
          Math.abs(Math.sin(north*Math.PI/180)-Math.sin(south*Math.PI/180));
        bins.set(key,{key,ix,iy,west,east,south,north,area,count:0,events:[]});
      }
      const cell=bins.get(key);
      cell.count++;
      cell.events.push(event);
    }
    return bins;
  }

  function mount(workspace) {
    if (active.has(workspace)) return;
    const context = workspace._pulseWorkflowContext;
    if (!context || !context.state) return;
    const {state,svg}=context;
    const side = $('.pw-side',workspace);
    const map = $('.pw-map-column',workspace);
    const dots = $('.pw-dots',svg);
    if (!side || !map || !dots) return;

    const analysis = document.createElement('section');
    analysis.className='pw-section pw-analysis';
    analysis.innerHTML = [
      '<h3>04 · COMPARE TWO UTC WINDOWS</h3>',
      '<p>A and B are half-open UTC intervals [start, end). Both use the existing source, ROI and view filters. Periods must not overlap.</p>',
      '<div class="pw-fields pw-two">',
        '<label>A START · UTC<input type="datetime-local" data-pc="a-start"></label>',
        '<label>A END · UTC · EXCLUSIVE<input type="datetime-local" data-pc="a-end"></label>',
        '<label>B START · UTC<input type="datetime-local" data-pc="b-start"></label>',
        '<label>B END · UTC · EXCLUSIVE<input type="datetime-local" data-pc="b-end"></label>',
      '</div>',
      '<div class="pw-actions"><button type="button" data-pc="auto">SPLIT SOURCE IN HALF</button><button type="button" data-pc="apply">APPLY WINDOWS</button></div>',
      '<p class="pw-analysis-state" data-pc="compare-status" role="status" aria-live="polite">Load an event catalogue to enable comparison.</p>',
      '<div class="pw-comparison">',
        '<div><small>WINDOW A</small><strong data-pc="a-count">—</strong><span data-pc="a-detail">—</span></div>',
        '<div><small>WINDOW B</small><strong data-pc="b-count">—</strong><span data-pc="b-detail">—</span></div>',
      '</div>',
      '<p>Counts and observed records/hour describe these filtered catalogue windows only. They are not completeness-corrected seismicity rates or hazard estimates.</p>',
      '<h3>05 · TEMPORAL & DISTRIBUTION CHARTS</h3>',
      '<div class="pw-chart-wrap"><div class="pw-chart-head"><strong>TIME TREND</strong><small>12 RELATIVE ELAPSED-TIME BINS · A / B</small></div><svg class="pw-chart" data-pc="trend" viewBox="0 0 600 175" role="group" aria-label="A and B event counts by relative elapsed-time bin"></svg></div>',
      '<div class="pw-chart-wrap"><div class="pw-chart-head"><strong>MAGNITUDE DISTRIBUTION</strong><small>0.5 MAGNITUDE BINS · UNKNOWN INCLUDED</small></div><svg class="pw-chart" data-pc="magnitude" viewBox="0 0 600 175" role="group" aria-label="A and B earthquake magnitude histogram"></svg></div>',
      '<div class="pw-chart-wrap"><div class="pw-chart-head"><strong>DEPTH DISTRIBUTION</strong><small>SHALLOW / INTERMEDIATE / DEEP / UNKNOWN</small></div><svg class="pw-chart" data-pc="depth" viewBox="0 0 600 175" role="group" aria-label="A and B hypocentre depth histogram"></svg></div>',
      '<div class="pw-chart-legend"><span><i class="pw-key-a"></i>A</span><span><i class="pw-key-b"></i>B</span><span>Hover, focus or click a bar for its exact count.</span></div>',
      '<div class="pw-chart-inspector" data-pc="chart-readout" aria-live="polite">Hover or focus a bar to read its count and interval.</div>',
      '<h3>06 · MAP REPRESENTATION</h3>',
      '<div class="pw-fields pw-two">',
        '<label>DISPLAY<select data-pc="display"><option value="points">EVENT POINTS</option><option value="grid">AGGREGATION GRID</option></select></label>',
        '<label>GRID RESOLUTION<select data-pc="resolution"><option value="2">2° × 2°</option><option value="5">5° × 5°</option><option value="10" selected>10° × 10°</option><option value="20">20° × 20°</option></select></label>',
        '<label>GRID MEASURE<select data-pc="measure"><option value="count">RAW COUNT</option><option value="area">COUNT / 10⁶ KM²</option></select></label>',
        '<label>MAP DATA<select data-pc="scope"><option value="all">ALL FILTERED</option><option value="a">WINDOW A</option><option value="b">WINDOW B</option></select></label>',
      '</div>',
      '<p data-pc="grid-legend" aria-live="polite">Points: hover or focus to inspect; click to pin. Drag blank map to pan. Use wheel to zoom.</p>',
      '<div class="pw-actions"><button type="button" data-pc="zoom-in">ZOOM +</button><button type="button" data-pc="zoom-out">ZOOM −</button><button type="button" data-pc="zoom-reset">RESET VIEW</button></div>',
      '<p>Grid cells use a spherical surface-area approximation. Colour intensity uses one locked maximum across the A and B grids for comparison; no detection-completeness correction is applied.</p>',
      '<h3>07 · EVENT FINDER & ANALYSIS EXPORTS</h3>',
      '<label class="pw-search-label">EVENT ID / PLACE<input type="search" data-pc="find" placeholder="Search visible events (2+ characters)"></label>',
      '<div class="pw-found" data-pc="found" aria-live="polite">Search by USGS ID or place to locate overlapping points.</div>',
      '<div class="pw-actions"><button type="button" data-pc="charts-csv">EXPORT CHARTS CSV</button><button type="button" data-pc="grid-csv">EXPORT A/B GRID CSV</button></div>',
      '<p>Chart and grid CSVs hold numeric A/B aggregates. Export the first-round MANIFEST JSON and selected event records with them for provenance.</p>'
    ].join('');
    const exportSection = $$('.pw-section',side).find(el=>el.textContent?.includes('04 · EXPORT'));
    if (exportSection) {
      const title = $('h3',exportSection);
      if (title) title.textContent='08 · EXPORT';
      exportSection.before(analysis);
    } else side.appendChild(analysis);

    const detail = document.createElement('section');
    detail.className='pw-hover-detail';
    detail.setAttribute('aria-live','polite');
    detail.textContent='Move the pointer over an earthquake point, or use Tab to focus one. Click to keep its full record visible.';
    const selected = $('.pw-selected',map);
    (selected || map.lastElementChild)?.after(detail);

    const floating = document.createElement('div');
    floating.className='pw-floating-tip';
    floating.hidden=true;
    floating.setAttribute('role','tooltip');
    workspace.appendChild(floating);

    const gridGroup=node('g',{'class':'pw-comparison-grid','aria-label':'Configurable earthquake grid'});
    svg.insertBefore(gridGroup,dots);

    const el = key => $(select(key),analysis);
    const chartReadout=el('chart-readout');
    const gridLegend=el('grid-legend');
    const listeners=[];
    const listen=(target,event,fn,options)=>{
      target.addEventListener(event,fn,options);
      listeners.push(()=>target.removeEventListener(event,fn,options));
    };
    let periods=null,latest={a:[],b:[]},currentGrid=new Map();
    let lastDatasetKey='',pinnedId=null,gridPin=null,hovered=null;
    let maxShared=0, drag=null, chartBins={trend:[],magnitude:[],depth:[]};
    let drawQueued=false;

    function tell(value,error=false) {
      el('compare-status').textContent=value;
      el('compare-status').dataset.error=error?'true':'false';
    }

    function detailEvent(event,locked=false) {
      if (!event) {detail.textContent='Select an event to read its source fields.';return;}
      detail.replaceChildren();
      const top=document.createElement('strong');
      top.textContent=(locked?'PINNED · ':'EVENT · ')+event.place;
      detail.append(top);
      const lines=[
        'ID: '+(event.id||'—')+' · M '+(event.mag==null?'—':event.mag.toFixed(2))+' ('+(event.magType||'type unknown')+')',
        'ORIGIN: '+utc(event.time)+' · DEPTH: '+(event.depth==null?'—':event.depth+' km'),
        'COORDINATES: '+latLon(event)+' · STATUS: '+event.status,
        'EVENT TYPE: '+event.eventType+' · REVISED: '+utc(event.updated)
      ];
      lines.forEach(t=>{const line=document.createElement('span');line.textContent=t;detail.append(line);});
      if (event.url) {
        const anchor=document.createElement('a');
        anchor.href=event.url;anchor.target='_blank';anchor.rel='noopener noreferrer';
        anchor.textContent='OPEN ORIGINAL USGS EVENT ↗';
        detail.append(anchor);
      }
    }

    function tooltip(text,event,rect) {
      floating.textContent=text;
      floating.hidden=false;
      const x=rect?rect.left+rect.width/2:event.clientX;
      const y=rect?rect.top:event.clientY;
      floating.style.left=Math.max(12,Math.min(window.innerWidth-290,x+14))+'px';
      floating.style.top=Math.max(12,Math.min(window.innerHeight-110,y+16))+'px';
    }
    function hideTooltip() {floating.hidden=true;}

    function pointFromTarget(target) {
      if (!(target instanceof Element)) return null;
      const circle=target.closest('.pw-event');
      if (!circle || !dots.contains(circle)) return null;
      const index=Number(circle.dataset.pwIndex);
      return Number.isInteger(index)?state.visible[index]||null:null;
    }

    function autoWindows() {
      if (!state.events.length) {periods=null;return;}
      const times=state.events.map(e=>e.time);
      const earliest=Math.min(...times);
      const latestTime=Math.max(...times);
      let from=Math.floor((earliest-60000)/60000)*60000;
      let to=Math.ceil((latestTime+60000)/60000)*60000;
      if(to-from<240000)to=from+240000;
      const midpoint=Math.floor(((from+to)/2)/60000)*60000;
      periods={a:{start:from,end:midpoint},b:{start:midpoint,end:to}};
      fillPeriods();
    }
    function fillPeriods() {
      if(!periods)return;
      el('a-start').value=datetimeValue(periods.a.start);
      el('a-end').value=datetimeValue(periods.a.end);
      el('b-start').value=datetimeValue(periods.b.start);
      el('b-end').value=datetimeValue(periods.b.end);
    }
    function applyWindows() {
      const a={start:dateTime(el('a-start').value),end:dateTime(el('a-end').value)};
      const b={start:dateTime(el('b-start').value),end:dateTime(el('b-end').value)};
      if (![a.start,a.end,b.start,b.end].every(Number.isFinite) ||
        a.start>=a.end||b.start>=b.end) {tell('Invalid UTC window: each end must be later than its start.',true);return;}
      if(a.start<b.end&&b.start<a.end){tell('Comparison windows overlap. Select disjoint A and B ranges.',true);return;}
      periods={a,b};
      tell('A: '+utc(a.start)+' to '+utc(a.end)+' · B: '+utc(b.start)+' to '+utc(b.end));
      render();
    }
    function subset() {
      if(!periods)return {a:[],b:[]};
      return {
        a:state.visible.filter(e=>e.time>=periods.a.start&&e.time<periods.a.end),
        b:state.visible.filter(e=>e.time>=periods.b.start&&e.time<periods.b.end)
      };
    }
    function setStats() {
      const countA=periodStats(latest.a,periods?.a.end-periods?.a.start);
      const countB=periodStats(latest.b,periods?.b.end-periods?.b.start);
      [['a',countA],['b',countB]].forEach(([key,s])=>{
        el(key+'-count').textContent=num(s.count)+' EVENTS';
        el(key+'-detail').textContent='MAX '+(s.maxMagnitude==null?'—':'M'+s.maxMagnitude.toFixed(1))+
          ' · MED DEPTH '+(s.medianDepth==null?'—':num(s.medianDepth)+' km')+
          ' · '+(s.recordsPerHour==null?'—':num(s.recordsPerHour))+' records/h';
      });
    }

    function renderBars(svg,bins) {
      svg.replaceChildren();
      if (!bins.length) return;
      const count=bins.length;
      const max=Math.max(1,...bins.flatMap(bin=>[bin.a,bin.b]));
      const left=24,top=14,width=552,height=125;
      for(let k=0;k<=4;k++){
        const y=top+height*k/4;
        svg.append(node('line',{x1:left,y1:y,x2:left+width,y2:y,stroke:'#314b3d','stroke-width':'.8'}));
      }
      const widthPer=width/count;
      const rectWidth=Math.max(2,(widthPer-4)/2);
      bins.forEach((bin,index)=>{
        const gx=left+index*widthPer;
        ['a','b'].forEach((key,ki)=>{
          const value=bin[key],barHeight=value/max*height;
          const r=node('rect',{
            x:gx+2+ki*rectWidth,y:top+height-barHeight,
            width:rectWidth,height:Math.max(.5,barHeight),
            'class':'pw-comparison-bar pw-bar-'+key,
            tabindex:'0',role:'button','data-chart-series':key,
            'aria-label':bin.label+'; window '+key.toUpperCase()+': '+value+' events',
          });
          const description=bin.label+' · '+(key==='a'?'A':'B')+': '+value+' event'+(value===1?'':'s')+
            (bin.windows&&bin.windows[key]?' · '+bin.windows[key]:'');
          const pin=()=>{chartReadout.textContent='SELECTED · '+description;};
          const show=event=>{
            if (!chartReadout.textContent.startsWith('SELECTED · ')) chartReadout.textContent=description;
            tooltip(description,event,r.getBoundingClientRect());
          };
          r.addEventListener('pointerenter',show);
          r.addEventListener('pointermove',event=>tooltip(description,event,r.getBoundingClientRect()));
          r.addEventListener('pointerleave',hideTooltip);
          r.addEventListener('focus',show);
          r.addEventListener('blur',hideTooltip);
          r.addEventListener('click',pin);
          r.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pin();}});
          const title=node('title',{},description);
          r.append(title);
          svg.append(r);
        });
        if(count<=14 || index%2===0){
          svg.append(node('text',{x:gx+widthPer/2,y:158,'text-anchor':'middle','class':'pw-chart-tick'},bin.tick));
        }
      });
      svg.append(node('text',{x:6,y:15,'class':'pw-chart-tick'},String(max)));
      svg.append(node('text',{x:6,y:141,'class':'pw-chart-tick'},'0'));
    }

    function charts() {
      const snapshots=latest;
      const trend=[];
      for(let i=0;i<12;i++){
        const bin={label:'Relative interval '+(i+1)+'/12',tick:i===0?'0%':i===11?'100%':'',a:0,b:0,windows:{}};
        ['a','b'].forEach(key=>{
          const time=periods[key];
          const start=time.start+(time.end-time.start)*i/12;
          const end=time.start+(time.end-time.start)*(i+1)/12;
          bin[key]=snapshots[key].filter(e=>e.time>=start&&e.time<end).length;
          bin.windows[key]=utc(start)+' to '+utc(end);
        });
        trend.push(bin);
      }
      renderBars(el('trend'),trend);

      const values=latest.a.concat(latest.b).map(e=>e.mag).filter(Number.isFinite);
      let minMag=values.length?Math.floor(Math.min(...values)*2)/2:0;
      let maxMag=values.length?Math.floor(Math.max(...values)*2)/2:minMag;
      const magBins=[];
      for(let mag=minMag;mag<=maxMag+0.001;mag+=.5){
        const bin={label:'Magnitude '+mag.toFixed(1)+' to '+(mag+.5).toFixed(1),tick:mag.toFixed(1),a:0,b:0};
        ['a','b'].forEach(key=>bin[key]=latest[key].filter(e=>e.mag!=null&&e.mag>=mag&&e.mag<mag+.5).length);
        magBins.push(bin);
      }
      magBins.push({label:'Magnitude unavailable',tick:'?',a:latest.a.filter(e=>e.mag==null).length,b:latest.b.filter(e=>e.mag==null).length});
      renderBars(el('magnitude'),magBins);
      const categories=[
        {label:'Shallow depth <70 km',tick:'<70',ok:d=>d!=null&&d<70},
        {label:'Intermediate depth 70–299.9 km',tick:'70–300',ok:d=>d!=null&&d>=70&&d<300},
        {label:'Deep depth ≥300 km',tick:'≥300',ok:d=>d!=null&&d>=300},
        {label:'Depth unknown',tick:'?',ok:d=>d==null}
      ];
      chartBins={trend,magnitude:magBins,depth:categories.map(category=>({
        label:category.label,tick:category.tick,
        a:latest.a.filter(e=>category.ok(e.depth)).length,
        b:latest.b.filter(e=>category.ok(e.depth)).length
      }))};
      renderBars(el('depth'),chartBins.depth);

    }

    function gridValue(cell,measure) {
      return measure==='area'?(cell.area>0?cell.count/cell.area*1000000:0):cell.count;
    }

    function renderGrid() {
      const enabled=el('display').value==='grid';
      const scope=el('scope').value;
      const resolution=Number(el('resolution').value);
      const measure=el('measure').value;
      dots.style.display=enabled?'none':'';
      gridGroup.replaceChildren();
      currentGrid.clear();
      gridPin=null;
      if(!enabled){
        gridLegend.textContent='POINT MODE · '+state.visible.length+' filtered records. Hover/focus or click points. Scroll to zoom, drag blank map to pan.';
        return;
      }
      const cellsA=groupGrid(latest.a,resolution);
      const cellsB=groupGrid(latest.b,resolution);
      const cellsCurrent=groupGrid(scope==='a'?latest.a:scope==='b'?latest.b:state.visible,resolution);
      const comparable=scope==='all'?cellsCurrent:[...cellsA.values(),...cellsB.values()];
      const max=Math.max(1e-10,...(comparable instanceof Map?[...comparable.values()]:comparable).map(c=>gridValue(c,measure)));
      maxShared=max;
      for(const cell of cellsCurrent.values()){
        const value=gridValue(cell,measure);
        const r=node('rect',{
          x:cell.ix*resolution*1000/360,
          y:500-(cell.iy+1)*resolution*500/180,
          width:resolution*1000/360,height:resolution*500/180,
          'class':'pw-grid-cell',
          'data-cell':cell.key,role:'button',tabindex:0,
          'aria-label':cell.count+' events in cell '+cell.west+' to '+cell.east+' longitude, '+cell.south+' to '+cell.north+' latitude'
        });
        const opacity=.15+.75*Math.sqrt(value/max);
        r.setAttribute('fill-opacity',opacity.toFixed(3));
        r.append(node('title',{},cell.count+' events; '+num(value)+' '+(measure==='area'?'per million square kilometres':'count')));
        gridGroup.append(r);
        currentGrid.set(cell.key,cell);
      }
      gridLegend.textContent='GRID '+resolution+'° · '+(scope==='all'?'ALL FILTERED':'WINDOW '+scope.toUpperCase())+
        ' · '+(measure==='area'?'events/10⁶ km²':'raw events')+
        ' · colour max '+num(max)+' (shared A/B scale when comparing). Hover or focus any occupied cell.';
    }

    function detailCell(cell,locked=false) {
      detail.replaceChildren();
      const head=document.createElement('strong');
      head.textContent=(locked?'PINNED · ':'CELL · ')+cell.count+' records · '+
        coordinate(cell.west,'E','W')+' to '+coordinate(cell.east,'E','W');
      detail.append(head);
      const line=document.createElement('span');
      line.textContent=coordinate(cell.south,'N','S')+' to '+coordinate(cell.north,'N','S')+
        ' · ≈ '+num(cell.area)+' km² · '+num(gridValue(cell,el('measure').value))+
        (el('measure').value==='area'?' records/10⁶ km²':' records');
      detail.append(line);
      const sample=document.createElement('span');
      sample.textContent='Example records ('+Math.min(5,cell.events.length)+' of '+cell.events.length+'):';
      detail.append(sample);
      for(const event of cell.events.slice(0,5)){
        const button=document.createElement('button');
        button.type='button';button.className='pw-cell-event';
        button.textContent=(event.mag==null?'M?':'M'+event.mag.toFixed(1))+' · '+event.place+' · '+utc(event.time);
        button.addEventListener('click',()=>{pinnedId=event.id;detailEvent(event,true);});
        detail.append(button);
      }
    }

    function render() {
      const key=state.url+'|'+state.fetchedAt+'|'+state.events.length;
      if(state.source && key!==lastDatasetKey){
        lastDatasetKey=key;
        autoWindows();
        tell('Two non-overlapping half-open UTC windows. Change their bounds and apply to compare.');
      }
      if(!state.source || !periods){
        latest={a:[],b:[]};
        gridGroup.replaceChildren();
        return;
      }
      latest=subset();
      setStats();
      charts();
      renderGrid();
      if(el('find').value) findEvents();
      if(pinnedId){
        const keep=state.visible.find(e=>e.id===pinnedId);
        if(keep)detailEvent(keep,true); else {pinnedId=null;detail.textContent='The selected event is no longer in the visible set.';}
      }
    }


    function csvText(value) {
      let input=value==null?'':String(value);
      if (/^[=+\-@\t\r\n]/.test(input)) input="'"+input;
      return '"'+input.replace(/"/g,'""')+'"';
    }
    function saveCsv(label,columns,rows) {
      const data='\ufeff'+[columns,...rows].map(row=>row.map(csvText).join(',')).join('\r\n')+'\r\n';
      const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));
      const link=document.createElement('a');
      link.download='pulse-'+label+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.csv';
      link.href=url;
      document.body.appendChild(link);
      link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    function exportCharts() {
      if(!state.source||!periods)return;
      const rows=[];
      for(const [chart,bins] of Object.entries(chartBins)) {
        for(const bin of bins) {
          rows.push([chart,bin.label,bin.a,bin.b,bin.windows?.a||'',bin.windows?.b||'']);
        }
      }
      saveCsv('comparison-charts',['chart','category','count_A','count_B','interval_A_UTC','interval_B_UTC'],rows);
    }
    function exportGrid() {
      if(!state.source||!periods)return;
      const resolution=Number(el('resolution').value);
      const cellsA=groupGrid(latest.a,resolution);
      const cellsB=groupGrid(latest.b,resolution);
      const keys=new Set([...cellsA.keys(),...cellsB.keys()]);
      const rows=[...keys].map(key=>{
        const a=cellsA.get(key),b=cellsB.get(key),cell=a||b;
        const densityA=a?gridValue(a,'area'):0;
        const densityB=b?gridValue(b,'area'):0;
        return [resolution,cell.west,cell.east,cell.south,cell.north,
          cell.area,a?.count||0,b?.count||0,densityA,densityB];
      }).sort((a,b)=>a[3]-b[3]||a[1]-b[1]);
      saveCsv('comparison-grid',
        ['resolution_degrees','west','east','south','north','approx_area_km2',
          'count_A','count_B','count_per_million_km2_A','count_per_million_km2_B'],rows);
    }
    function findEvents() {
      const root=el('found');
      root.replaceChildren();
      const query=el('find').value.trim().toLowerCase();
      if(query.length<2) {root.textContent='Type at least two characters to search the current filtered/ROI catalogue.';return;}
      const hits=state.visible.filter(e=>(e.place+' '+e.id).toLowerCase().includes(query)).slice(0,25);
      if(!hits.length) {root.textContent='No matching visible records.';return;}
      const intro=document.createElement('span');
      intro.textContent='Up to 25 matching records. Select one to inspect and locate it:';
      root.append(intro);
      hits.forEach(event=>{
        const button=document.createElement('button');
        button.type='button';
        button.textContent=event.id+' · '+event.place+' · '+(event.mag==null?'M?':'M'+event.mag.toFixed(1));
        button.addEventListener('click',()=>{
          pinnedId=event.id;gridPin=null;
          detailEvent(event,true);context.inspect(event);
          el('display').value='points';renderGrid();
          const width=Math.min(svg.viewBox.baseVal.width,250),height=width/2;
          const px=(event.lon+180)/360*1000;
          const py=(90-event.lat)/180*500;
          const x=Math.max(0,Math.min(1000-width,px-width/2));
          const y=Math.max(0,Math.min(500-height,py-height/2));
          svg.setAttribute('viewBox',[x,y,width,height].join(' '));
          const index=state.visible.indexOf(event);
          const marker=$('.pw-event[data-pw-index="'+index+'"]',dots);
          marker?.focus({preventScroll:true});
          map.scrollIntoView({block:'nearest',behavior:'auto'});
        });
        root.append(button);
      });
    }

    function mapEventInfo(target) {
      const point=target.closest?.('.pw-event');
      if(point){
        const event=pointFromTarget(point);
        return event ? {kind:'point',item:event} : null;
      }
      const cell=target.closest?.('.pw-grid-cell');
      if(cell) {
        const value=currentGrid.get(cell.dataset.cell);
        return value ? {kind:'cell',item:value}:null;
      }
      return null;
    }
    function showInfo(info,event,target) {
      if(!info)return;
      hovered=info;
      const description=info.kind==='point'
        ? (info.item.place+' · M'+num(info.item.mag)+' · depth '+num(info.item.depth)+' km · '+utc(info.item.time)+' · '+latLon(info.item))
        : (info.item.count+' earthquakes · '+info.item.west+'° to '+info.item.east+'° · '+info.item.south+'° to '+info.item.north+'°');
      if(info.kind==='point')detailEvent(info.item,pinnedId===info.item.id);
      else detailCell(info.item,gridPin===info.item.key);
      tooltip(description,event,target.getBoundingClientRect());
    }
    function clearHover() {
      hovered=null;hideTooltip();
      if(pinnedId) {
        const event=state.visible.find(e=>e.id===pinnedId);
        if(event)detailEvent(event,true);
      }else if(gridPin&&currentGrid.has(gridPin))detailCell(currentGrid.get(gridPin),true);
    }

    listen(svg,'pointerover',event=>{
      if(state.drawing)return;
      const info=mapEventInfo(event.target);
      if(info)showInfo(info,event,event.target.closest('.pw-event, .pw-grid-cell'));
    });
    listen(svg,'pointermove',event=>{
      if(state.drawing||!hovered)return;
      tooltip(floating.textContent,event);
    });
    listen(svg,'pointerout',event=>{
      const target=event.target.closest?.('.pw-event, .pw-grid-cell');
      if(target && !target.contains(event.relatedTarget))clearHover();
    });
    listen(svg,'focusin',event=>{
      const info=mapEventInfo(event.target);
      if(info)showInfo(info,event,event.target.closest('.pw-event, .pw-grid-cell'));
    });
    listen(svg,'focusout',event=>{
      if(event.target.closest?.('.pw-event, .pw-grid-cell'))clearHover();
    });
    function activateMapFeature(target) {
      const info=mapEventInfo(target);
      if(!info)return false;
      if(info.kind==='point') {
        pinnedId=info.item.id;gridPin=null;detailEvent(info.item,true);
        context.inspect(info.item);
      } else {
        gridPin=info.item.key;pinnedId=null;detailCell(info.item,true);
      }
      return true;
    }
    listen(svg,'click',event=>activateMapFeature(event.target));
    listen(svg,'keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      if(activateMapFeature(event.target))event.preventDefault();
    });

    function zoom(factor,relX=.5,relY=.5) {
      const view=svg.viewBox.baseVal;
      const width=Math.max(125,Math.min(1000,view.width*factor));
      const height=width/2;
      const x=Math.max(0,Math.min(1000-width,view.x+relX*(view.width-width)));
      const y=Math.max(0,Math.min(500-height,view.y+relY*(view.height-height)));
      svg.setAttribute('viewBox',[x,y,width,height].join(' '));
    }
    listen(svg,'wheel',event=>{
      if(state.drawing)return;
      event.preventDefault();
      const box=svg.getBoundingClientRect();
      zoom(event.deltaY>0?1.18:1/1.18,
        (event.clientX-box.left)/box.width,(event.clientY-box.top)/box.height);
    },{passive:false});
    listen(svg,'pointerdown',event=>{
      if(state.drawing||event.button!==0||mapEventInfo(event.target))return;
      const b=svg.getBoundingClientRect();
      drag={x:event.clientX,y:event.clientY,v:[svg.viewBox.baseVal.x,svg.viewBox.baseVal.y,svg.viewBox.baseVal.width,svg.viewBox.baseVal.height],w:b.width,h:b.height};
      svg.setPointerCapture(event.pointerId);
    });
    listen(svg,'pointermove',event=>{
      if(!drag)return;
      const [x,y,w,h]=drag.v;
      const nx=Math.max(0,Math.min(1000-w,x-(event.clientX-drag.x)*w/drag.w));
      const ny=Math.max(0,Math.min(500-h,y-(event.clientY-drag.y)*h/drag.h));
      svg.setAttribute('viewBox',[nx,ny,w,h].join(' '));
    });
    listen(svg,'pointerup',()=>{drag=null;});
    listen(svg,'pointercancel',()=>{drag=null;});
    listen(el('zoom-in'),'click',()=>zoom(.75));
    listen(el('zoom-out'),'click',()=>zoom(1/.75));
    listen(el('zoom-reset'),'click',()=>svg.setAttribute('viewBox','0 0 1000 500'));
    listen(el('auto'),'click',()=>{autoWindows();tell('Source split into disjoint temporal halves.');render();});
    listen(el('apply'),'click',applyWindows);
    ['display','resolution','measure','scope'].forEach(key=>listen(el(key),'change',render));
    listen(el('find'),'input',findEvents);
    listen(el('charts-csv'),'click',exportCharts);
    listen(el('grid-csv'),'click',exportGrid);
    listen(workspace,'pulse:workflow-render',render);
    workspace._pulseAnalysisMetadata=()=>({
      version:2,periodsUTC:periods?{
        a:{start:new Date(periods.a.start).toISOString(),endExclusive:new Date(periods.a.end).toISOString()},
        b:{start:new Date(periods.b.start).toISOString(),endExclusive:new Date(periods.b.end).toISOString()}
      }:null,
      comparisonCounts:{a:latest.a.length,b:latest.b.length},
      map:{display:el('display').value,resolutionDegrees:Number(el('resolution').value),
        measure:el('measure').value,scope:el('scope').value,
        viewBox:svg.getAttribute('viewBox')},
      caveat:'Observed record counts and records/hour are not completeness-corrected earthquake occurrence rates.'
    });
    render();
    findEvents();

    function cleanup(){
      listeners.forEach(off=>off());
      delete workspace._pulseAnalysisMetadata;
      analysis.remove();detail.remove();floating.remove();gridGroup.remove();
      active.delete(workspace);
    }
    active.set(workspace,{cleanup});
  }

  const stage=$('#instrumentStage');
  function scan(){
    const open=stage&&$('.pulse-workflow',stage);
    if(open&&!active.has(open))mount(open);
    // Removed workspaces own no listeners after the parent is cleared; keep the registry tidy.
  }
  const observer=new MutationObserver(scan);
  observer.observe(stage||document.documentElement,{childList:true,subtree:true});
  scan();
  window.addEventListener('pagehide',()=>{observer.disconnect();const w=stage&&$('.pulse-workflow',stage);active.get(w)?.cleanup();},{once:true});
  window.GeoPulseWorkflowV2={version:'20261008b',binning:'UTC-disjoint-windows',grid:'spherical-area'};
})();