(() => {
  'use strict';

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
    }
  };
})();