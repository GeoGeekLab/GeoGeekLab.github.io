(() => {
  'use strict';

  function create({ d3, extent = [[70,70],[930,570]] } = {}) {
    if (!d3?.geoProjectionMutator || !d3?.geoMercatorRaw || !d3?.geoEqualEarthRaw) {
      throw new Error('Project morph requires D3 projection raw functions.');
    }

    const fromRaw=d3.geoMercatorRaw;
    const toRaw=d3.geoEqualEarthRaw;
    const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
    const mutate=d3.geoProjectionMutator(t => (lambda,phi) => {
      const a=fromRaw(lambda,phi);
      const b=toRaw(lambda,phi);
      return [
        a[0]+(b[0]-a[0])*t,
        a[1]+(b[1]-a[1])*t
      ];
    });
    const projection=mutate(0).precision(.25);
    const sphere={type:'Sphere'};
    const path=d3.geoPath(projection);
    let value=0;

    function set(next) {
      value=clamp(next);
      mutate(value);
      projection.fitExtent(extent,sphere);
      return value;
    }

    set(0);

    return {
      projection,
      path,
      set,
      get value() { return value; }
    };
  }

  window.GeoPlayProjectMorph={create};
})();