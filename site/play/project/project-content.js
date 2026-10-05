(() => {
  'use strict';

  const TOKYO=[139.6503,35.6762];
  const VANCOUVER=[-123.1207,49.2827];

  window.GeoPlayProjectContent = {
    AREA_EXPERIMENT: {
      id:'area-greenland-india',
      question:'WHICH IS LARGER?',
      choices:[
        { id:'greenland', label:'GREENLAND', atlasId:304, areaKm2:2166086 },
        { id:'india', label:'INDIA', atlasId:356, areaKm2:3287263 }
      ],
      from:{ id:'mercator', label:'MERCATOR' },
      to:{ id:'equal-earth', label:'EQUAL EARTH' },
      insight:['THE MAP CHANGED.','THE AREA DIDN\'T.']
    },
    ROUTE_EXPERIMENT: {
      id:'route-tokyo-vancouver',
      question:'DRAW THE SHORTEST ROUTE',
      start:{ id:'tokyo', label:'TOKYO', coord:TOKYO },
      target:{ id:'vancouver', label:'VANCOUVER', coord:VANCOUVER },
      from:{ id:'mercator', label:'MERCATOR', rotate:[0,0,0] },
      to:{ id:'azimuthal-equidistant', label:'AZIMUTHAL EQUIDISTANT', rotate:[-TOKYO[0],-TOKYO[1],0] },
      insight:['THE ROUTE DIDN\'T CHANGE.','THE REPRESENTATION DID.']
    }
  };
})();