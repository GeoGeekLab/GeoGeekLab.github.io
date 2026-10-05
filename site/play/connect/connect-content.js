(() => {
  'use strict';

  const NODES = {
    PT:{label:'Portugal',lat:39.5,lon:-8,atlasId:620},
    ES:{label:'Spain',lat:40.3,lon:-3.7,atlasId:724},
    FR:{label:'France',lat:46.2,lon:2.2,atlasId:250},
    DE:{label:'Germany',lat:51.1,lon:10.4,atlasId:276},
    PL:{label:'Poland',lat:52.1,lon:19.1,atlasId:616},
    BE:{label:'Belgium',lat:50.7,lon:4.6,atlasId:56},
    NL:{label:'Netherlands',lat:52.2,lon:5.3,atlasId:528},
    CH:{label:'Switzerland',lat:46.8,lon:8.2,atlasId:756},
    AT:{label:'Austria',lat:47.6,lon:14.1,atlasId:40},
    CZ:{label:'Czechia',lat:49.8,lon:15.5,atlasId:203},
    IT:{label:'Italy',lat:42.8,lon:12.6,atlasId:380}
  };

  const EUROPE = ['PT','ES','FR','DE','PL','BE','NL','CH','AT','CZ','IT'];

  const PUZZLES = [
    {
      id:'pt-pl-rule-shift',
      nodes:EUROPE,
      source:'PT',
      target:'PL',
      maxHops:5,
      initialRule:{type:'shared-border',label:'LAND BORDERS'},
      changedRule:{type:'distance',maxKm:1200,label:'DISTANCE ≤ 1200 KM'},
      insight:['THE PLACES DIDN\'T MOVE.','THE RELATION DID.']
    }
  ];

  window.GeoPlayConnectContent = { NODES, EUROPE, PUZZLES };
})();