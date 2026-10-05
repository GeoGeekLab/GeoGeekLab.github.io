(() => {
  'use strict';

  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));

  function gaussian(peaks,x,y) {
    let value=0;
    for(const [cx,cy,amplitude,sx,sy] of peaks||[]) {
      const dx=(x-cx)/sx;
      const dy=(y-cy)/sy;
      value+=amplitude*Math.exp(-.5*(dx*dx+dy*dy));
    }
    return value;
  }

  function riskValue(spec,x,y) {
    const base=gaussian(spec.riskPeaks,x,y);
    const wave=(Math.sin((x*11.3+y*4.7)*Math.PI)+Math.cos((y*9.1-x*3.9)*Math.PI))*.5;
    return clamp(base+(spec.riskTexture||0)*wave);
  }

  function populationValue(spec,x,y) {
    return clamp(gaussian(spec.populationPeaks,x,y));
  }

  function sample(spec,n) {
    const risk=new Float32Array(n*n);
    const population=new Float32Array(n*n);
    for(let y=0;y<n;y++) {
      for(let x=0;x<n;x++) {
        const nx=(x+.5)/n;
        const ny=(y+.5)/n;
        const index=y*n+x;
        risk[index]=riskValue(spec,nx,ny);
        population[index]=populationValue(spec,nx,ny);
      }
    }
    return { n,risk,population };
  }

  function sampleGrid(grid,x,y,field='risk') {
    if(!grid?.n) return 0;
    const n=grid.n;
    const values=grid[field];
    const fx=clamp(x)*(n-1);
    const fy=clamp(y)*(n-1);
    const x0=Math.floor(fx), y0=Math.floor(fy);
    const x1=Math.min(n-1,x0+1), y1=Math.min(n-1,y0+1);
    const tx=fx-x0, ty=fy-y0;
    const a=values[y0*n+x0]*(1-tx)+values[y0*n+x1]*tx;
    const b=values[y1*n+x0]*(1-tx)+values[y1*n+x1]*tx;
    return a*(1-ty)+b*ty;
  }

  function pointInPolygon(point,polygon) {
    if(!Array.isArray(polygon)||polygon.length<3) return false;
    const [x,y]=point;
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const [xi,yi]=polygon[i];
      const [xj,yj]=polygon[j];
      const intersects=((yi>y)!==(yj>y)) && x<((xj-xi)*(y-yi))/(yj-yi||Number.EPSILON)+xi;
      if(intersects) inside=!inside;
    }
    return inside;
  }

  function evaluate(grid,polygon,{riskThreshold=.52,evaluationSize=96}={}) {
    let atRiskPopulation=0;
    let protectedPopulation=0;
    let insideCells=0;
    let atRiskCells=0;
    for(let y=0;y<evaluationSize;y++) {
      for(let x=0;x<evaluationSize;x++) {
        const nx=(x+.5)/evaluationSize;
        const ny=(y+.5)/evaluationSize;
        const risk=sampleGrid(grid,nx,ny,'risk');
        const population=sampleGrid(grid,nx,ny,'population');
        const inside=pointInPolygon([nx,ny],polygon);
        if(inside) insideCells++;
        if(risk>=riskThreshold) {
          atRiskCells++;
          atRiskPopulation+=population;
          if(inside) protectedPopulation+=population;
        }
      }
    }
    const coverage=atRiskPopulation>0?protectedPopulation/atRiskPopulation:0;
    const areaCost=insideCells/(evaluationSize*evaluationSize);
    return { coverage,areaCost,atRiskPopulation,protectedPopulation,atRiskArea:atRiskCells/(evaluationSize*evaluationSize) };
  }

  function classificationChange(beforeGrid,afterGrid,{riskThreshold=.52,size=96}={}) {
    const mask=new Uint8Array(size*size);
    let changed=0;
    for(let y=0;y<size;y++) {
      for(let x=0;x<size;x++) {
        const nx=(x+.5)/size;
        const ny=(y+.5)/size;
        const before=sampleGrid(beforeGrid,nx,ny,'risk')>=riskThreshold;
        const after=sampleGrid(afterGrid,nx,ny,'risk')>=riskThreshold;
        const different=before!==after;
        const index=y*size+x;
        mask[index]=different?1:0;
        if(different) changed++;
      }
    }
    return { fraction:changed/(size*size),mask,size };
  }

  function boundaryShift(a,b,size=96) {
    if(!a?.length||!b?.length) return 0;
    let changed=0;
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const point=[(x+.5)/size,(y+.5)/size];
      if(pointInPolygon(point,a)!==pointInPolygon(point,b)) changed++;
    }
    return changed/(size*size);
  }

  function guidedBoundary() {
    const points=[];
    const cx=.48,cy=.52,rx=.285,ry=.245;
    for(let i=0;i<40;i++) {
      const angle=i/40*Math.PI*2;
      points.push([cx+Math.cos(angle)*rx,cy+Math.sin(angle)*ry]);
    }
    return points;
  }

  function transformBoundary(polygon,{dx=0,dy=0,scale=1}={}) {
    if(!polygon?.length) return guidedBoundary();
    const cx=polygon.reduce((sum,p)=>sum+p[0],0)/polygon.length;
    const cy=polygon.reduce((sum,p)=>sum+p[1],0)/polygon.length;
    return polygon.map(([x,y])=>[
      clamp(cx+(x-cx)*scale+dx,.01,.99),
      clamp(cy+(y-cy)*scale+dy,.01,.99)
    ]);
  }

  window.GeoPlayBoundField={
    clamp,
    riskValue,
    populationValue,
    sample,
    sampleGrid,
    pointInPolygon,
    evaluate,
    classificationChange,
    boundaryShift,
    guidedBoundary,
    transformBoundary
  };
})();