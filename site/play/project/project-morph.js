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
    const EPS=1e-7;
    const HALF_PI=Math.PI/2;

    function finiteRaw(raw,lambda,phi) {
      // Several geographic raw projections are mathematically singular at exact
      // poles or antipodes. D3 can legitimately stream those coordinates when
      // fitting a Sphere, so keep the topology while nudging only the singular
      // latitude itself into the finite domain.
      const safePhi=Math.max(-HALF_PI+EPS,Math.min(HALF_PI-EPS,phi));
      const point=raw(lambda,safePhi);
      if(point && Number.isFinite(point[0]) && Number.isFinite(point[1])) return point;

      // A near-180° preclip below keeps azimuthal antipodes out of normal
      // rendering, but resampling can still approach the singular longitude.
      const safeLambda=Math.max(-Math.PI+EPS,Math.min(Math.PI-EPS,lambda));
      const retry=raw(safeLambda,safePhi);
      if(retry && Number.isFinite(retry[0]) && Number.isFinite(retry[1])) return retry;
      return [0,0];
    }

    const safeFrom=(lambda,phi)=>finiteRaw(fromRaw,lambda,phi);
    const safeTo=(lambda,phi)=>finiteRaw(toRaw,lambda,phi);
    const mutate=d3.geoProjectionMutator(t => (lambda,phi) => {
      const a=safeFrom(lambda,phi);
      const b=safeTo(lambda,phi);
      return [
        a[0]+(b[0]-a[0])*t,
        a[1]+(b[1]-a[1])*t
      ];
    });
    const projection=mutate(0).precision(.25).clipAngle(179.9);
    const startProjection=d3.geoProjection(safeFrom).precision(.25).clipAngle(179.9);
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