(() => {
  'use strict';

  function create({
    d3,
    extent = [[70,70],[930,570]],
    fromRaw = d3?.geoMercatorRaw,
    toRaw = d3?.geoEqualEarthRaw,
    fromRotate = [0,0,0],
    toRotate = [0,0,0]
  } = {}) {
    if (!d3?.geoProjectionMutator || !d3?.geoProjection || typeof fromRaw !== 'function' || typeof toRaw !== 'function') {
      throw new Error('Project morph requires D3 projection raw functions.');
    }

    const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
    const sphere={type:'Sphere'};
    // Mercator diverges at the poles. A near-90° clamp still makes
    // fitExtent(Sphere) squeeze the entire world into a narrow strip.
    // Bound only Mercator to its conventional square-world latitude.
    // Equal Earth and azimuthal projections retain their own latitude domain.
    const mercatorLimit=Math.atan(Math.sinh(Math.PI));
    const boundedRaw=raw=>(lambda,phi)=>raw(
      lambda,
      raw===d3.geoMercatorRaw
        ? Math.max(-mercatorLimit,Math.min(mercatorLimit,phi))
        : phi
    );
    const safeFromRaw=boundedRaw(fromRaw);
    const safeToRaw=boundedRaw(toRaw);
    if(typeof fromRaw.invert==='function') {
      safeFromRaw.invert=(x,y)=>fromRaw.invert(x,y);
    }
    const mutate=d3.geoProjectionMutator(t => (lambda,phi) => {
      const a=safeFromRaw(lambda,phi);
      const b=safeToRaw(lambda,phi);
      return [
        a[0]*(1-t)+b[0]*t,
        a[1]*(1-t)+b[1]*t
      ];
    });
    const projection=mutate(0).precision(.25);
    const startProjection=d3.geoProjection(safeFromRaw).precision(.25);
    const path=d3.geoPath(projection);
    let value=0;

    startProjection.rotate(fromRotate).fitExtent(extent,sphere);

    function set(next) {
      value=clamp(next);
      mutate(value);
      projection.rotate([
        fromRotate[0]+(toRotate[0]-fromRotate[0])*value,
        fromRotate[1]+(toRotate[1]-fromRotate[1])*value,
        fromRotate[2]+(toRotate[2]-fromRotate[2])*value
      ]);
      projection.fitExtent(extent,sphere);
      return value;
    }

    function invertStart(point) {
      if(typeof startProjection.invert!=='function') return null;
      return startProjection.invert(point);
    }

    set(0);

    return {
      projection,
      path,
      set,
      invertStart,
      get value() { return value; }
    };
  }

  window.GeoPlayProjectMorph={create};
})();