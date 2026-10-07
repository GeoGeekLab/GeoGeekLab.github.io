const paceBands = Array.from({ length: 60 }, (_, i) => {
  const centerNm = 402.5 + i * 5;
  return Object.freeze({
    id: `OCI-${centerNm.toFixed(1)}`,
    label: centerNm.toFixed(1),
    centerNm,
    widthNm: 5
  });
});

export const WATER_SENSOR_ORDER = Object.freeze(['olci','pace-oci','s2-msi','landsat-oli']);

export const WATER_SENSOR_DEFINITIONS = Object.freeze({
  olci: Object.freeze({
    id:'olci',
    label:'Sentinel-3 OLCI',
    shortLabel:'OLCI',
    responseModel:'simplified-top-hat',
    fidelity:'Nominal band centres and widths; not measured time-dependent SRF',
    bands:Object.freeze([
      {id:'Oa01',label:'Oa01',centerNm:400,widthNm:15},
      {id:'Oa02',label:'Oa02',centerNm:412.5,widthNm:10},
      {id:'Oa03',label:'Oa03',centerNm:442.5,widthNm:10},
      {id:'Oa04',label:'Oa04',centerNm:490,widthNm:10},
      {id:'Oa05',label:'Oa05',centerNm:510,widthNm:10},
      {id:'Oa06',label:'Oa06',centerNm:560,widthNm:10},
      {id:'Oa07',label:'Oa07',centerNm:620,widthNm:10},
      {id:'Oa08',label:'Oa08',centerNm:665,widthNm:10},
      {id:'Oa09',label:'Oa09',centerNm:673.75,widthNm:7.5},
      {id:'Oa10',label:'Oa10',centerNm:681.25,widthNm:7.5}
    ].map(Object.freeze))
  }),
  'pace-oci': Object.freeze({
    id:'pace-oci',
    label:'PACE OCI',
    shortLabel:'OCI',
    responseModel:'simplified-top-hat',
    fidelity:'Nominal 5 nm teaching mode only; actual OCI has finer sampling and measured RSR',
    bands:Object.freeze(paceBands)
  }),
  's2-msi': Object.freeze({
    id:'s2-msi',
    label:'Sentinel-2A MSI',
    shortLabel:'MSI',
    responseModel:'simplified-top-hat',
    fidelity:'Nominal S2A centre wavelength and bandwidth; not measured SRF',
    bands:Object.freeze([
      {id:'B01',label:'B01 Coastal',centerNm:442.7,widthNm:21},
      {id:'B02',label:'B02 Blue',centerNm:492.4,widthNm:66},
      {id:'B03',label:'B03 Green',centerNm:559.8,widthNm:36},
      {id:'B04',label:'B04 Red',centerNm:664.6,widthNm:31}
    ].map(Object.freeze))
  }),
  'landsat-oli': Object.freeze({
    id:'landsat-oli',
    label:'Landsat 8/9 OLI',
    shortLabel:'OLI',
    responseModel:'simplified-top-hat',
    fidelity:'Published wavelength ranges represented as rectangular bandpasses',
    bands:Object.freeze([
      {id:'B1',label:'B1 Coastal',centerNm:440,widthNm:20},
      {id:'B2',label:'B2 Blue',centerNm:480,widthNm:60},
      {id:'B3',label:'B3 Green',centerNm:560,widthNm:60},
      {id:'B4',label:'B4 Red',centerNm:655,widthNm:30}
    ].map(Object.freeze))
  })
});
